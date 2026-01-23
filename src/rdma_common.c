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
                        int gid_idx) {
    int num_devices;
    int i;
    union ibv_gid gid;

    memset(res, 0, sizeof(*res));
    res->ib_port = ib_port;
    res->gid_idx = gid_idx;
    res->buf_size = DEFAULT_MSG_SIZE;

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

    /* 9. 创建Completion Queue (CQ) */
    printf("\n========== 步骤7: 创建Completion Queue ==========\n");
    res->cq = ibv_create_cq(res->context, CQ_SIZE, NULL, NULL, 0);
    if (!res->cq) {
        fprintf(stderr, "错误: 创建CQ失败\n");
        return -1;
    }
    printf("成功创建CQ (大小: %d)\n", CQ_SIZE);

    return 0;
}

int create_qp(struct rdma_resources *res) {
    struct ibv_qp_init_attr qp_init_attr;

    printf("\n========== 步骤8: 创建Queue Pair ==========\n");

    memset(&qp_init_attr, 0, sizeof(qp_init_attr));
    qp_init_attr.qp_type = IBV_QPT_RC;  /* RC = Reliable Connection */
    qp_init_attr.sq_sig_all = 1;        /* 所有Send操作都产生CQE */
    qp_init_attr.send_cq = res->cq;     /* Send Completion Queue */
    qp_init_attr.recv_cq = res->cq;     /* Recv Completion Queue */
    qp_init_attr.cap.max_send_wr = MAX_WR;    /* 最大Send WR数 */
    qp_init_attr.cap.max_recv_wr = MAX_WR;    /* 最大Recv WR数 */
    qp_init_attr.cap.max_send_sge = MAX_SGE;  /* 每个Send WR的SGE数 */
    qp_init_attr.cap.max_recv_sge = MAX_SGE;  /* 每个Recv WR的SGE数 */

    res->qp = ibv_create_qp(res->pd, &qp_init_attr);
    if (!res->qp) {
        fprintf(stderr, "错误: 创建QP失败\n");
        return -1;
    }
    printf("成功创建QP\n");
    printf("  - QP号: 0x%06x\n", res->qp->qp_num);
    printf("  - QP类型: RC (Reliable Connection)\n");

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

    if (ibv_modify_qp(res->qp, &attr, flags)) {
        fprintf(stderr, "错误: 修改QP到INIT状态失败\n");
        return -1;
    }
    printf("QP状态: RESET -> INIT\n");

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
    attr.path_mtu = res->port_attr.active_mtu;  /* 使用端口实际MTU，而非硬编码 */
    attr.dest_qp_num = remote_con_data->qp_num;  /* 远端QP号 */
    attr.rq_psn = 0;  /* Receive队列的起始PSN (Packet Sequence Number) */

    /* AH (Address Handle) 属性 */
    attr.ah_attr.dlid = remote_con_data->lid;  /* 远端LID */
    attr.ah_attr.sl = 0;  /* Service Level */
    attr.ah_attr.src_path_bits = 0;
    attr.ah_attr.port_num = res->ib_port;

    /* 对于RoCEv2，强制设置GID（即使GID看起来为0也设置） */
    attr.ah_attr.is_global = 1;
    memcpy(&remote_gid, remote_con_data->gid, 16);
    attr.ah_attr.grh.dgid = remote_gid;
    attr.ah_attr.grh.flow_label = 0;
    attr.ah_attr.grh.hop_limit = 1;  /* 对于RoCEv2通常设为1 */
    attr.ah_attr.grh.sgid_index = res->gid_idx;
    attr.ah_attr.grh.traffic_class = 0;

    /* RC QP的可靠性参数 */
    attr.max_dest_rd_atomic = 1;  /* 目标端最大未完成RDMA读/原子操作 */
    attr.min_rnr_timer = 12;  /* RNR (Receiver Not Ready) 最小超时 */

    flags = IBV_QP_STATE | IBV_QP_AV | IBV_QP_PATH_MTU | IBV_QP_DEST_QPN |
            IBV_QP_RQ_PSN | IBV_QP_MAX_DEST_RD_ATOMIC | IBV_QP_MIN_RNR_TIMER;

    if (ibv_modify_qp(res->qp, &attr, flags)) {
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

int modify_qp_to_rts(struct rdma_resources *res) {
    struct ibv_qp_attr attr;
    int flags;

    printf("\n========== 步骤11: 修改QP状态 RTR->RTS ==========\n");

    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_RTS;
    attr.timeout = 14;  /* 超时时间 */
    attr.retry_cnt = 7;  /* 重试次数 */
    attr.rnr_retry = 7;  /* RNR重试次数 */
    attr.sq_psn = 0;  /* Send队列的起始PSN */
    attr.max_rd_atomic = 1;  /* 本地最大未完成RDMA读/原子操作 */

    flags = IBV_QP_STATE | IBV_QP_TIMEOUT | IBV_QP_RETRY_CNT |
            IBV_QP_RNR_RETRY | IBV_QP_SQ_PSN | IBV_QP_MAX_QP_RD_ATOMIC;

    if (ibv_modify_qp(res->qp, &attr, flags)) {
        fprintf(stderr, "错误: 修改QP到RTS状态失败\n");
        return -1;
    }
    printf("QP状态: RTR -> RTS (Ready to Send)\n");

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

int post_receive(struct rdma_resources *res) {
    struct ibv_recv_wr rr;
    struct ibv_sge sge;
    struct ibv_recv_wr *bad_wr;

    /* 设置Scatter-Gather Element */
    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    /* 设置Receive Work Request */
    memset(&rr, 0, sizeof(rr));
    rr.wr_id = 0;  /* Work Request ID */
    rr.sg_list = &sge;
    rr.num_sge = 1;

    /* 投递Receive WR到RQ */
    if (ibv_post_recv(res->qp, &rr, &bad_wr)) {
        fprintf(stderr, "错误: Post Receive失败\n");
        return -1;
    }

    return 0;
}

int post_send(struct rdma_resources *res, enum ibv_wr_opcode opcode) {
    struct ibv_send_wr sr;
    struct ibv_sge sge;
    struct ibv_send_wr *bad_wr;

    /* 设置Scatter-Gather Element */
    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    /* 设置Send Work Request */
    memset(&sr, 0, sizeof(sr));
    sr.wr_id = 0;
    sr.opcode = opcode;
    sr.sg_list = &sge;
    sr.num_sge = 1;
    sr.send_flags = IBV_SEND_SIGNALED;  /* 产生CQE */

    /* 投递Send WR到SQ */
    if (ibv_post_send(res->qp, &sr, &bad_wr)) {
        fprintf(stderr, "错误: Post Send失败\n");
        return -1;
    }

    return 0;
}

int poll_completion(struct rdma_resources *res, int expected_completions) {
    struct ibv_wc wc;
    int poll_result;
    int total_completions = 0;
    unsigned long start_time_msec;
    unsigned long cur_time_msec;
    struct timeval cur_time;

    /* 获取起始时间 */
    gettimeofday(&cur_time, NULL);
    start_time_msec = (cur_time.tv_sec * 1000) + (cur_time.tv_usec / 1000);

    /* 轮询CQ直到获得期望数量的完成事件 */
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
        }

        /* 检查超时 (5秒) */
        gettimeofday(&cur_time, NULL);
        cur_time_msec = (cur_time.tv_sec * 1000) + (cur_time.tv_usec / 1000);
        if ((cur_time_msec - start_time_msec) > 5000) {
            fprintf(stderr, "错误: Poll CQ超时\n");
            return -1;
        }
    }

    return 0;
}

void cleanup_rdma_resources(struct rdma_resources *res) {
    printf("\n========== 清理RDMA资源 ==========\n");

    if (res->qp) {
        ibv_destroy_qp(res->qp);
        printf("销毁QP\n");
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
