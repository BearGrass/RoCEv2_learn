#include "rdma_common.h"

/**
 * RDMA服务端程序
 * 功能：
 * 1. 初始化RDMA资源
 * 2. 监听TCP连接
 * 3. 与客户端交换QP连接信息
 * 4. 建立RDMA连接
 * 5. 接收客户端发送的数据
 */

int main(int argc, char *argv[]) {
    struct rdma_resources res;
    struct cm_con_data_t *local_con_data;
    struct cm_con_data_t *remote_con_data;
    union ibv_gid my_gid;
    int rc = 0;
    int sock = -1;
    int listen_sock = -1;
    int port = DEFAULT_PORT;
    char *dev_name = NULL;
    uint8_t ib_port = 1;
    int gid_idx = 1;
    uint32_t num_qp = DEFAULT_NUM_QP;
    uint32_t remote_num_qp = 0;
    uint32_t i;

    /* 解析命令行参数 */
    if (argc >= 2) {
        dev_name = argv[1];
    }
    if (argc >= 3) {
        port = atoi(argv[2]);
    }
    if (argc >= 4) {
        gid_idx = atoi(argv[3]);
    }
    if (argc >= 5) {
        num_qp = atoi(argv[4]);
    }

    printf("========================================\n");
    printf("   RDMA服务端 - RoCEv2多QP学习程序\n");
    printf("========================================\n");
    printf("设备: %s\n", dev_name ? dev_name : "默认设备");
    printf("TCP端口: %d\n", port);
    printf("GID索引: %d\n", gid_idx);
    printf("QP数量: %u\n", num_qp);
    printf("========================================\n");

    /* ===== 第一阶段: 初始化RDMA资源 ===== */
    if (init_rdma_resources(&res, dev_name, ib_port, gid_idx, num_qp)) {
        fprintf(stderr, "初始化RDMA资源失败\n");
        return 1;
    }

    /* 创建多个QP */
    if (create_qp_list(&res)) {
        fprintf(stderr, "创建多个QP失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 修改多个QP状态到INIT */
    if (modify_qp_list_to_init(&res)) {
        fprintf(stderr, "修改多个QP到INIT失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 打印各QP的INIT状态 */
    for (i = 0; i < res.num_qp; i++) {
        print_qp_state(&res, i, "INIT状态");
    }

    /* ===== 第二阶段: 准备连接信息 ===== */
    printf("\n========== 准备本地连接信息 ==========\n");

    /* 分配本地和远端连接信息数组 */
    local_con_data = malloc(sizeof(struct cm_con_data_t) * num_qp);
    remote_con_data = malloc(sizeof(struct cm_con_data_t) * MAX_QP);
    if (!local_con_data || !remote_con_data) {
        fprintf(stderr, "分配连接信息数组失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 获取本地GID */
    if (ibv_query_gid(res.context, res.ib_port, gid_idx, &my_gid)) {
        fprintf(stderr, "查询GID失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 填充所有本地QP的连接信息 */
    for (i = 0; i < res.num_qp; i++) {
        memset(&local_con_data[i], 0, sizeof(struct cm_con_data_t));
        local_con_data[i].qp_num = res.qp_list[i]->qp_num;
        local_con_data[i].lid = res.port_attr.lid;
        memcpy(local_con_data[i].gid, &my_gid, 16);

        printf("本地QP[%u]连接信息:\n", i);
        printf("  - QP号: 0x%06x\n", local_con_data[i].qp_num);
        printf("  - LID: 0x%04x\n", local_con_data[i].lid);
        printf("  - GID: ");
        print_gid(&my_gid);
        printf("\n");
    }

    /* ===== 第三阶段: TCP连接，交换多QP信息 ===== */
    printf("\n========== TCP连接阶段 ==========\n");

    /* 创建TCP监听socket */
    listen_sock = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_sock < 0) {
        fprintf(stderr, "创建socket失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 设置socket选项，允许地址重用 */
    int optval = 1;
    setsockopt(listen_sock, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));

    /* 绑定端口 */
    struct sockaddr_in sin;
    memset(&sin, 0, sizeof(sin));
    sin.sin_family = AF_INET;
    sin.sin_addr.s_addr = INADDR_ANY;
    sin.sin_port = htons(port);

    if (bind(listen_sock, (struct sockaddr *)&sin, sizeof(sin)) < 0) {
        fprintf(stderr, "绑定端口失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 监听连接 */
    listen(listen_sock, 1);
    printf("等待客户端连接 (端口: %d)...\n", port);

    /* 接受连接 */
    sock = accept(listen_sock, NULL, NULL);
    if (sock < 0) {
        fprintf(stderr, "接受连接失败\n");
        rc = 1;
        goto cleanup;
    }
    printf("客户端已连接\n");

    /* 通过TCP交换多QP连接信息 */
    printf("\n========== 交换多QP连接信息 ==========\n");
    if (sock_sync_data_multi(sock, local_con_data, res.num_qp, 
                             remote_con_data, &remote_num_qp)) {
        fprintf(stderr, "交换连接信息失败\n");
        rc = 1;
        goto cleanup;
    }

    if (remote_num_qp != res.num_qp) {
        fprintf(stderr, "警告: 远端QP数量(%u)与本端不匹配(%u)\n", 
                remote_num_qp, res.num_qp);
    }

    for (i = 0; i < remote_num_qp; i++) {
        printf("远端QP[%u]连接信息:\n", i);
        printf("  - QP号: 0x%06x\n", remote_con_data[i].qp_num);
        printf("  - LID: 0x%04x\n", remote_con_data[i].lid);
        printf("  - GID: ");
        union ibv_gid remote_gid;
        memcpy(&remote_gid, remote_con_data[i].gid, 16);
        print_gid(&remote_gid);
        printf("\n");
    }

    /* ===== 第四阶段: 建立多个RDMA连接 ===== */
    /* 修改多个QP状态: INIT -> RTR */
    if (modify_qp_list_to_rtr(&res, remote_con_data)) {
        fprintf(stderr, "修改多个QP到RTR失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 打印各QP的RTR状态 */
    for (i = 0; i < res.num_qp; i++) {
        print_qp_state(&res, i, "RTR状态");
    }

    /* 修改多个QP状态: RTR -> RTS */
    if (modify_qp_list_to_rts(&res)) {
        fprintf(stderr, "修改多个QP到RTS失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("\n========== 多个RDMA连接已建立 ==========\n");

    /* 打印各QP的RTS状态 */
    for (i = 0; i < res.num_qp; i++) {
        print_qp_state(&res, i, "RTS状态（RDMA连接已建立）");
    }

    /* ===== 第五阶段: 多QP RDMA数据传输 ===== */
    printf("\n========== 开始多QP RDMA数据传输 ==========\n");

    /* 预先投递所有QP的Receive请求 */
    printf("投递所有QP的Receive请求到RQ...\n");
    if (post_receive_all(&res)) {
        fprintf(stderr, "Post Receive失败\n");
        rc = 1;
        goto cleanup;
    }

    /* 通过TCP同步，确保客户端准备好发送 */
    char temp = 'R';
    if (write(sock, &temp, 1) != 1) {
        fprintf(stderr, "TCP同步失败\n");
        rc = 1;
        goto cleanup;
    }
    printf("通知客户端：服务端已准备好接收\n");

    /* 等待接收所有QP的完成 */
    printf("等待接收 %u 个QP的数据...\n", res.num_qp);
    if (poll_completion(&res, res.num_qp, NULL)) {
        fprintf(stderr, "等待接收完成失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("\n========== 接收成功 ==========\n");
    printf("接收到的数据: %s\n", res.buf);
    printf("数据长度: %zu 字节\n", strlen(res.buf));

    /* 准备回复数据 */
    snprintf(res.buf, res.buf_size, "服务端收到，这是回复消息！");
    printf("\n准备发送回复: %s\n", res.buf);

    /* 发送回复到所有QP */
    printf("投递所有QP的Send请求...\n");
    for (i = 0; i < res.num_qp; i++) {
        if (post_send_qp(&res, i, IBV_WR_SEND)) {
            fprintf(stderr, "Post Send到QP[%u]失败\n", i);
            rc = 1;
            goto cleanup;
        }
    }

    /* 等待所有发送完成 */
    if (poll_completion(&res, res.num_qp, NULL)) {
        fprintf(stderr, "等待发送完成失败\n");
        rc = 1;
        goto cleanup;
    }

    printf("\n========== 发送成功 ==========\n");
    printf("多QP RDMA通信完成！\n");

cleanup:
    /* 清理资源 */
    if (local_con_data) {
        free(local_con_data);
    }
    if (remote_con_data) {
        free(remote_con_data);
    }
    if (sock >= 0) {
        close(sock);
    }
    if (listen_sock >= 0) {
        close(listen_sock);
    }
    cleanup_rdma_resources(&res);

    printf("\n========================================\n");
    printf("   服务端程序结束\n");
    printf("========================================\n");

    return rc;
}
