/**
 * @file rdma_common.c
 * @brief RDMA核心功能实现 - 资源管理、状态转换、工作请求投递
 *
 * 本文件实现RDMA生命周期管理的所有关键步骤，包括：
 * - RDMA资源的初始化和清理（设备、PD、CQ、MR）
 * - QP状态机转移（RESET → INIT → RTR → RTS）
 * - 多QP管理（创建、配置、状态转换）
 * - TCP套接字通过元数据交换（QP号、LID、GID）
 * - 发送和接收请求投递
 * - 完成队列轮询和事件处理
 *
 * 设计特点：
 * - 支持多QP共享单个CQ，提高资源利用率
 * - 完整的错误处理和日志输出
 * - 支持调试模式的详细状态打印
 *
 * @note 所有函数必须遵守多QP共享CQ的设计约束
 * @note RoCEv2模式下GID索引必须设置为 >= 1
 *
 * @author AI Programming Assistant
 * @date 2024
 */

#include "rdma_common.h"



int init_rdma_resources(struct rdma_resources *res,
                        const char *dev_name,
                        uint8_t ib_port,
                        int gid_idx,
                        uint32_t num_qp) {
    int num_devices;
    int i;
    union ibv_gid gid;

    memset(res, 0, sizeof(*res));
    res->ib_port = ib_port;
    res->gid_idx = gid_idx;
    res->buf_size = DEFAULT_MSG_SIZE;
    res->num_qp = num_qp > 0 ? num_qp : DEFAULT_NUM_QP;

    if (res->num_qp > MAX_QP) {
        fprintf(stderr, "错误: QP数量(%u)超过最大限制(%u)\n", res->num_qp, MAX_QP);
        return -1;
    }

    /* 1. 获取RDMA设备列表 */
    printf("\n========== 步骤1: 获取RDMA设备列表 ==========\n");
    res->dev_list = ibv_get_device_list(&num_devices);
    if (!res->dev_list) {
        fprintf(stderr, "错误: 无法获取RDMA设备列表\n");
        return -1;
    }
    printf("找到 %d 个RDMA设备\n", num_devices);

    /* 2. 选择指定的设备 */
    printf("\n========== 步骤2: 选择RDMA设备 ==========\n");
    if (dev_name) {
        for (i = 0; i < num_devices; i++) {
            if (!strcmp(ibv_get_device_name(res->dev_list[i]), dev_name)) {
                res->ib_dev = res->dev_list[i];
                break;
            }
        }
        if (!res->ib_dev) {
            fprintf(stderr, "错误: 找不到设备 '%s'\n", dev_name);
            return -1;
        }
    } else {
        res->ib_dev = res->dev_list[0];
    }
    printf("选择设备: %s\n", ibv_get_device_name(res->ib_dev));

    /* 3. 打开设备，获取设备上下文 */
    printf("\n========== 步骤3: 打开设备上下文 ==========\n");
    res->context = ibv_open_device(res->ib_dev);
    if (!res->context) {
        fprintf(stderr, "错误: 无法打开设备\n");
        return -1;
    }
    printf("成功打开设备上下文\n");

    /* 4. 查询端口属性 */
    printf("\n========== 步骤4: 查询端口属性 ==========\n");
    if (ibv_query_port(res->context, res->ib_port, &res->port_attr)) {
        fprintf(stderr, "错误: 查询端口失败\n");
        return -1;
    }
    printf("端口号: %d\n", res->ib_port);
    printf("端口状态: %s\n",
           res->port_attr.state == IBV_PORT_ACTIVE ? "ACTIVE" : "NOT ACTIVE");
    printf("端口LID: 0x%04x\n", res->port_attr.lid);

    /* 5. 获取GID */
    if (ibv_query_gid(res->context, res->ib_port, gid_idx, &gid)) {
        fprintf(stderr, "错误: 查询GID失败\n");
        return -1;
    }
    printf("GID索引 %d: ", gid_idx);
    print_gid(&gid);
    printf("\n");

    /* 6. 分配Protection Domain (PD) */
    printf("\n========== 步骤5: 分配Protection Domain ==========\n");
    res->pd = ibv_alloc_pd(res->context);
    if (!res->pd) {
        fprintf(stderr, "错误: 分配PD失败\n");
        return -1;
    }
    printf("成功分配PD\n");

    /* 7. 分配数据缓冲区 */
    printf("\n========== 步骤6: 分配并注册内存缓冲区 ==========\n");
    res->buf = malloc(res->buf_size);
    if (!res->buf) {
        fprintf(stderr, "错误: 分配缓冲区失败\n");
        return -1;
    }
    memset(res->buf, 0, res->buf_size);
    printf("分配缓冲区: %u 字节\n", res->buf_size);

    /* 8. 注册Memory Region (MR) */
    res->mr = ibv_reg_mr(res->pd, res->buf, res->buf_size,
                         IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_READ |
                         IBV_ACCESS_REMOTE_WRITE);
    if (!res->mr) {
        fprintf(stderr, "错误: 注册MR失败\n");
        return -1;
    }
    printf("成功注册MR\n");
    printf("  - MR地址: %p\n", res->buf);
    printf("  - MR长度: %u\n", res->buf_size);
    printf("  - MR lkey: 0x%x\n", res->mr->lkey);
    printf("  - MR rkey: 0x%x\n", res->mr->rkey);

    /* 9. 创建Completion Queue (CQ) - 多QP共享一个CQ */
    printf("\n========== 步骤7: 创建Completion Queue (多QP共享) ==========\n");
    res->cq = ibv_create_cq(res->context, CQ_SIZE, NULL, NULL, 0);
    if (!res->cq) {
        fprintf(stderr, "错误: 创建CQ失败\n");
        return -1;
    }
    printf("成功创建CQ (大小: %d)\n", CQ_SIZE);

    /* 10. 分配QP列表 */
    printf("\n========== 步骤8: 分配QP列表 ==========\n");
    res->qp_list = malloc(sizeof(struct ibv_qp *) * res->num_qp);
    if (!res->qp_list) {
        fprintf(stderr, "错误: 分配QP列表失败\n");
        return -1;
    }
    memset(res->qp_list, 0, sizeof(struct ibv_qp *) * res->num_qp);
    printf("分配QP列表: %u个QP\n", res->num_qp);

    return 0;
}

/* QP creation and state transition functions moved to rdma_common_qp.c */

/* Network functions moved to rdma_common_net.c */

/* Work request and polling functions moved to rdma_common_net.c */

/* Utility functions moved to rdma_common_utils.c */

void cleanup_rdma_resources(struct rdma_resources *res) {
    printf("\n========== 清理RDMA资源 ==========\n");

    if (res->qp_list) {
        for (uint32_t i = 0; i < res->num_qp; i++) {
            if (res->qp_list[i]) {
                ibv_destroy_qp(res->qp_list[i]);
                printf("销毁QP[%u]\n", i);
            }
        }
        free(res->qp_list);
        printf("释放QP列表\n");
    }

    if (res->cq) {
        ibv_destroy_cq(res->cq);
        printf("销毁CQ\n");
    }
    if (res->mr) {
        ibv_dereg_mr(res->mr);
        printf("注销MR\n");
    }
    if (res->buf) {
        free(res->buf);
        printf("释放缓冲区\n");
    }
    if (res->pd) {
        ibv_dealloc_pd(res->pd);
        printf("释放PD\n");
    }
    if (res->context) {
        ibv_close_device(res->context);
        printf("关闭设备\n");
    }
    if (res->dev_list) {
        ibv_free_device_list(res->dev_list);
        printf("释放设备列表\n");
    }
}
