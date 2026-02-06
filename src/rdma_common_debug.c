/**
 * @file rdma_common_debug.c
 * @brief RDMA调试功能 - 增强版QP状态转换和诊断工具
 *
 * 本文件提供调试和诊断功能，包括：
 * - 增强版modify_qp_to_rtr_debug：带详细日志的QP状态转换
 * - 详细打印远端连接信息
 * - 详细打印本地GID信息
 * - QP属性验证和状态检查
 * - 地址处理相关属性详细输出
 *
 * 这些函数用于排查QP状态转换失败、连接问题等
 * 开发和测试阶段的诊断工具。
 *
 * @note 仅用于开发和调试，生产环境可以移除相关调用
 * @see rdma_common.h, rdma_common.c
 *
 * @author AI Programming Assistant
 * @date 2024
 */

#include "rdma_common.h"
int modify_qp_to_rtr_debug(struct rdma_resources *res,
                           struct cm_con_data_t *remote_con_data) {
    struct ibv_qp_attr attr;
    int flags;
    union ibv_gid remote_gid;
    union ibv_gid local_gid;

    printf("\n========== 调试: 修改QP状态 INIT->RTR ==========\n");

    /* 打印远端连接信息 */
    printf("远端连接信息:\n");
    printf("  - 远端QP号: 0x%06x (%u)\n", remote_con_data->qp_num, remote_con_data->qp_num);
    printf("  - 远端LID: 0x%04x (%u)\n", remote_con_data->lid, remote_con_data->lid);
    printf("  - 远端GID: ");
    memcpy(&remote_gid, remote_con_data->gid, 16);
    print_gid(&remote_gid);
    printf("\n");

    /* 获取并打印本地GID */
    if (ibv_query_gid(res->context, res->ib_port, res->gid_idx, &local_gid)) {
        fprintf(stderr, "错误: 查询本地GID失败\n");
        return -1;
    }
    printf("  - 本地GID索引: %d, GID: ", res->gid_idx);
    print_gid(&local_gid);
    printf("\n");

    /* 检查GID是否为零 */
    int gid_is_zero = 1;
    for (int i = 0; i < 16; i++) {
        if (remote_con_data->gid[i] != 0) {
            gid_is_zero = 0;
            break;
        }
    }
    if (gid_is_zero) {
        fprintf(stderr, "警告: 远端GID全为0，这对于RoCEv2是不正常的！\n");
    }

    /* 查询端口MTU */
    printf("  - 端口MTU: ");
    switch (res->port_attr.active_mtu) {
        case IBV_MTU_256:  printf("256\n"); break;
        case IBV_MTU_512:  printf("512\n"); break;
        case IBV_MTU_1024: printf("1024\n"); break;
        case IBV_MTU_2048: printf("2048\n"); break;
        case IBV_MTU_4096: printf("4096\n"); break;
        default: printf("未知(%d)\n", res->port_attr.active_mtu);
    }

    /* 设置QP属性 */
    memset(&attr, 0, sizeof(attr));
    attr.qp_state = IBV_QPS_RTR;
    attr.path_mtu = res->port_attr.active_mtu;  /* 使用端口实际MTU */
    attr.dest_qp_num = remote_con_data->qp_num;
    attr.rq_psn = 0;

    /* AH (Address Handle) 属性 */
    attr.ah_attr.dlid = remote_con_data->lid;
    attr.ah_attr.sl = 0;
    attr.ah_attr.src_path_bits = 0;
    attr.ah_attr.port_num = res->ib_port;

    /* 对于RoCEv2，强制设置GID（不依赖GID是否为0的检查） */
    printf("\n设置全局路由头(GRH) - RoCEv2必需:\n");
    attr.ah_attr.is_global = 1;
    memcpy(&remote_gid, remote_con_data->gid, 16);
    attr.ah_attr.grh.dgid = remote_gid;
    attr.ah_attr.grh.flow_label = 0;
    attr.ah_attr.grh.hop_limit = 1;
    attr.ah_attr.grh.sgid_index = res->gid_idx;
    attr.ah_attr.grh.traffic_class = 0;
    printf("  - is_global: %d\n", attr.ah_attr.is_global);
    printf("  - sgid_index: %d\n", attr.ah_attr.grh.sgid_index);
    printf("  - hop_limit: %d\n", attr.ah_attr.grh.hop_limit);

    /* RC QP的可靠性参数 */
    attr.max_dest_rd_atomic = 1;
    attr.min_rnr_timer = 12;

    flags = IBV_QP_STATE | IBV_QP_AV | IBV_QP_PATH_MTU | IBV_QP_DEST_QPN |
            IBV_QP_RQ_PSN | IBV_QP_MAX_DEST_RD_ATOMIC | IBV_QP_MIN_RNR_TIMER;

    printf("\n尝试修改QP状态...\n");
    if (ibv_modify_qp(res->qp, &attr, flags)) {
        fprintf(stderr, "\n========== 错误详情 ==========\n");
        fprintf(stderr, "ibv_modify_qp失败: %s (errno=%d)\n", strerror(errno), errno);
        fprintf(stderr, "可能的原因:\n");
        fprintf(stderr, "  1. GID索引无效或GID未配置\n");
        fprintf(stderr, "  2. 远端QP号错误\n");
        fprintf(stderr, "  3. MTU不匹配\n");
        fprintf(stderr, "  4. 端口未激活\n");
        fprintf(stderr, "\n建议检查:\n");
        fprintf(stderr, "  - 运行 'show_gids' 查看GID表\n");
        fprintf(stderr, "  - 运行 'ibv_devinfo -v' 查看设备详情\n");
        fprintf(stderr, "  - 确认双方使用相同的GID索引\n");
        return -1;
    }

    printf("\n========== 成功! ==========\n");
    printf("QP状态: INIT -> RTR (Ready to Receive)\n");

    return 0;
}
