/**
 * @file rdma_common_qp.c
 * @brief QP状态转换模块：QP创建、状态机转移INIT/RTR/RTS
 *
 * 本文件实现Queue Pair的生命周期管理，包括：
 * - QP创建和配置
 * - QP状态转移（RESET → INIT → RTR → RTS）
 * - 多QP的批量操作
 */

#include "rdma_common.h"

int create_qp(struct rdma_resources *res) {
    struct ibv_qp_init_attr qp_init_attr;

    printf("\n========== 步骤8: 创建Queue Pair ==========\n");

    memset(&qp_init_attr, 0, sizeof(qp_init_attr));
    qp_init_attr.qp_type = IBV_QPT_RC;
    qp_init_attr.sq_sig_all = 1;
    qp_init_attr.send_cq = res->cq;
    qp_init_attr.recv_cq = res->cq;
    qp_init_attr.cap.max_send_wr = MAX_WR;
    qp_init_attr.cap.max_recv_wr = MAX_WR;
    qp_init_attr.cap.max_send_sge = MAX_SGE;
    qp_init_attr.cap.max_recv_sge = MAX_SGE;

    res->qp_list[0] = ibv_create_qp(res->pd, &qp_init_attr);
    if (!res->qp_list[0]) {
        fprintf(stderr, "错误: 创建QP失败\n");
        return -1;
    }
    printf("成功创建QP\n");
    printf("  - QP号: 0x%06x\n", res->qp_list[0]->qp_num);
    printf("  - QP类型: RC (Reliable Connection)\n");

    return 0;
}

int create_qp_list(struct rdma_resources *res) {
    struct ibv_qp_init_attr qp_init_attr;
    uint32_t i;

    printf("\n========== 步骤9: 创建多个Queue Pair ==========\n");
    printf("创建 %u 个QP...\n", res->num_qp);

    for (i = 0; i < res->num_qp; i++) {
        memset(&qp_init_attr, 0, sizeof(qp_init_attr));
        qp_init_attr.qp_type = IBV_QPT_RC;
        qp_init_attr.sq_sig_all = 1;
        qp_init_attr.send_cq = res->cq;
        qp_init_attr.recv_cq = res->cq;
        qp_init_attr.cap.max_send_wr = MAX_WR;
        qp_init_attr.cap.max_recv_wr = MAX_WR;
        qp_init_attr.cap.max_send_sge = MAX_SGE;
        qp_init_attr.cap.max_recv_sge = MAX_SGE;

        res->qp_list[i] = ibv_create_qp(res->pd, &qp_init_attr);
        if (!res->qp_list[i]) {
            fprintf(stderr, "错误: 创建QP[%u]失败\n", i);
            return -1;
        }
        printf("  QP[%u]: 0x%06x\n", i, res->qp_list[i]->qp_num);
    }

    printf("成功创建 %u 个QP\n", res->num_qp);
    return 0;
}

int modify_qp_to_init(struct rdma_resources *res) {
    struct ibv_qp_attr attr;
    int flags;

    printf("\n========== 步骤9: 修改QP状态 RESET->INIT ==========\n");

    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_INIT;
    attr.port_num = res->ib_port;
    attr.pkey_index = 0;
    attr.qp_access_flags = IBV_ACCESS_LOCAL_WRITE |
                           IBV_ACCESS_REMOTE_READ |
                           IBV_ACCESS_REMOTE_WRITE;

    flags = IBV_QP_STATE | IBV_QP_PKEY_INDEX | IBV_QP_PORT | IBV_QP_ACCESS_FLAGS;

    if (ibv_modify_qp(res->qp_list[0], &attr, flags)) {
        fprintf(stderr, "错误: 修改QP到INIT状态失败\n");
        return -1;
    }
    printf("QP状态: RESET -> INIT\n");

    return 0;
}

int modify_qp_list_to_init(struct rdma_resources *res) {
    struct ibv_qp_attr attr;
    int flags;
    uint32_t i;

    printf("\n========== 步骤10: 修改多个QP状态 RESET->INIT ==========\n");

    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_INIT;
    attr.port_num = res->ib_port;
    attr.pkey_index = 0;
    attr.qp_access_flags = IBV_ACCESS_LOCAL_WRITE |
                           IBV_ACCESS_REMOTE_READ |
                           IBV_ACCESS_REMOTE_WRITE;

    flags = IBV_QP_STATE | IBV_QP_PKEY_INDEX | IBV_QP_PORT | IBV_QP_ACCESS_FLAGS;

    for (i = 0; i < res->num_qp; i++) {
        if (ibv_modify_qp(res->qp_list[i], &attr, flags)) {
            fprintf(stderr, "错误: 修改QP[%u]到INIT状态失败\n", i);
            return -1;
        }
        printf("  QP[%u]: RESET -> INIT\n", i);
    }

    printf("成功修改 %u 个QP到INIT状态\n", res->num_qp);
    return 0;
}

int modify_qp_to_rtr(struct rdma_resources *res,
                     struct cm_con_data_t *remote_con_data) {
    struct ibv_qp_attr attr;
    int flags;
    union ibv_gid remote_gid;

    printf("\n========== 步骤10: 修改QP状态 INIT->RTR ==========\n");

    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_RTR;
    attr.path_mtu = res->port_attr.active_mtu;
    attr.dest_qp_num = remote_con_data->qp_num;
    attr.rq_psn = 0;

    attr.ah_attr.dlid = remote_con_data->lid;
    attr.ah_attr.sl = 0;
    attr.ah_attr.src_path_bits = 0;
    attr.ah_attr.port_num = res->ib_port;

    attr.ah_attr.is_global = 1;
    memcpy(&remote_gid, remote_con_data->gid, 16);
    attr.ah_attr.grh.dgid = remote_gid;
    attr.ah_attr.grh.flow_label = 0;
    attr.ah_attr.grh.hop_limit = 1;
    attr.ah_attr.grh.sgid_index = res->gid_idx;
    attr.ah_attr.grh.traffic_class = 0;

    attr.max_dest_rd_atomic = 1;
    attr.min_rnr_timer = 12;

    flags = IBV_QP_STATE | IBV_QP_AV | IBV_QP_PATH_MTU | IBV_QP_DEST_QPN |
            IBV_QP_RQ_PSN | IBV_QP_MAX_DEST_RD_ATOMIC | IBV_QP_MIN_RNR_TIMER;

    if (ibv_modify_qp(res->qp_list[0], &attr, flags)) {
        fprintf(stderr, "错误: 修改QP到RTR状态失败: %s (errno=%d)\n",
                strerror(errno), errno);
        fprintf(stderr, "调试提示:\n");
        fprintf(stderr, "  - 远端QP号: 0x%06x\n", remote_con_data->qp_num);
        fprintf(stderr, "  - 远端LID: 0x%04x\n", remote_con_data->lid);
        fprintf(stderr, "  - GID索引: %d\n", res->gid_idx);
        fprintf(stderr, "  - 远端GID: ");
        print_gid(&remote_gid);
        fprintf(stderr, "\n");
        fprintf(stderr, "请检查: 1) GID配置 2) 端口状态 3) 连接信息交换是否正确\n");
        return -1;
    }
    printf("QP状态: INIT -> RTR (Ready to Receive)\n");
    printf("  - 远端QP号: 0x%06x\n", remote_con_data->qp_num);
    printf("  - 远端LID: 0x%04x\n", remote_con_data->lid);

    return 0;
}

int modify_qp_list_to_rtr(struct rdma_resources *res,
                          struct cm_con_data_t *remote_con_data) {
    struct ibv_qp_attr attr;
    int flags;
    union ibv_gid remote_gid;
    uint32_t i;

    printf("\n========== 步骤11: 修改多个QP状态 INIT->RTR ==========\n");

    for (i = 0; i < res->num_qp; i++) {
        memset(&attr, 0, sizeof(attr));
        attr.qp_state = IBV_QPS_RTR;
        attr.path_mtu = res->port_attr.active_mtu;
        attr.dest_qp_num = remote_con_data[i].qp_num;
        attr.rq_psn = 0;

        attr.ah_attr.dlid = remote_con_data[i].lid;
        attr.ah_attr.sl = 0;
        attr.ah_attr.src_path_bits = 0;
        attr.ah_attr.port_num = res->ib_port;

        attr.ah_attr.is_global = 1;
        memcpy(&remote_gid, remote_con_data[i].gid, 16);
        attr.ah_attr.grh.dgid = remote_gid;
        attr.ah_attr.grh.flow_label = 0;
        attr.ah_attr.grh.hop_limit = 1;
        attr.ah_attr.grh.sgid_index = res->gid_idx;
        attr.ah_attr.grh.traffic_class = 0;

        attr.max_dest_rd_atomic = 1;
        attr.min_rnr_timer = 12;

        flags = IBV_QP_STATE | IBV_QP_AV | IBV_QP_PATH_MTU | IBV_QP_DEST_QPN |
                IBV_QP_RQ_PSN | IBV_QP_MAX_DEST_RD_ATOMIC | IBV_QP_MIN_RNR_TIMER;

        if (ibv_modify_qp(res->qp_list[i], &attr, flags)) {
            fprintf(stderr, "错误: 修改QP[%u]到RTR状态失败\n", i);
            return -1;
        }
        printf("  QP[%u]: INIT -> RTR (远端QP: 0x%06x, 远端LID: 0x%04x)\n",
               i, remote_con_data[i].qp_num, remote_con_data[i].lid);
    }

    printf("成功修改 %u 个QP到RTR状态\n", res->num_qp);
    return 0;
}

int modify_qp_to_rts(struct rdma_resources *res) {
    struct ibv_qp_attr attr;
    int flags;

    printf("\n========== 步骤11: 修改QP状态 RTR->RTS ==========\n");

    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_RTS;
    attr.timeout = 14;
    attr.retry_cnt = 7;
    attr.rnr_retry = 7;
    attr.sq_psn = 0;
    attr.max_rd_atomic = 1;

    flags = IBV_QP_STATE | IBV_QP_TIMEOUT | IBV_QP_RETRY_CNT |
            IBV_QP_RNR_RETRY | IBV_QP_SQ_PSN | IBV_QP_MAX_QP_RD_ATOMIC;

    if (ibv_modify_qp(res->qp_list[0], &attr, flags)) {
        fprintf(stderr, "错误: 修改QP到RTS状态失败\n");
        return -1;
    }
    printf("QP状态: RTR -> RTS (Ready to Send)\n");

    return 0;
}

int modify_qp_list_to_rts(struct rdma_resources *res) {
    struct ibv_qp_attr attr;
    int flags;
    uint32_t i;

    printf("\n========== 步骤12: 修改多个QP状态 RTR->RTS ==========\n");

    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_RTS;
    attr.timeout = 14;
    attr.retry_cnt = 7;
    attr.rnr_retry = 7;
    attr.sq_psn = 0;
    attr.max_rd_atomic = 1;

    flags = IBV_QP_STATE | IBV_QP_TIMEOUT | IBV_QP_RETRY_CNT |
            IBV_QP_RNR_RETRY | IBV_QP_SQ_PSN | IBV_QP_MAX_QP_RD_ATOMIC;

    for (i = 0; i < res->num_qp; i++) {
        if (ibv_modify_qp(res->qp_list[i], &attr, flags)) {
            fprintf(stderr, "错误: 修改QP[%u]到RTS状态失败\n", i);
            return -1;
        }
        printf("  QP[%u]: RTR -> RTS\n", i);
    }

    printf("成功修改 %u 个QP到RTS状态\n", res->num_qp);
    return 0;
}
