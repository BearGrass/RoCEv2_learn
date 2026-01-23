#include "rdma_common.h"

/**
 * RDMA客户端程序
 * 功能：
 * 1. 初始化RDMA资源
 * 2. 连接到服务端TCP端口
 * 3. 与服务端交换QP连接信息
 * 4. 建立RDMA连接
 * 5. 发送数据到服务端并接收回复
 */

int main(int argc, char *argv[]) {
    struct rdma_resources res;
    struct cm_con_data_t local_con_data;
    struct cm_con_data_t remote_con_data;
    union ibv_gid my_gid;
    int rc = 0;
    int sock = -1;
    int port = DEFAULT_PORT;
    char *server_name = NULL;
    char *dev_name = NULL;
    uint8_t ib_port = 1;
    int gid_idx = 1;  /* GID索引，通常RoCEv2使用索引1 */

    /* 解析命令行参数 */
    if (argc < 2) {
        fprintf(stderr, "用法: %s <服务端IP> [设备名] [端口] [GID索引]\n", argv[0]);
        fprintf(stderr, "示例: %s 10.0.134.5 rxe0 18515 1\n", argv[0]);
        return 1;
    }

    server_name = argv[1];
    if (argc >= 3) {
        dev_name = argv[2];
    }
    if (argc >= 4) {
        port = atoi(argv[3]);
    }
    if (argc >= 5) {
        gid_idx = atoi(argv[4]);
    }

    printf("========================================\n");
    printf("   RDMA客户端 - RoCEv2学习程序\n");
    printf("========================================\n");
    printf("服务端IP: %s\n", server_name);
    printf("设备: %s\n", dev_name ? dev_name : "默认设备");
    printf("TCP端口: %d\n", port);
    printf("GID索引: %d\n", gid_idx);
    printf("========================================\n");

    /* ===== 第一阶段: 初始化RDMA资源 ===== */
    if (init_rdma_resources(&res, dev_name, ib_port, gid_idx)) {
        fprintf(stderr, "初始化RDMA资源失败\n");
        return 1;
    }

    /* 创建QP */
    if (create_qp(&res)) {
        fprintf(stderr, "创建QP失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 修改QP状态到INIT */
    if (modify_qp_to_init(&res)) {
        fprintf(stderr, "修改QP到INIT失败\n");
        rc = 1;
        goto cleanup;
    }

    /* ===== 第二阶段: 准备连接信息 ===== */
    printf("\n========== 准备本地连接信息 ==========\n");

    /* 获取本地GID */
    if (ibv_query_gid(res.context, res.ib_port, gid_idx, &my_gid)) {
        fprintf(stderr, "查询GID失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 填充本地连接数据 */
    memset(&local_con_data, 0, sizeof(local_con_data));
    local_con_data.qp_num = res.qp->qp_num;
    local_con_data.lid = res.port_attr.lid;
    memcpy(local_con_data.gid, &my_gid, 16);

    printf("本地连接信息:\n");
    printf("  - QP号: 0x%06x\n", local_con_data.qp_num);
    printf("  - LID: 0x%04x\n", local_con_data.lid);
    printf("  - GID: ");
    print_gid(&my_gid);
    printf("\n");

    /* ===== 第三阶段: TCP连接，交换QP信息 ===== */
    printf("\n========== TCP连接阶段 ==========\n");

    /* 创建TCP socket */
    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        fprintf(stderr, "创建socket失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 连接到服务端 */
    struct sockaddr_in sin;
    memset(&sin, 0, sizeof(sin));
    sin.sin_family = AF_INET;
    sin.sin_port = htons(port);
    if (inet_pton(AF_INET, server_name, &sin.sin_addr) <= 0) {
        fprintf(stderr, "无效的服务端IP地址\n");
        rc = 1;
        goto cleanup;
    }

    printf("正在连接服务端 %s:%d...\n", server_name, port);
    if (connect(sock, (struct sockaddr *)&sin, sizeof(sin)) < 0) {
        fprintf(stderr, "连接服务端失败\n");
        rc = 1;
        goto cleanup;
    }
    printf("TCP连接成功\n");

    /* 通过TCP交换QP连接信息 */
    printf("\n========== 交换QP连接信息 ==========\n");
    if (sock_sync_data(sock, &local_con_data, &remote_con_data)) {
        fprintf(stderr, "交换连接信息失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("远端连接信息:\n");
    printf("  - QP号: 0x%06x\n", remote_con_data.qp_num);
    printf("  - LID: 0x%04x\n", remote_con_data.lid);
    printf("  - GID: ");
    union ibv_gid remote_gid;
    memcpy(&remote_gid, remote_con_data.gid, 16);
    print_gid(&remote_gid);
    printf("\n");

    /* ===== 第四阶段: 建立RDMA连接 ===== */
    /* 修改QP状态: INIT -> RTR */
    if (modify_qp_to_rtr(&res, &remote_con_data)) {
        fprintf(stderr, "修改QP到RTR失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 修改QP状态: RTR -> RTS */
    if (modify_qp_to_rts(&res)) {
        fprintf(stderr, "修改QP到RTS失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("\n========== RDMA连接已建立 ==========\n");

    /* ===== 第五阶段: RDMA数据传输 ===== */
    printf("\n========== 开始RDMA数据传输 ==========\n");

    /* 准备要发送的数据 */
    const char *message = "你好，这是来自客户端的RDMA消息！Hello from RDMA client!";
    snprintf(res.buf, res.buf_size, "%s", message);
    printf("准备发送的数据: %s\n", res.buf);
    printf("数据长度: %zu 字节\n", strlen(res.buf));

    /* 预先投递Receive请求（用于接收服务端回复） */
    printf("\n投递Receive请求（等待服务端回复）...\n");
    if (post_receive(&res)) {
        fprintf(stderr, "Post Receive失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 等待服务端准备好接收 */
    char temp;
    if (read(sock, &temp, 1) != 1) {
        fprintf(stderr, "TCP同步失败\n");
        rc = 1;
        goto cleanup;
    }
    printf("收到服务端通知：可以发送数据\n");

    /* 发送数据 */
    printf("\n投递Send请求...\n");
    if (post_send(&res, IBV_WR_SEND)) {
        fprintf(stderr, "Post Send失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 等待发送完成 */
    printf("等待发送完成...\n");
    if (poll_completion(&res, 1)) {
        fprintf(stderr, "等待发送完成失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("\n========== 发送成功 ==========\n");

    /* 等待接收服务端回复 */
    printf("\n等待接收服务端回复...\n");
    if (poll_completion(&res, 1)) {
        fprintf(stderr, "等待接收完成失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("\n========== 接收成功 ==========\n");
    printf("收到服务端回复: %s\n", res.buf);
    printf("回复长度: %zu 字节\n", strlen(res.buf));

    printf("\n========== RDMA通信完成 ==========\n");

cleanup:
    /* 清理资源 */
    if (sock >= 0) {
        close(sock);
    }
    cleanup_rdma_resources(&res);

    printf("\n========================================\n");
    printf("   客户端程序结束\n");
    printf("========================================\n");

    return rc;
}
