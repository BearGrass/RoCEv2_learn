/**
 * RDMA 通信流程数据模型
 * 定义 QP 创建和数据面流程的步骤、状态转换、代码映射
 */

class RDMAStep {
    constructor(id, name, description, codeMapping, duration = 1000) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.codeMapping = codeMapping;
        this.duration = duration;
        this.isActive = false;
        this.isCompleted = false;
    }
}

class CodeMapping {
    constructor(file, startLine, endLine, snippet) {
        this.file = file;
        this.startLine = startLine;
        this.endLine = endLine;
        this.snippet = snippet;
    }

    getDisplay() {
        return `${this.file}:${this.startLine}-${this.endLine}`;
    }
}

class Scenario {
    constructor(id, name, description, steps) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.steps = steps;
        this.currentStepIndex = 0;
    }

    getCurrentStep() {
        return this.steps[this.currentStepIndex];
    }

    nextStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            return this.getCurrentStep();
        }
        return null;
    }

    prevStep() {
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            return this.getCurrentStep();
        }
        return null;
    }

    reset() {
        this.currentStepIndex = 0;
        this.steps.forEach(step => {
            step.isActive = false;
            step.isCompleted = false;
        });
    }

    isComplete() {
        return this.currentStepIndex === this.steps.length - 1;
    }
}

// ============ QP 创建流程 ============
const QPCreationSteps = [
    new RDMAStep(
        'qp-1-pd',
        '保护域(PD)分配',
        '申请保护域，用于管理RDMA资源的访问权限',
        new CodeMapping('src/rdma_common.c', 110, 125, 'pd = ibv_alloc_pd(ib_ctx);'),
        800
    ),
    new RDMAStep(
        'qp-2-cq',
        '完成队列(CQ)创建',
        '创建完成队列用于接收工作请求完成通知',
        new CodeMapping('src/rdma_common.c', 140, 165, 'cq = ibv_create_cq(ib_ctx, cq_size, NULL, NULL, 0);'),
        800
    ),
    new RDMAStep(
        'qp-3-mr',
        '内存注册(MR)',
        '注册应用内存区域，使RDMA硬件可以直接访问',
        new CodeMapping('src/rdma_common.c', 175, 195, 'mr = ibv_reg_mr(pd, buf_ptr, buf_size, ...);'),
        800
    ),
    new RDMAStep(
        'qp-4-create',
        'QP创建',
        '创建Queue Pair，用于点对点的RDMA通信',
        new CodeMapping('src/rdma_common_qp.c', 50, 95, 'qp = ibv_create_qp(pd, &qp_init_attr);'),
        1000
    ),
    new RDMAStep(
        'qp-5-init',
        'QP状态转换: RESET→INIT',
        '将QP从重置状态转换到初始化状态',
        new CodeMapping('src/rdma_common_qp.c', 115, 145, 'ibv_modify_qp(qp, &attr, IBV_QP_STATE);'),
        1000
    ),
    new RDMAStep(
        'qp-6-rtr',
        'QP状态转换: INIT→RTR',
        '将QP转换到就绪接收(Ready to Receive)状态',
        new CodeMapping('src/rdma_common_qp.c', 165, 200, 'modify_qp_to_rtr(...); // RTR requires GID info'),
        1200
    ),
    new RDMAStep(
        'qp-7-rts',
        'QP状态转换: RTR→RTS',
        '将QP转换到就绪发送(Ready to Send)状态，可以发送和接收数据',
        new CodeMapping('src/rdma_common_qp.c', 220, 250, 'modify_qp_to_rts(...);'),
        1000
    ),
    new RDMAStep(
        'qp-8-complete',
        'QP创建完成',
        'Queue Pair 已准备好进行数据通信',
        new CodeMapping('src/rdma_common.c', 300, 320, '// QP is now ready for data transfer'),
        600
    ),
];

// ============ 数据面流程 ============
const DataPlaneSteps = [
    new RDMAStep(
        'dp-1-prep',
        '准备Send WR',
        '准备发送工作请求(Work Request)，包括数据缓冲区和目标地址信息',
        new CodeMapping('src/rdma_common_net.c', 60, 90, 'struct ibv_send_wr sr; sr.wr.rdma.remote_addr = ...');'),
        800
    ),
    new RDMAStep(
        'dp-2-post-send',
        'Post Send WR',
        '将发送工作请求投递到SQ(Send Queue)',
        new CodeMapping('src/rdma_common_net.c', 100, 120, 'ibv_post_send(qp, &sr, &bad_wr);'),
        800
    ),
    new RDMAStep(
        'dp-3-rdma-write',
        'RDMA Write 执行',
        '网卡直接写入远端内存，不需要远端CPU干预',
        new CodeMapping('docs/technical/ARCHITECTURE.md', 45, 65, '// RDMA Write: Direct memory write'),
        1500
    ),
    new RDMAStep(
        'dp-4-completion',
        '本地完成(Local Completion)',
        '本地NIC生成工作完成(Work Completion)通知',
        new CodeMapping('src/rdma_common_net.c', 200, 220, 'struct ibv_wc wc; ibv_poll_cq(cq, 1, &wc);'),
        1000
    ),
    new RDMAStep(
        'dp-5-remote-ready',
        '远端数据可用',
        '远端内存中已收到数据，远端应用可以读取',
        new CodeMapping('src/rdma_client.c', 280, 300, '// Remote data is now available in memory'),
        800
    ),
    new RDMAStep(
        'dp-6-recv-prep',
        '准备Recv WR',
        '准备接收工作请求，设置接收缓冲区',
        new CodeMapping('src/rdma_common_net.c', 320, 340, 'struct ibv_recv_wr rr; rr.sg_list = ...;'),
        800
    ),
    new RDMAStep(
        'dp-7-post-recv',
        'Post Recv WR',
        '将接收工作请求投递到RQ(Receive Queue)',
        new CodeMapping('src/rdma_common_net.c', 350, 370, 'ibv_post_recv(qp, &rr, &bad_wr);'),
        800
    ),
    new RDMAStep(
        'dp-8-complete',
        '数据传输完成',
        '完整的单向RDMA Write数据传输过程结束',
        new CodeMapping('src/rdma_common_net.c', 400, 420, '// Data transfer cycle complete'),
        600
    ),
];

// ============ 场景定义 ============
const QPCreationScenario = new Scenario(
    'qp-creation',
    'QP创建流程',
    '演示从受保护域、完成队列到Queue Pair创建的完整过程',
    QPCreationSteps
);

const DataPlaneScenario = new Scenario(
    'data-plane',
    '数据面流程',
    '演示RDMA Write单向通信中从发送到接收的完整数据面流程',
    DataPlaneSteps
);

// 场景映射
const SCENARIOS = {
    'qp-creation': QPCreationScenario,
    'data-plane': DataPlaneScenario,
};

// 获取所有场景
function getAllScenarios() {
    return Object.values(SCENARIOS);
}

// 获取特定场景
function getScenario(scenarioId) {
    const ScenarioClass = SCENARIOS[scenarioId];
    if (!ScenarioClass) {
        console.error('Unknown scenario:', scenarioId);
        return null;
    }
    return new ScenarioClass();
}
