# 通用模块规范 (Common Module)

**文件**: `src/rdma_common.h` 和 `src/rdma_common.c`  
**职责**: RDMA基础设施，为所有其他模块提供支持  
**关键概念**: QP状态机、生命周期管理、多QP支持

## 📌 模块概述

通用模块是整个RoCEv2项目的核心基础设施。它负责：
1. **RDMA资源管理** - 初始化和清理所有RDMA对象
2. **QP生命周期** - 控制QP的状态转移（RESET → INIT → RTR → RTS）
3. **工作请求投递** - Post send/receive WR到QP的SQ和RQ
4. **完成事件处理** - 从CQ轮询工作完成
5. **多QP支持** - 管理1-16个共享CQ的QP

## 🏗️ 核心数据结构

### struct rdma_resources
```c
struct rdma_resources {
    /* 设备和上下文 */
    struct ibv_device *ib_dev;
    struct ibv_context *context;
    struct ibv_device_attr device_attr;
    struct ibv_port_attr port_attr;
    
    /* 保护域和内存区域 */
    struct ibv_pd *pd;
    struct ibv_mr *mr;
    char buf[DEFAULT_MSG_SIZE];
    
    /* 队列和完成 */
    struct ibv_cq *cq;
    struct ibv_qp **qp_list;     /* 多QP支持 */
    uint32_t num_qp;              /* QP数量 */
    
    /* 元数据 */
    uint16_t lid;
    union ibv_gid gid;
};
```

### struct cm_con_data_t
通过TCP交换的QP连接元数据（单QP）
```c
struct cm_con_data_t {
    uint32_t qp_num;
    uint16_t lid;
    uint8_t gid[16];
} __attribute__((packed));
```

### struct cm_con_data_multi_t
多QP模式下的连接数据结构
```c
struct cm_con_data_multi_t {
    uint32_t num_qp;
    struct cm_con_data_t qp_data[MAX_QP];
};
```

## 🔌 暴露的公开接口

### 初始化和清理

#### init_rdma_resources()
初始化所有RDMA资源

```c
/**
 * 初始化RDMA资源并创建首个QP
 *
 * @param device_name IB设备名（如"rxe0"），NULL表示使用第一个可用设备
 * @param ib_port     使用的端口号（1或2）
 * @param gid_index   GID表索引，RoCEv2使用 >= 1
 * @param num_qp      创建的QP数量（1-MAX_QP）
 * @return            成功返回指向rdma_resources的指针，失败返回NULL
 *
 * @details
 * - 分配并初始化rdma_resources结构
 * - 打开RDMA设备并查询属性
 * - 创建Protection Domain (PD)
 * - 注册内存区域(MR)，大小为DEFAULT_MSG_SIZE (4096字节)
 * - 创建大小为CQ_SIZE (256)的完成队列
 * - 如果num_qp=1，创建第一个QP；否则调用create_qp_list()
 *
 * @pre 系统中必须存在可用的RDMA设备
 * @post 返回的资源已初始化但QP仍处于RESET状态
 *
 * @note
 * - 对于RoCEv2，GID索引通常是1（索引0为IB模式）
 * - 返回的资源必须用cleanup_rdma_resources()释放
 * - MR分配4KB缓冲区，用于所有send/receive操作
 *
 * @see cleanup_rdma_resources() 用于释放资源
 * @see create_qp_list() 用于创建多个QP
 * @see modify_qp_to_init() QP初始化前的准备
 */
struct rdma_resources *init_rdma_resources(
    const char *device_name,
    uint8_t ib_port,
    uint32_t gid_index,
    uint32_t num_qp);

int cleanup_rdma_resources(struct rdma_resources *res);
```

### QP管理

#### create_qp() / create_qp_list()
```c
/**
 * 创建单个QP到qp_list[0]
 *
 * @param res      RDMA资源结构
 * @return         成功返回0，失败返回非零
 *
 * @note 用于单QP模式或多QP中的第一个QP
 * @see create_qp_list() 用于创建多个QP
 */
int create_qp(struct rdma_resources *res);

/**
 * 创建num_qp个QP共享单个CQ
 *
 * @param res      RDMA资源结构，res->num_qp必须已设置
 * @return         成功返回0，失败返回非零
 *
 * @details
 * - 根据res->num_qp循环调用create_qp()
 * - 所有QP共享res->cq和res->pd
 * - 每个QP有独立的SQ和RQ
 *
 * @note 多QP关键函数，支持1-16个并发QP
 * @see create_qp() 创建单个QP
 */
int create_qp_list(struct rdma_resources *res);
```

### QP状态转移

#### modify_qp_to_init/rtr/rts()
QP必须按RESET → INIT → RTR → RTS的顺序转移状态。

```c
/**
 * 将QP从RESET状态转移到INIT状态
 *
 * @param res      RDMA资源结构
 * @param qp_idx   目标QP的索引（多QP模式）
 * @return         成功返回0，失败返回非零
 *
 * @details
 * - 设置端口号
 * - 配置访问标志（LOCAL_WRITE | REMOTE_WRITE | REMOTE_READ）
 * - 初始化QP参数
 *
 * @pre QP处于RESET状态
 * @post QP转移到INIT状态
 *
 * @note 这是QP生命周期的第一步
 * @see modify_qp_to_rtr() 下一步转移
 */
int modify_qp_to_init(struct rdma_resources *res, uint32_t qp_idx);

/**
 * 将QP从INIT状态转移到RTR (Ready to Receive) 状态
 *
 * @param res            RDMA资源结构
 * @param remote_con_data 远端QP连接信息（包含remote qp_num, lid, gid）
 * @param qp_idx         目标QP的索引
 * @return               成功返回0，失败返回非零
 *
 * @details
 * - 配置远端QP信息（QP Number、LID）
 * - 创建地址处理器属性(AH attr)
 * - 对于RoCEv2：设置is_global=1，配置GRH，设置hop_limit=1
 * - 计算PSN (Packet Sequence Number)
 *
 * @pre QP处于INIT状态，已收到远端的连接信息
 * @post QP转移到RTR状态，可接收数据包
 *
 * @note
 * - RTR状态表示QP已准备好接收数据
 * - RoCEv2模式下必须正确配置GID索引
 * - 此时还不能发送数据，需继续转移到RTS
 *
 * @see modify_qp_to_rts() RTR后的下一步转移
 */
int modify_qp_to_rtr(struct rdma_resources *res,
                      const struct cm_con_data_t *remote_con_data,
                      uint32_t qp_idx);

/**
 * 将QP从RTR状态转移到RTS (Ready to Send) 状态
 *
 * @param res      RDMA资源结构
 * @param qp_idx   目标QP的索引
 * @return         成功返回0，失败返回非零
 *
 * @details
 * - 设置超时时间（典型值14，约为2^14 * 4.96µs ≈ 80ms）
 * - 配置重试次数（typica 7）
 * - 设置RNR重试次数（RNR = Receiver Not Ready）
 * - 初始化发送PSN
 *
 * @pre QP处于RTR状态
 * @post QP转移到RTS状态，可以发送数据
 *
 * @note
 * - RTS是QP的最终工作状态
 * - 在此之后可以投递send WR
 * - 超时和重试参数影响性能和可靠性
 *
 * @see modify_qp_to_rtr() 前一步转移
 */
int modify_qp_to_rts(struct rdma_resources *res, uint32_t qp_idx);

/**
 * 批量将所有QP转移到INIT状态
 *
 * @param res      RDMA资源结构
 * @return         成功返回0，失败返回非零
 *
 * @note 多QP专用函数，循环调用modify_qp_to_init()
 */
int modify_qp_list_to_init(struct rdma_resources *res);

/**
 * 批量将所有QP转移到RTR状态
 *
 * @param res             RDMA资源结构
 * @param remote_con_data 远端QP数组
 * @return                成功返回0，失败返回非零
 *
 * @details
 * - 循环调用modify_qp_to_rtr()，为每个QP传递对应的remote_con_data[i]
 *
 * @note 多QP专用函数
 */
int modify_qp_list_to_rtr(struct rdma_resources *res,
                           const struct cm_con_data_t *remote_con_data);

/**
 * 批量将所有QP转移到RTS状态
 *
 * @param res      RDMA资源结构
 * @return         成功返回0，失败返回非零
 *
 * @note 多QP专用函数，循环调用modify_qp_to_rts()
 */
int modify_qp_list_to_rts(struct rdma_resources *res);
```

### 网络同步

#### sock_sync_data() / sock_sync_data_multi()
```c
/**
 * 通过TCP socket进行单QP连接信息交换
 *
 * @param sock               TCP socket文件描述符
 * @param local_con_data    本地QP连接信息
 * @param remote_con_data   接收远端QP连接信息的指针
 * @param is_server         是否为服务端（影响收发顺序）
 * @return                  成功返回0，失败返回非零
 *
 * @details
 * - 如果is_server为真：先接收(4字节flag) → 发送local_data → 接收remote_data
 * - 如果is_server为假：先发送(4字节flag) → 发送local_data → 接收remote_data
 *
 * @note 用于单QP模式，保持向后兼容
 * @see sock_sync_data_multi() 多QP模式使用
 */
int sock_sync_data(int sock,
                   const struct cm_con_data_t *local_con_data,
                   struct cm_con_data_t *remote_con_data,
                   int is_server);

/**
 * 通过TCP socket进行多QP连接信息交换
 *
 * @param sock               TCP socket文件描述符
 * @param local_con_data    本地QP数组(res->num_qp项)
 * @param remote_con_data   接收远端QP数组的指针
 * @param res                RDMA资源结构(用于获取num_qp)
 * @param is_server         是否为服务端
 * @return                  成功返回0，失败返回非零
 *
 * @details
 * - 协议: [发送num_qp(4字节)] → [发送cm_con_data_t数组] →
 *         [接收remote_num_qp] → [接收remote数组]
 * - 验证remote_num_qp == res->num_qp，否则返回错误
 *
 * @note 多QP关键函数，扩展了标准TCP同步协议
 * @see sock_sync_data() 单QP版本
 */
int sock_sync_data_multi(int sock,
                         const struct cm_con_data_t *local_con_data,
                         struct cm_con_data_t *remote_con_data,
                         struct rdma_resources *res,
                         int is_server);
```

### 工作请求投递

#### post_receive() / post_receive_qp() / post_receive_all()
```c
/**
 * 投递接收WR到第一个QP (qp_list[0])
 *
 * @param res      RDMA资源结构
 * @return         成功返回0，失败返回非零
 *
 * @details
 * - 为内存区域内的缓冲区创建接收WR
 * - 设置wr_id为0（单QP模式）
 * - 使用res->mr的lkey
 *
 * @note 单QP兼容函数，内部调用post_receive_qp(res, 0)
 * @see post_receive_qp() 指定QP版本
 * @see post_receive_all() 所有QP版本
 */
int post_receive(struct rdma_resources *res);

/**
 * 投递接收WR到指定QP
 *
 * @param res      RDMA资源结构
 * @param qp_idx   目标QP的索引
 * @return         成功返回0，失败返回非零
 *
 * @details
 * - 为qp_list[qp_idx]创建接收WR
 * - 设置wr_id为qp_idx（用于完成事件路由）
 * - 配置缓冲区的SGE信息
 *
 * @pre qp_idx < res->num_qp
 * @note 多QP关键函数，用于为特定QP投递接收请求
 * @see post_receive_all() 批量投递
 */
int post_receive_qp(struct rdma_resources *res, uint32_t qp_idx);

/**
 * 为所有QP投递接收WR
 *
 * @param res      RDMA资源结构
 * @return         成功返回0，失败返回非零
 *
 * @details
 * - 循环调用post_receive_qp(res, i)对每个QP（i=0到num_qp-1）
 *
 * @note 多QP专用函数，常见模式是在发送前对所有QP投递接收
 * @see post_receive_qp() 单个QP版本
 */
int post_receive_all(struct rdma_resources *res);
```

#### post_send() / post_send_qp()
```c
/**
 * 投递发送WR到第一个QP (qp_list[0])
 *
 * @param res          RDMA资源结构
 * @param opcode       send操作类型(IBV_WR_SEND等)
 * @return             成功返回0，失败返回非零
 *
 * @details
 * - 为内存区域内的缓冲区创建发送WR
 * - 设置wr_id为0（单QP模式）
 * - IBV_SEND_SIGNALED标志确保产生完成事件
 *
 * @note 单QP兼容函数，内部调用post_send_qp(res, 0, opcode)
 * @see post_send_qp() 指定QP版本
 */
int post_send(struct rdma_resources *res, enum ibv_wr_opcode opcode);

/**
 * 投递发送WR到指定QP
 *
 * @param res          RDMA资源结构
 * @param qp_idx       目标QP的索引
 * @param opcode       send操作类型(IBV_WR_SEND, IBV_WR_RDMA_WRITE等)
 * @return             成功返回0，失败返回非零
 *
 * @details
 * - 为qp_list[qp_idx]创建发送WR
 * - 设置wr_id为qp_idx（用于完成事件路由）
 * - IBV_SEND_SIGNALED标志确保产生完成事件
 * - 支持多种操作类型
 *
 * @pre
 * - qp_idx < res->num_qp
 * - QP必须处于RTS状态
 * - 对端QP必须已投递接收WR
 *
 * @note
 * - 多QP关键函数
 * - wr_id字段用于在poll_completion中标识来源QP
 *
 * @see post_receive_qp() 对端接收操作
 * @see poll_completion() 事件轮询
 */
int post_send_qp(struct rdma_resources *res, uint32_t qp_idx, 
                  enum ibv_wr_opcode opcode);
```

### 完成事件处理

#### poll_completion()
```c
/**
 * 从完成队列轮询工作完成事件
 *
 * @param res              RDMA资源结构
 * @param num_completions  期望收到的完成数量
 * @param qp_idx           返回完成事件的QP索引指针（多QP模式）
 * @return                 成功返回实际获得的完成数，失败返回-1
 *
 * @details
 * - 轮询res->cq直到收集num_completions个工作完成事件
 * - 使用5秒超时防止无限等待
 * - 检查每个WC的status字段
 * - 如果qp_idx非NULL，从第一个WC的wr_id读取QP索引
 * - 支持多个连续的poll_completion调用来处理多个事件
 *
 * @return
 * - 正数: 实际收集的完成数
 * - 0: 超时或无事件
 * - -1: 错误或工作完成失败
 *
 * @pre 至少有一个工作请求已投递到CQ
 *
 * @note
 * - wr_id字段用于标识是哪个QP产生的完成
 * - 多QP模式下，wr_id存储投递时的qp_idx
 * - 可多次调用以获取多个完成事件
 *
 * @see post_send_qp() 投递send WR时设置wr_id
 * @see post_receive_qp() 投递receive WR时设置wr_id
 */
int poll_completion(struct rdma_resources *res, int num_completions, 
                    int *qp_idx);
```

### 诊断和信息

#### print_qp_state()
```c
/**
 * 打印指定QP的当前状态信息
 *
 * @param res      RDMA资源结构
 * @param qp_idx   要查询的QP索引
 * @param title    打印信息的标题前缀
 *
 * @details
 * - 查询QP属性
 * - 打印QP号、状态、端口等信息
 * - 用于调试和诊断
 *
 * @pre qp_idx < res->num_qp
 *
 * @note 多QP模式下可独立查询每个QP的状态
 */
void print_qp_state(struct rdma_resources *res, uint32_t qp_idx,
                    const char *title);
```

## 🔄 常见使用流程

### 单QP模式 (兼容模式)
```c
/* 初始化 */
struct rdma_resources *res = init_rdma_resources(
    "rxe0", 1, 1, 1);  /* num_qp = 1 */

/* QP状态转移 */
modify_qp_to_init(res, 0);
modify_qp_to_rtr(res, remote_data, 0);
modify_qp_to_rts(res, 0);

/* 数据传输 */
post_receive(res);  /* 实际调用post_receive_qp(res, 0) */
post_send(res, IBV_WR_SEND);  /* 实际调用post_send_qp(res, 0, ...) */
poll_completion(res, 1, NULL);

/* 清理 */
cleanup_rdma_resources(res);
```

### 多QP模式 (推荐)
```c
/* 初始化 */
struct rdma_resources *res = init_rdma_resources(
    "rxe0", 1, 1, 4);  /* num_qp = 4 */

/* 批量QP状态转移 */
modify_qp_list_to_init(res);
modify_qp_list_to_rtr(res, remote_data);  /* remote_data是数组 */
modify_qp_list_to_rts(res);

/* 数据传输 */
post_receive_all(res);  /* 为所有4个QP投递接收 */
for (int i = 0; i < 4; i++) {
    post_send_qp(res, i, IBV_WR_SEND);
}
poll_completion(res, 4, NULL);  /* 等待4个完成 */

/* 清理 */
cleanup_rdma_resources(res);
```

## ⚠️ 关键约束和注意事项

### QP状态机
- **必须**按 RESET → INIT → RTR → RTS 的顺序转移
- 跳过任何阶段会导致连接失败
- 不能回退状态

### RoCEv2 特定要求
- GID索引必须 >= 1（0通常是IB模式）
- 必须设置 `ah_attr.is_global = 1`
- 必须配置GRH (Global Routing Header)
- `ah_attr.grh.hop_limit` 通常设为1（L2网络）

### 多QP 特定约束
- 支持最多 MAX_QP (16) 个QP
- 所有QP共享单个CQ (大小256)
- 每个QP有独立的SQ和RQ
- wr_id 用于在完成事件中区分QP源

### 内存和超时
- MR大小为 DEFAULT_MSG_SIZE (4096字节)
- 所有send/receive数据必须在此范围内
- poll_completion 超时为5秒
- 接收WR必须在send之前投递（防止RNR错误）

## 📊 模块依赖

```
服务端 (rdma_server.c)
    ↓
通用模块 ← 客户端 (rdma_client.c)
```

## 🔧 配置常量

在 `rdma_common.h` 中定义：
- `DEFAULT_NUM_QP` = 4 （默认QP数）
- `MAX_QP` = 16 （最大QP数）
- `DEFAULT_MSG_SIZE` = 4096 （缓冲区大小）
- `CQ_SIZE` = 256 （完成队列大小）
- `DEFAULT_PORT` = 18515 （TCP端口）

---

**文档版本**: 1.0  
**最后更新**: 2026年2月6日  
**适用代码**: rdma_common.h/c  
**状态**: AI编程就绪 ✅
