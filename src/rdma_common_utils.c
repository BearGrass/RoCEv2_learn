/**
 * @file rdma_common_utils.c
 * @brief 辅助工具：打印GID、QP状态显示等辅助函数
 */

#include "rdma_common.h"

void print_gid(union ibv_gid *gid) {
    printf("%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x:%02x%02x",
           gid->raw[0], gid->raw[1], gid->raw[2], gid->raw[3],
           gid->raw[4], gid->raw[5], gid->raw[6], gid->raw[7],
           gid->raw[8], gid->raw[9], gid->raw[10], gid->raw[11],
           gid->raw[12], gid->raw[13], gid->raw[14], gid->raw[15]);
}

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
    printf("║\n");
    printf("║ 【基本信息】\n");
    printf("║  QP号: 0x%06x\n", qp->qp_num);
    printf("║  QP类型: %s\n", qp_type_to_str(init_attr.qp_type));
    printf("║\n");
    printf("║ 【QP状态】\n");
    printf("║  当前状态: %s\n", qp_state_to_str(attr.qp_state));
    printf("║\n");
    printf("║ 【队列容量】\n");
    printf("║  Send Queue:\n");
    printf("║    - 最大WR数: %u\n", init_attr.cap.max_send_wr);
    printf("║    - 最大SGE数: %u\n", init_attr.cap.max_send_sge);
    printf("║  Receive Queue:\n");
    printf("║    - 最大WR数: %u\n", init_attr.cap.max_recv_wr);
    printf("║    - 最大SGE数: %u\n", init_attr.cap.max_recv_sge);
    printf("║  内联数据大小: %u\n", init_attr.cap.max_inline_data);
    printf("║\n");
    printf("║ 【端口配置】\n");
    printf("║  端口号: %u\n", attr.port_num);
    printf("║  PKEY索引: %u\n", attr.pkey_index);
    printf("║\n");
    printf("║ 【Packet Sequence Numbers】\n");
    printf("║  SQ PSN: %u\n", attr.sq_psn);
    printf("║  RQ PSN: %u\n", attr.rq_psn);
    printf("║\n");
    const char *mtu_str;
    switch (attr.path_mtu) {
        case IBV_MTU_256:  mtu_str = "256 bytes"; break;
        case IBV_MTU_512:  mtu_str = "512 bytes"; break;
        case IBV_MTU_1024: mtu_str = "1024 bytes"; break;
        case IBV_MTU_2048: mtu_str = "2048 bytes"; break;
        case IBV_MTU_4096: mtu_str = "4096 bytes"; break;
        default: mtu_str = "UNKNOWN"; break;
    }
    printf("║ 【路径MTU】\n");
    printf("║  MTU: %s\n", mtu_str);
    printf("║\n");
    printf("║ 【可靠性参数】\n");
    printf("║  超时: %u (大约 %.1f ms)\n", attr.timeout,
           (1UL << attr.timeout) * 4.096 / 1000.0);
    printf("║  重试次数: %u\n", attr.retry_cnt);
    printf("║  RNR重试次数: %u\n", attr.rnr_retry);
    printf("║  RNR最小超时: %u\n", attr.min_rnr_timer);
    printf("║\n");
    printf("║ 【RDMA操作限制】\n");
    printf("║  最大本地未完成RDMA读/原子操作: %u\n", attr.max_rd_atomic);
    printf("║  最大远端未完成RDMA读/原子操作: %u\n", attr.max_dest_rd_atomic);
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
