import type { AnimationStep } from '../types';

export const animationSteps: AnimationStep[] = [
  // 阶段 1：资源准备（8 步）- Host A 和 Host B 都创建资源
  {
    id: 'step-1',
    phase: 1,
    title: '打开 RDMA 设备 (Host A)',
    description: '调用 ibv_open_device() 打开 RDMA 网卡设备，获取设备上下文句柄。这是所有 RDMA 操作的第一步。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'highlight', element: 'rnic' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_context *ctx = ibv_open_device(device);',
        location: 'src/rdma_common.c:78'
      },
      { target: 'panel', type: 'showInfo', text: '获取设备上下文，用于后续资源分配' },
    ],
    stateChange: null,
  },
  {
    id: 'step-2',
    phase: 1,
    title: '分配保护域 (PD) - Host A',
    description: '调用 ibv_alloc_pd() 分配保护域（Protection Domain）。PD 是 RDMA 资源管理的基本单位，所有 MR、CQ、QP 都必须属于某个 PD。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'createResource', resource: 'PD' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_pd *pd = ibv_alloc_pd(ctx);',
        location: 'src/rdma_common.c:107'
      },
      { target: 'panel', type: 'showParams', params: ['ctx: 设备上下文', '返回：保护域句柄'] },
    ],
    stateChange: null,
  },
  {
    id: 'step-3',
    phase: 1,
    title: '创建完成队列 (CQ) - Host A',
    description: '调用 ibv_create_cq() 创建完成队列（Completion Queue）。CQ 用于接收工作请求完成通知，应用通过轮询 CQ 获取操作结果。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'createResource', resource: 'CQ' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_cq *cq = ibv_create_cq(ctx, cq_size, NULL, NULL, 0);',
        location: 'src/rdma_common.c:140'
      },
      { target: 'panel', type: 'showParams', params: ['ctx: 设备上下文', 'cq_size: CQ 条目数量', '返回：CQ 句柄'] },
    ],
    stateChange: null,
  },
  {
    id: 'step-4',
    phase: 1,
    title: '注册内存区域 (MR) - Host A',
    description: '调用 ibv_reg_mr() 注册内存区域（Memory Region）。注册后的内存可以被 RDMA 网卡直接访问，支持远程读写操作。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'createResource', resource: 'MR' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_mr *mr = ibv_reg_mr(pd, buf, length, access);',
        location: 'src/rdma_common.c:125'
      },
      { target: 'panel', type: 'showParams', params: ['pd: 保护域', 'buf: 内存缓冲区指针', 'length: 内存长度', 'access: 访问权限标志'] },
    ],
    stateChange: null,
  },
  {
    id: 'step-5',
    phase: 1,
    title: '打开 RDMA 设备 (Host B)',
    description: 'Host B 同样需要打开 RDMA 设备，获取设备上下文。',
    duration: 3000,
    actions: [
      { target: 'hostB', type: 'highlight', element: 'rnic' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_context *ctx = ibv_open_device(device);',
        location: 'src/rdma_common.c:78'
      },
      { target: 'panel', type: 'showInfo', text: 'Host B 获取设备上下文' },
    ],
    stateChange: null,
  },
  {
    id: 'step-6',
    phase: 1,
    title: '分配保护域 (PD) - Host B',
    description: 'Host B 分配保护域（Protection Domain）。',
    duration: 3000,
    actions: [
      { target: 'hostB', type: 'createResource', resource: 'PD' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_pd *pd = ibv_alloc_pd(ctx);',
        location: 'src/rdma_common.c:107'
      },
      { target: 'panel', type: 'showInfo', text: 'Host B 分配 PD' },
    ],
    stateChange: null,
  },
  {
    id: 'step-7',
    phase: 1,
    title: '创建完成队列 (CQ) - Host B',
    description: 'Host B 创建完成队列（Completion Queue）。',
    duration: 3000,
    actions: [
      { target: 'hostB', type: 'createResource', resource: 'CQ' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_cq *cq = ibv_create_cq(ctx, cq_size, NULL, NULL, 0);',
        location: 'src/rdma_common.c:140'
      },
      { target: 'panel', type: 'showInfo', text: 'Host B 创建 CQ' },
    ],
    stateChange: null,
  },
  {
    id: 'step-8',
    phase: 1,
    title: '注册内存区域 (MR) - Host B',
    description: 'Host B 注册内存区域（Memory Region）。',
    duration: 3000,
    actions: [
      { target: 'hostB', type: 'createResource', resource: 'MR' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_mr *mr = ibv_reg_mr(pd, buf, length, access);',
        location: 'src/rdma_common.c:125'
      },
      { target: 'panel', type: 'showInfo', text: 'Host B 注册 MR' },
    ],
    stateChange: null,
  },

  // 阶段 2：QP 创建与信息交换（3 步）
  {
    id: 'step-9',
    phase: 2,
    title: 'Host A 创建 QP',
    description: '调用 ibv_create_qp() 创建队列对（Queue Pair）。QP 初始状态为 RESET，需要后续状态转换才能进行通信。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'createQP' },
      { target: 'hostA', type: 'modifyQP', from: null, to: 'RESET' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_qp *qp = ibv_create_qp(pd, &qp_attr);',
        location: 'src/rdma_common_qp.c:28'
      },
      { target: 'panel', type: 'showParams', params: ['pd: 保护域', 'qp_attr: QP 属性', '初始状态：RESET'] },
    ],
    stateChange: { host: 'A', from: null, to: 'RESET' },
  },
  {
    id: 'step-10',
    phase: 2,
    title: 'Host B 创建 QP',
    description: 'Host B 同样调用 ibv_create_qp() 创建队列对。双方都需要创建 QP 才能建立连接。',
    duration: 3000,
    actions: [
      { target: 'hostB', type: 'createQP' },
      { target: 'hostB', type: 'modifyQP', from: null, to: 'RESET' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_qp *qp = ibv_create_qp(pd, &qp_attr);',
        location: 'src/rdma_common_qp.c:28'
      },
      { target: 'panel', type: 'showInfo', text: 'Host B 也创建了 QP，状态为 RESET' },
    ],
    stateChange: { host: 'B', from: null, to: 'RESET' },
  },
  {
    id: 'step-11',
    phase: 2,
    title: 'QP 信息交换',
    description: '通过带外（Out-of-Band）通道交换 QP 信息，包括 QPN（QP Number）、GID（Global Identifier）、LID（Local Identifier）等。这是 RDMA 连接建立的必要步骤。',
    duration: 4000,
    actions: [
      { target: 'network', type: 'dataExchange', fromHost: 'hostA', toHost: 'hostB', data: 'QP-INFO', label: 'QPN_A, GID_A' },
      { target: 'network', type: 'dataExchange', fromHost: 'hostB', toHost: 'hostA', data: 'QP-INFO', label: 'QPN_B, GID_B' },
      {
        target: 'panel',
        type: 'showCode',
        code: '// 通过 TCP socket 交换 qp_info_t 结构\ntcp_send(&local_qpn, &local_gid, &local_lid);',
        location: 'src/rdma_common_net.c'
      },
      { target: 'panel', type: 'showInfo', text: '双向交换 QP 信息（有来有回）' },
      { target: 'network', type: 'showConnection', style: 'dashed', color: '#F59E0B' },
    ],
    stateChange: null,
  },

  // 阶段 3：QP 状态转换（6 步）
  {
    id: 'step-12',
    phase: 3,
    title: 'Host A: RESET → INIT',
    description: '调用 ibv_modify_qp() 将 Host A 的 QP 从 RESET 状态转换到 INIT 状态。需要设置端口号和访问权限。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'modifyQP', from: 'RESET', to: 'INIT' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_modify_qp(qp, &attr, IBV_QP_STATE | IBV_QP_PORT);',
        location: 'src/rdma_common_qp.c:86'
      },
      { target: 'panel', type: 'showParams', params: ['qp_state: INIT', 'port_num: 1', 'access_flags: 本地访问权限'] },
    ],
    stateChange: { host: 'A', from: 'RESET', to: 'INIT' },
  },
  {
    id: 'step-13',
    phase: 3,
    title: 'Host B: RESET → INIT',
    description: 'Host B 同样调用 ibv_modify_qp() 将 QP 转换到 INIT 状态。',
    duration: 3000,
    actions: [
      { target: 'hostB', type: 'modifyQP', from: 'RESET', to: 'INIT' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_modify_qp(qp, &attr, IBV_QP_STATE | IBV_QP_PORT);',
        location: 'src/rdma_common_qp.c:86'
      },
      { target: 'panel', type: 'showInfo', text: 'Host B 的 QP 也进入 INIT 状态' },
    ],
    stateChange: { host: 'B', from: 'RESET', to: 'INIT' },
  },
  {
    id: 'step-14',
    phase: 3,
    title: 'Host A: INIT → RTR',
    description: '调用 ibv_modify_qp() 将 Host A 的 QP 从 INIT 转换到 RTR（Ready to Receive）状态。需要配置远端 QP 信息和 AH（Address Handle）属性。',
    duration: 3500,
    actions: [
      { target: 'hostA', type: 'modifyQP', from: 'INIT', to: 'RTR' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_modify_qp(qp, &attr, IBV_QP_STATE | IBV_QP_AV | ...);',
        location: 'src/rdma_common_qp.c:157'
      },
      { target: 'panel', type: 'showParams', params: ['qp_state: RTR', 'remote_qpn: 对端 QPN', 'remote_gid: 对端 GID', 'ah_attr: 地址句柄'] },
    ],
    stateChange: { host: 'A', from: 'INIT', to: 'RTR' },
  },
  {
    id: 'step-15',
    phase: 3,
    title: 'Host B: INIT → RTR',
    description: 'Host B 同样调用 ibv_modify_qp() 将 QP 转换到 RTR 状态。双方都进入 RTR 后，可以接收 RDMA 数据。',
    duration: 3500,
    actions: [
      { target: 'hostB', type: 'modifyQP', from: 'INIT', to: 'RTR' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_modify_qp(qp, &attr, IBV_QP_STATE | IBV_QP_AV | ...);',
        location: 'src/rdma_common_qp.c:157'
      },
      { target: 'panel', type: 'showInfo', text: '双方 QP 都已进入 RTR 状态，可以接收数据' },
    ],
    stateChange: { host: 'B', from: 'INIT', to: 'RTR' },
  },
  {
    id: 'step-16',
    phase: 3,
    title: 'Host A: RTR → RTS',
    description: '调用 ibv_modify_qp() 将 Host A 的 QP 从 RTR 转换到 RTS（Ready to Send）状态。需要设置超时时间和重试次数。',
    duration: 3000,
    actions: [
      { target: 'hostA', type: 'modifyQP', from: 'RTR', to: 'RTS' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_modify_qp(qp, &attr, IBV_QP_STATE | IBV_QP_TIMEOUT | ...);',
        location: 'src/rdma_common_qp.c:241'
      },
      { target: 'panel', type: 'showParams', params: ['qp_state: RTS', 'timeout: 超时时间', 'retry_cnt: 重试次数', 'rnr_retry: RNR 重试'] },
    ],
    stateChange: { host: 'A', from: 'RTR', to: 'RTS' },
  },
  {
    id: 'step-17',
    phase: 3,
    title: 'Host B: RTR → RTS',
    description: 'Host B 同样调用 ibv_modify_qp() 将 QP 转换到 RTS 状态。至此，双方 QP 都已就绪，可以进行双向 RDMA 通信。',
    duration: 3500,
    actions: [
      { target: 'hostB', type: 'modifyQP', from: 'RTR', to: 'RTS' },
      {
        target: 'panel',
        type: 'showCode',
        code: 'ibv_modify_qp(qp, &attr, IBV_QP_STATE | IBV_QP_TIMEOUT | ...);',
        location: 'src/rdma_common_qp.c:241'
      },
      { target: 'panel', type: 'showSuccess', text: 'QP 连接建立完成！' },
    ],
    stateChange: { host: 'B', from: 'RTR', to: 'RTS' },
  },

  // 阶段 4：连接完成（1 步）
  {
    id: 'step-18',
    phase: 4,
    title: '连接建立完成',
    description: '双方 QP 都处于 RTS 状态，RDMA 连接正式建立。现在可以进行 RDMA Read/Write/Send 等操作，实现零 CPU 干预的高速数据传输。',
    duration: 5000,
    actions: [
      { target: 'network', type: 'showConnection', style: 'solid', color: '#10B981' },
      { target: 'network', type: 'dataExchange', fromHost: 'hostA', toHost: 'hostB', data: 'RDMA WRITE', label: 'DATA' },
      {
        target: 'panel',
        type: 'showCode',
        code: '// 现在可以进行 RDMA 数据传输\nibv_post_send(qp, &wr, &bad_wr);',
        location: 'src/rdma_common_net.c:190'
      },
      { target: 'panel', type: 'showSuccess', text: 'RDMA 连接已就绪，可以开始数据传输！' },
    ],
    stateChange: null,
  },
];
