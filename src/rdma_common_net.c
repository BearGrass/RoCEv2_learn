/**
 * @file rdma_common_net.c
 * @brief 网络通信模块：TCP元数据交换、工作请求投递、完成轮询
 *
 * 本文件实现与RDMA网络通信相关的函数，包括：
 * - TCP socket元数据交换
 * - Send/Receive 工作请求投递
 * - Completion Queue轮询
 */

#include "rdma_common.h"

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
    while (total_read_bytes < (int)sizeof(*remote_con_data)) {
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
    while (total_read_bytes < (int)sizeof(*remote_num_qp)) {
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
    while (total_read_bytes < (int)expected_size) {
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

    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    memset(&rr, 0, sizeof(rr));
    rr.wr_id = qp_idx;
    rr.sg_list = &sge;
    rr.num_sge = 1;

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

    memset(&sge, 0, sizeof(sge));
    sge.addr = (uintptr_t)res->buf;
    sge.length = res->buf_size;
    sge.lkey = res->mr->lkey;

    memset(&sr, 0, sizeof(sr));
    sr.wr_id = qp_idx;
    sr.opcode = opcode;
    sr.sg_list = &sge;
    sr.num_sge = 1;
    sr.send_flags = IBV_SEND_SIGNALED;

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
                *qp_idx = (int)wc.wr_id;
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
