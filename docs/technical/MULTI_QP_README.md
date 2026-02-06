# RoCEv2 多QP改造指南

## 概述

本项目已成功改造为支持**多Queue Pair (QP)**模式，允许在单个TCP连接中创建和管理多个QP，用于并行的RDMA数据传输。

## 关键改造点

### 1. 结构体改造 (`rdma_common.h`)

#### 资源结构体变化
```c
/* 旧结构 */
struct ibv_qp *qp;              /* 单个QP */

/* 新结构 */
struct ibv_qp **qp_list;        /* QP指针数组 */
uint32_t num_qp;                /* QP数量 */
```

#### 新增配置
```c
#define DEFAULT_NUM_QP 4        /* 默认创建4个QP */
#define MAX_QP 16               /* 最多支持16个QP */
#define CQ_SIZE 256             /* CQ大小扩大以支持多QP */
```

#### 多QP连接信息结构
```c
struct cm_con_data_multi_t {
    uint32_t num_qp;                    /* QP数量 */
    struct cm_con_data_t qp_data[MAX_QP]; /* 多个QP的连接信息 */
} __attribute__((packed));
```

### 2. API改造 (`rdma_common.h`)

#### 新增函数

**创建多QP**
```c
int create_qp_list(struct rdma_resources *res);
```

**修改多QP状态**
```c
int modify_qp_list_to_init(struct rdma_resources *res);
int modify_qp_list_to_rtr(struct rdma_resources *res,
                          struct cm_con_data_t *remote_con_data);
int modify_qp_list_to_rts(struct rdma_resources *res);
```

**多QP网络同步**
```c
int sock_sync_data_multi(int sock,
                         struct cm_con_data_t *local_con_data,
                         uint32_t local_num_qp,
                         struct cm_con_data_t *remote_con_data,
                         uint32_t *remote_num_qp);
```

**单QP操作（新）**
```c
int post_receive_qp(struct rdma_resources *res, uint32_t qp_idx);
int post_receive_all(struct rdma_resources *res);
int post_send_qp(struct rdma_resources *res, uint32_t qp_idx, enum ibv_wr_opcode opcode);
```

**状态查询**
```c
int print_qp_state(struct rdma_resources *res, uint32_t qp_idx, const char *title);
```

### 3. 初始化改造

#### 函数签名变化
```c
/* 旧 */
int init_rdma_resources(struct rdma_resources *res,
                        const char *dev_name,
                        uint8_t ib_port,
                        int gid_idx);

/* 新 */
int init_rdma_resources(struct rdma_resources *res,
                        const char *dev_name,
                        uint8_t ib_port,
                        int gid_idx,
                        uint32_t num_qp);  /* 新增参数 */
```

#### QP创建流程
1. 调用 `init_rdma_resources()` 分配基础资源和QP数组
2. 调用 `create_qp_list()` 创建多个QP（使用共享CQ）
3. 调用 `modify_qp_list_to_init()` 初始化所有QP
4. 交换远端QP信息
5. 调用 `modify_qp_list_to_rtr()` 配置RTR
6. 调用 `modify_qp_list_to_rts()` 转到RTS

## 使用方式

### 命令行参数

#### 服务端
```bash
./build/rdma_server [device_name] [port] [gid_idx] [num_qp]
```

示例：
```bash
./build/rdma_server rxe0 18515 1 4
```

参数说明：
- `device_name`: RDMA设备名称（可选，默认自动选择）
- `port`: TCP端口号（可选，默认18515）
- `gid_idx`: GID索引（可选，默认1）
- `num_qp`: 创建的QP数量（可选，默认4）

#### 客户端
```bash
./build/rdma_client <server_ip> [device_name] [port] [gid_idx] [num_qp]
```

示例：
```bash
./build/rdma_client 10.0.134.5 rxe0 18515 1 4
```

### 实际运行

**终端1 - 运行服务端（4个QP）**
```bash
./build/rdma_server rxe0 18515 1 4
```

输出示例：
```
========== 准备本地连接信息 ==========
本地QP[0]连接信息:
  - QP号: 0x000001
  - LID: 0xc0a2
...
本地QP[3]连接信息:
  - QP号: 0x000004
  - LID: 0xc0a2
  - GID: ...
```

**终端2 - 运行客户端（4个QP）**
```bash
./build/rdma_client 10.0.134.5 rxe0 18515 1 4
```

## 多QP工作流程

### 阶段1：资源初始化
- 分配PD、MR、共享CQ
- 分配QP数组（支持MAX_QP个）

### 阶段2：QP创建与初始化
```
QP0, QP1, QP2, QP3 创建
        ↓
全部转到 INIT 状态
        ↓
等待远端QP信息
```

### 阶段3：TCP元数据交换（多QP）

协议：
```
服务端: 发送num_qp (4字节)
      发送cm_con_data_t[0..num_qp-1]  (num_qp × 32字节)

客户端: 接收num_qp
      接收cm_con_data_t[0..num_qp-1]
```

### 阶段4：建立RDMA连接

对**每个QP_i**：
```
QP_i: INIT → RTR (使用remote_con_data[i])
QP_i: RTR → RTS
```

### 阶段5：多QP数据传输

**服务端：**
```c
post_receive_all(&res);           /* 对所有QP投递Receive */
wait for TCP sync signal
poll_completion(&res, num_qp);    /* 等待num_qp个完成 */
post_send_qp for each QP
poll_completion(&res, num_qp);
```

**客户端：**
```c
post_receive_all(&res);
wait for TCP sync signal from server
post_send_qp for each QP
poll_completion(&res, num_qp);    /* 等待所有发送完成 */
poll_completion(&res, num_qp);    /* 等待所有接收完成 */
```

## 重要概念

### Shared vs. Per-QP

| 资源 | 单个还是多个 | 备注 |
|------|-----------|------|
| Completion Queue (CQ) | **单个共享** | 所有QP使用同一CQ |
| Memory Region (MR) | **单个共享** | 所有QP访问同一缓冲区 |
| Protection Domain (PD) | **单个** | 固定 |
| Queue Pair (QP) | **多个** | 每个QP独立 |
| Send/Receive Queue | 每个QP独立 | SQ和RQ绑定到QP |

### Work Request ID (wr_id)

在多QP模式中，`wr_id`用于识别完成事件来自哪个QP：
```c
post_receive_qp(res, i):
    rr.wr_id = i;  /* 记录QP索引 */

post_send_qp(res, i, opcode):
    sr.wr_id = i;

/* 轮询完成时 */
if (ibv_poll_cq(res->cq, 1, &wc) > 0) {
    uint32_t qp_index = wc.wr_id;  /* 获取QP索引 */
}
```

## 兼容性

### 单QP模式仍可用

虽然改造为多QP架构，但仍支持单QP使用：
```bash
./build/rdma_server rxe0 18515 1 1  /* 创建1个QP */
./build/rdma_client 10.0.134.5 rxe0 18515 1 1
```

旧函数仍然可用，只是在内部使用 `qp_list[0]`：
- `create_qp()` → `create_qp_list()`（num_qp=1）
- `modify_qp_to_init()` → `modify_qp_list_to_init()`（修改第一个QP）

## 性能考虑

### 吞吐量
- 多QP可以**并行**处理多条数据流
- CQ轮询会排队处理完成事件，但通常性能良好

### 延迟
- 共享CQ可能导致轻微延迟增加（多个WC处理）
- 但单个CQ比多个CQ的争用更少

### 内存
- 每增加一个QP：约1-2KB额外内存（SQ/RQ结构）
- CQ大小固定为256（与QP数量无关）

## 故障排查

### QP数量不匹配
```
警告: 远端QP数量(4)与本端不匹配(2)
```
解决：确保客户端和服务端指定相同的QP数量

### CQ溢出
```
错误: Poll CQ失败
```
原因：CQ_SIZE(256)不足
解决：增加 `#define CQ_SIZE` 或减少 `MAX_WR`

### RNR错误
```
错误: 完成状态异常: RNR (Receiver Not Ready)
```
原因：未对所有QP投递Receive请求
解决：确保调用 `post_receive_all()` 或对每个QP调用 `post_receive_qp()`

## 代码示例

### 创建4个QP的完整流程

```c
struct rdma_resources res;
struct cm_con_data_t *local_data, *remote_data;
uint32_t remote_num_qp;

/* 初始化资源（4个QP） */
init_rdma_resources(&res, "rxe0", 1, 1, 4);

/* 创建QP */
create_qp_list(&res);
modify_qp_list_to_init(&res);

/* 准备连接信息 */
for (i = 0; i < res.num_qp; i++) {
    local_data[i].qp_num = res.qp_list[i]->qp_num;
    local_data[i].lid = res.port_attr.lid;
    memcpy(local_data[i].gid, &my_gid, 16);
}

/* 交换QP信息（通过TCP） */
sock_sync_data_multi(sock, local_data, res.num_qp,
                     remote_data, &remote_num_qp);

/* 建立RDMA连接 */
modify_qp_list_to_rtr(&res, remote_data);
modify_qp_list_to_rts(&res);

/* 数据传输 */
post_receive_all(&res);
poll_completion(&res, res.num_qp, NULL);
```

## 扩展建议

### 未来改进方向

1. **独立CQ模式**：每个QP使用独立CQ，提高并行度
2. **Event驱动**：使用CQ事件代替轮询，降低CPU占用
3. **NUMA感知**：线程绑定和内存分配考虑NUMA
4. **动态QP创建**：运行时动态增减QP
5. **负载均衡**：WR分配和轮询优化

## 参考资源

- [InfiniBand Verbs API](https://github.com/linux-rdma/rdma-core)
- [RoCEv2规范](https://www.infinibandta.org/)
- [本项目详细说明](CLAUDE.md)
- [故障排查指南](TROUBLESHOOTING.md)

