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

void print_gid(union ibv_gid *gid) {
    printf("%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x",
           gid->raw[0], gid->raw[1], gid->raw[2], gid->raw[3],
           gid->raw[4], gid->raw[5], gid->raw[6], gid->raw[7],
           gid->raw[8], gid->raw[9], gid->raw[10], gid->raw[11],
           gid->raw[12], gid->raw[13], gid->raw[14], gid->raw[15]);
}

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

    /* 对于兼容性，如果仅分配了1个QP，同时维护qp_list[0] */
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
        qp_init_attr.qp_type = IBV_QPT_RC;  /* RC = Reliable Connection */
        qp_init_attr.sq_sig_all = 1;        /* 所有Send操作都产生CQE */
        qp_init_attr.send_cq = res->cq;     /* Send Completion Queue (共享) */
        qp_init_attr.recv_cq = res->cq;     /* Recv Completion Queue (共享) */
        qp_init_attr.cap.max_send_wr = MAX_WR;    /* 最大Send WR数 */
        qp_init_attr.cap.max_recv_wr = MAX_WR;    /* 最大Recv WR数 */
        qp_init_attr.cap.max_send_sge = MAX_SGE;  /* 每个Send WR的SGE数 */
        qp_init_attr.cap.max_recv_sge = MAX_SGE;  /* 每个Recv WR的SGE数 */

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

        /* AH (Address Handle) 属性 */
        attr.ah_attr.dlid = remote_con_data[i].lid;
        attr.ah_attr.sl = 0;
        attr.ah_attr.src_path_bits = 0;
        attr.ah_attr.port_num = res->ib_port;

        /* 对于RoCEv2，强制设置GID */
        attr.ah_attr.is_global = 1;
        memcpy(&remote_gid, remote_con_data[i].gid, 16);
        attr.ah_attr.grh.dgid = remote_gid;
        attr.ah_attr.grh.flow_label = 0;
        attr.ah_attr.grh.hop_limit = 1;
        attr.ah_attr.grh.sgid_index = res->gid_idx;
        attr.ah_attr.grh.traffic_class = 0;

        /* RC QP的可靠性参数 */
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

int sock_sync_data(int sock,
                   struct cm_con_data_t *local_con_data,
                   struct cm_con_data_t *remote_con_data) {
    int rc;
    int read_bytes = 0;
    int total_read_bytes = 0;

    /* 发送本地连接信息 */
    rc = write(sock, local_con_data, sizeof(*local_con_data));
    if (rc != sizeof(*local_con_data)) {
        fprintf(stderr, "错误: 发送本地连接信息失败\n");
        return -1;
    }

    /* 接收远端连接信息 */
    while (total_read_bytes < sizeof(*remote_con_data)) {
        read_bytes = read(sock, (char *)remote_con_data + total_read_bytes,
                         sizeof(*remote_con_data) - total_read_bytes);
        if (read_bytes > 0) {
            total_read_bytes += read_bytes;
        } else {
            fprintf(stderr, "错误: 接收远端连接信息失败\n");
            return -1;
        }
    }

    return 0;
}

int sock_sync_data_multi(int sock,
                         struct cm_con_data_t *local_con_data,
                         uint32_t local_num_qp,
                         struct cm_con_data_t *remote_con_data,
                         uint32_t *remote_num_qp) {
    int rc;
    int read_bytes = 0;
    int total_read_bytes = 0;
    uint32_t i;
    uint32_t expected_size;

    /* 先发送本地QP数量 */
    rc = write(sock, &local_num_qp, sizeof(local_num_qp));
    if (rc != sizeof(local_num_qp)) {
        fprintf(stderr, "错误: 发送本地QP数量失败\n");
        return -1;
    }
    printf("已发送本地QP数量: %u\n", local_num_qp);

    /* 发送所有本地QP连接信息 */
    for (i = 0; i < local_num_qp; i++) {
        rc = write(sock, &local_con_data[i], sizeof(struct cm_con_data_t));
        if (rc != sizeof(struct cm_con_data_t)) {
            fprintf(stderr, "错误: 发送QP[%u]连接信息失败\n", i);
            return -1;
        }
    }
    printf("已发送 %u 个本地QP的连接信息\n", local_num_qp);

    /* 接收远端QP数量 */
    total_read_bytes = 0;
    while (total_read_bytes < sizeof(*remote_num_qp)) {
        read_bytes = read(sock, (char *)remote_num_qp + total_read_bytes,
                         sizeof(*remote_num_qp) - total_read_bytes);
        if (read_bytes > 0) {
            total_read_bytes += read_bytes;
        } else {
            fprintf(stderr, "错误: 接收远端QP数量失败\n");
            return -1;
        }
    }
    printf("已接收远端QP数量: %u\n", *remote_num_qp);

    if (*remote_num_qp > MAX_QP) {
        fprintf(stderr, "错误: 远端QP数量(%u)超过最大限制(%u)\n",
                *remote_num_qp, MAX_QP);
        return -1;
    }

    /* 接收所有远端QP连接信息 */
    expected_size = *remote_num_qp * sizeof(struct cm_con_data_t);
    total_read_bytes = 0;
    while (total_read_bytes < expected_size) {
        read_bytes = read(sock, (char *)remote_con_data + total_read_bytes,
                         expected_size - total_read_bytes);
        if (read_bytes > 0) {
            total_read_bytes += read_bytes;
        } else {
            fprintf(stderr, "错误: 接收远端QP连接信息失败\n");
            return -1;
        }
    }
    printf("已接收 %u 个远端QP的连接信息\n", *remote_num_qp);

    return 0;
}

int post_receive(struct rdma_resources *res) {
    struct ibv_recv_wr rr;
    struct ibv_sge sge;
    struct ibv_recv_wr *bad_wr;

    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    memset(&rr, 0, sizeof(rr));
    rr.wr_id = 0;
    rr.sg_list = &sge;
    rr.num_sge = 1;

    if (ibv_post_recv(res->qp_list[0], &rr, &bad_wr)) {
        fprintf(stderr, "错误: Post Receive失败\n");
        return -1;
    }

    return 0;
}

int post_receive_qp(struct rdma_resources *res, uint32_t qp_idx) {
    struct ibv_recv_wr rr;
    struct ibv_sge sge;
    struct ibv_recv_wr *bad_wr;

    if (qp_idx >= res->num_qp) {
        fprintf(stderr, "错误: QP索引[%u]超出范围[0-%u)\n", qp_idx, res->num_qp);
        return -1;
    }

    /* 设置Scatter-Gather Element */
    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    /* 设置Receive Work Request */
    memset(&rr, 0, sizeof(rr));
    rr.wr_id = qp_idx;  /* Work Request ID设为QP索引以便识别 */
    rr.sg_list = &sge;
    rr.num_sge = 1;

    /* 投递Receive WR到指定QP的RQ */
    if (ibv_post_recv(res->qp_list[qp_idx], &rr, &bad_wr)) {
        fprintf(stderr, "错误: Post Receive到QP[%u]失败\n", qp_idx);
        return -1;
    }

    return 0;
}

int post_receive_all(struct rdma_resources *res) {
    uint32_t i;

    for (i = 0; i < res->num_qp; i++) {
        if (post_receive_qp(res, i)) {
            fprintf(stderr, "错误: Post Receive到QP[%u]失败\n", i);
            return -1;
        }
    }

    return 0;
}

int post_send(struct rdma_resources *res, enum ibv_wr_opcode opcode) {
    struct ibv_send_wr sr;
    struct ibv_sge sge;
    struct ibv_send_wr *bad_wr;

    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    memset(&sr, 0, sizeof(sr));
    sr.wr_id = 0;
    sr.opcode = opcode;
    sr.sg_list = &sge;
    sr.num_sge = 1;
    sr.send_flags = IBV_SEND_SIGNALED;

    if (ibv_post_send(res->qp_list[0], &sr, &bad_wr)) {
        fprintf(stderr, "错误: Post Send失败\n");
        return -1;
    }

    return 0;
}

int post_send_qp(struct rdma_resources *res, uint32_t qp_idx, enum ibv_wr_opcode opcode) {
    struct ibv_send_wr sr;
    struct ibv_sge sge;
    struct ibv_send_wr *bad_wr;

    if (qp_idx >= res->num_qp) {
        fprintf(stderr, "错误: QP索引[%u]超出范围[0-%u)\n", qp_idx, res->num_qp);
        return -1;
    }

    /* 设置Scatter-Gather Element */
    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    /* 设置Send Work Request */
    memset(&sr, 0, sizeof(sr));
    sr.wr_id = qp_idx;  /* Work Request ID设为QP索引以便识别 */
    sr.opcode = opcode;
    sr.sg_list = &sge;
    sr.num_sge = 1;
    sr.send_flags = IBV_SEND_SIGNALED;

    /* 投递Send WR到指定QP的SQ */
    if (ibv_post_send(res->qp_list[qp_idx], &sr, &bad_wr)) {
        fprintf(stderr, "错误: Post Send到QP[%u]失败\n", qp_idx);
        return -1;
    }

    return 0;
}

int poll_completion(struct rdma_resources *res, int expected_completions, int *qp_idx) {
    struct ibv_wc wc;
    int poll_result;
    int total_completions = 0;
    unsigned long start_time_msec;
    unsigned long cur_time_msec;
    struct timeval cur_time;

    gettimeofday(&cur_time, NULL);
    start_time_msec = (cur_time.tv_sec * 1000) + (cur_time.tv_usec / 1000);

    while (total_completions < expected_completions) {
        poll_result = ibv_poll_cq(res->cq, 1, &wc);
        if (poll_result < 0) {
            fprintf(stderr, "错误: Poll CQ失败\n");
            return -1;
        }

        if (poll_result > 0) {
            total_completions++;
            if (wc.status != IBV_WC_SUCCESS) {
                fprintf(stderr, "错误: 完成状态异常: %s\n",
                        ibv_wc_status_str(wc.status));
                return -1;
            }
            if (qp_idx) {
                *qp_idx = (int)wc.wr_id;  /* 返回QP索引 */
            }
        }

        gettimeofday(&cur_time, NULL);
        cur_time_msec = (cur_time.tv_sec * 1000) + (cur_time.tv_usec / 1000);
        if ((cur_time_msec - start_time_msec) > 5000) {
            fprintf(stderr, "错误: Poll CQ超时\n");
            return -1;
        }
    }

    return 0;
}

/**
 * 将QP状态枚举值转换为字符串
 */
static const char* qp_state_to_str(enum ibv_qp_state state) {
    switch (state) {
        case IBV_QPS_RESET:
            return "RESET";
        case IBV_QPS_INIT:
            return "INIT";
        case IBV_QPS_RTR:
            return "RTR (Ready to Receive)";
        case IBV_QPS_RTS:
            return "RTS (Ready to Send)";
        case IBV_QPS_SQD:
            return "SQD (Send Queue Draining)";
        case IBV_QPS_SQE:
            return "SQE (Send Queue Error)";
        case IBV_QPS_ERR:
            return "ERR";
        default:
            return "UNKNOWN";
    }
}

/**
 * 将QPT类型转换为字符串
 */
static const char* qp_type_to_str(enum ibv_qp_type type) {
    switch (type) {
        case IBV_QPT_RC:
            return "RC (Reliable Connection)";
        case IBV_QPT_UC:
            return "UC (Unreliable Connection)";
        case IBV_QPT_UD:
            return "UD (Unreliable Datagram)";
        case IBV_QPT_RAW_PACKET:
            return "RAW_PACKET";
        default:
            return "UNKNOWN";
    }
}

/**
 * 打印QP的运行时状态
 */
int print_qp_state(struct rdma_resources *res, uint32_t qp_idx, const char *title) {
    struct ibv_qp_attr attr;
    struct ibv_qp_init_attr init_attr;
    int attr_mask;
    struct ibv_qp *qp;

    if (!res || !res->qp_list || qp_idx >= res->num_qp) {
        fprintf(stderr, "错误: 无效的QP资源或索引\n");
        return -1;
    }

    qp = res->qp_list[qp_idx];

    /* 查询QP属性 */
    attr_mask = IBV_QP_STATE | IBV_QP_CUR_STATE | IBV_QP_EN_SQD_ASYNC_NOTIFY |
                IBV_QP_ACCESS_FLAGS | IBV_QP_PKEY_INDEX | IBV_QP_PORT |
                IBV_QP_QKEY | IBV_QP_AV | IBV_QP_PATH_MTU | IBV_QP_TIMEOUT |
                IBV_QP_RETRY_CNT | IBV_QP_RNR_RETRY | IBV_QP_RQ_PSN |
                IBV_QP_MAX_QP_RD_ATOMIC | IBV_QP_ALT_PATH | IBV_QP_MIN_RNR_TIMER |
                IBV_QP_SQ_PSN | IBV_QP_MAX_DEST_RD_ATOMIC | IBV_QP_PATH_MIG_STATE;

    memset(&attr, 0, sizeof(attr));
    memset(&init_attr, 0, sizeof(init_attr));

    if (ibv_query_qp(qp, &attr, attr_mask, &init_attr)) {
        fprintf(stderr, "错误: 查询QP属性失败\n");
        return -1;
    }

    printf("\n");
    printf("╔════════════════════════════════════════════════════════════╗\n");
    if (title) {
        printf("║  QP[%u]运行时状态 - %s\n", qp_idx, title);
        printf("║────────────────────────────────────────────────────────────║\n");
    } else {
        printf("║  QP[%u]运行时状态信息\n", qp_idx);
        printf("║────────────────────────────────────────────────────────────║\n");
    }
    
    /* 基本信息 */
    printf("║\n");
    printf("║ 【基本信息】\n");
    printf("║  QP号: 0x%06x\n", qp->qp_num);
    printf("║  QP类型: %s\n", qp_type_to_str(init_attr.qp_type));

    /* QP状态 */
    printf("║\n");
    printf("║ 【QP状态】\n");
    printf("║  当前状态: %s\n", qp_state_to_str(attr.qp_state));

    /* 队列容量 */
    printf("║\n");
    printf("║ 【队列容量】\n");
    printf("║  Send Queue:\n");
    printf("║    - 最大WR数: %u\n", init_attr.cap.max_send_wr);
    printf("║    - 最大SGE数: %u\n", init_attr.cap.max_send_sge);
    printf("║  Receive Queue:\n");
    printf("║    - 最大WR数: %u\n", init_attr.cap.max_recv_wr);
    printf("║    - 最大SGE数: %u\n", init_attr.cap.max_recv_sge);
    printf("║  内联数据大小: %u\n", init_attr.cap.max_inline_data);

    /* 端口和PKEY */
    printf("║\n");
    printf("║ 【端口配置】\n");
    printf("║  端口号: %u\n", attr.port_num);
    printf("║  PKEY索引: %u\n", attr.pkey_index);

    /* PSN (Packet Sequence Number) */
    printf("║\n");
    printf("║ 【Packet Sequence Numbers】\n");
    printf("║  SQ PSN: %u\n", attr.sq_psn);
    printf("║  RQ PSN: %u\n", attr.rq_psn);

    /* 路径MTU */
    printf("║\n");
    printf("║ 【路径MTU】\n");
    const char *mtu_str;
    switch (attr.path_mtu) {
        case IBV_MTU_256:  mtu_str = "256 bytes"; break;
        case IBV_MTU_512:  mtu_str = "512 bytes"; break;
        case IBV_MTU_1024: mtu_str = "1024 bytes"; break;
        case IBV_MTU_2048: mtu_str = "2048 bytes"; break;
        case IBV_MTU_4096: mtu_str = "4096 bytes"; break;
        default: mtu_str = "UNKNOWN"; break;
    }
    printf("║  MTU: %s\n", mtu_str);

    /* 可靠性参数 */
    printf("║\n");
    printf("║ 【可靠性参数】\n");
    printf("║  超时: %u (大约 %.1f ms)\n", attr.timeout,
           (1UL << attr.timeout) * 4.096 / 1000.0);
    printf("║  重试次数: %u\n", attr.retry_cnt);
    printf("║  RNR重试次数: %u\n", attr.rnr_retry);
    printf("║  RNR最小超时: %u\n", attr.min_rnr_timer);

    /* RDMA操作限制 */
    printf("║\n");
    printf("║ 【RDMA操作限制】\n");
    printf("║  最大本地未完成RDMA读/原子操作: %u\n", attr.max_rd_atomic);
    printf("║  最大远端未完成RDMA读/原子操作: %u\n", attr.max_dest_rd_atomic);

    /* 访问权限 */
    printf("║\n");
    printf("║ 【访问权限】\n");
    printf("║  Local Write: %s\n", 
           (attr.qp_access_flags & IBV_ACCESS_LOCAL_WRITE) ? "是" : "否");
    printf("║  Remote Write: %s\n", 
           (attr.qp_access_flags & IBV_ACCESS_REMOTE_WRITE) ? "是" : "否");
    printf("║  Remote Read: %s\n", 
           (attr.qp_access_flags & IBV_ACCESS_REMOTE_READ) ? "是" : "否");
    printf("║  Remote Atomic: %s\n", 
           (attr.qp_access_flags & IBV_ACCESS_REMOTE_ATOMIC) ? "是" : "否");

    /* 寻址信息 (AH) */
    if (attr.qp_state != IBV_QPS_RESET && attr.qp_state != IBV_QPS_INIT) {
        printf("║\n");
        printf("║ 【寻址信息 (Address Handle)】\n");
        printf("║  远端LID: 0x%04x\n", attr.ah_attr.dlid);
        printf("║  Service Level: %u\n", attr.ah_attr.sl);
        printf("║  Port Num: %u\n", attr.ah_attr.port_num);
        printf("║  Static Rate: %u\n", attr.ah_attr.static_rate);
        printf("║  Source Path Bits: %u\n", attr.ah_attr.src_path_bits);
        
        if (attr.ah_attr.is_global) {
            printf("║  Global Routing:\n");
            printf("║    - Flow Label: %u\n", attr.ah_attr.grh.flow_label);
            printf("║    - Hop Limit: %u\n", attr.ah_attr.grh.hop_limit);
            printf("║    - Traffic Class: %u\n", attr.ah_attr.grh.traffic_class);
            printf("║    - SGID Index: %u\n", attr.ah_attr.grh.sgid_index);
        }
    }

    /* 远端QP信息 */
    if (attr.qp_state != IBV_QPS_RESET && attr.qp_state != IBV_QPS_INIT) {
        printf("║\n");
        printf("║ 【远端QP信息】\n");
        printf("║  远端QP号: 0x%06x\n", attr.dest_qp_num);
    }

    printf("║\n");
    printf("╚════════════════════════════════════════════════════════════╝\n");
    printf("\n");

    return 0;
}

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
