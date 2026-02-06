# 多QP快速参考 (Quick Reference)

## 编译
```bash
make clean && make
```

## 运行示例

### 4个QP的标准配置

**终端1 - 服务端**
```bash
./build/rdma_server rxe0 18515 1 4
```

**终端2 - 客户端**
```bash
./build/rdma_client 10.0.134.5 rxe0 18515 1 4
```

## 命令行参数

### 服务端
```
./build/rdma_server [device] [port] [gid_idx] [num_qp]
   device   : RDMA设备名称 (可选，默认自动)
   port     : TCP端口 (可选，默认18515)
   gid_idx  : GID索引 (可选，默认1)
   num_qp   : QP数量 (可选，默认4)
```

### 客户端
```
./build/rdma_client <server_ip> [device] [port] [gid_idx] [num_qp]
   server_ip: 服务端IP (必需)
   device   : RDMA设备名称 (可选)
   port     : TCP端口 (可选)
   gid_idx  : GID索引 (可选)
   num_qp   : QP数量 (可选，必须与服务端一致)
```

## 配置常见组合

### 单QP (兼容旧模式)
```bash
./build/rdma_server rxe0 18515 1 1
./build/rdma_client 10.0.134.5 rxe0 18515 1 1
```

### 双QP
```bash
./build/rdma_server rxe0 18515 1 2
./build/rdma_client 10.0.134.5 rxe0 18515 1 2
```

### 四QP (推荐)
```bash
./build/rdma_server rxe0 18515 1 4
./build/rdma_client 10.0.134.5 rxe0 18515 1 4
```

### 八QP (高性能)
```bash
./build/rdma_server rxe0 18515 1 8
./build/rdma_client 10.0.134.5 rxe0 18515 1 8
```

### 最大QP (16)
```bash
./build/rdma_server rxe0 18515 1 16
./build/rdma_client 10.0.134.5 rxe0 18515 1 16
```

## 核心代码改造 (API Changes)

### 旧API → 新API 映射

| 用途 | 旧函数 | 新函数 | 备注 |
|------|--------|--------|------|
| 创建QP | `create_qp()` | `create_qp_list()` | 创建num_qp个 |
| INIT | `modify_qp_to_init()` | `modify_qp_list_to_init()` | 全部转INIT |
| RTR | `modify_qp_to_rtr(res, con)` | `modify_qp_list_to_rtr(res, con)` | con[]数组 |
| RTS | `modify_qp_to_rts()` | `modify_qp_list_to_rts()` | 全部转RTS |
| 同步 | `sock_sync_data()` | `sock_sync_data_multi()` | 交换多QP信息 |
| Recv | `post_receive()` | `post_receive_qp(i)` 或 `post_receive_all()` | - |
| Send | `post_send()` | `post_send_qp(i, op)` 或 循环 | - |
| Poll | `poll_completion(res, n)` | `poll_completion(res, n, NULL)` | 新增qp_idx参数 |
| 状态 | `print_qp_state(res, title)` | `print_qp_state(res, i, title)` | 需指定QP索引 |

### 旧代码改造示例

**旧：单QP**
```c
create_qp(&res);
modify_qp_to_init(&res);
modify_qp_to_rtr(&res, &remote_con);
modify_qp_to_rts(&res);
post_receive(&res);
post_send(&res, IBV_WR_SEND);
poll_completion(&res, 2);
```

**新：多QP**
```c
/* num_qp=4 */
create_qp_list(&res);
modify_qp_list_to_init(&res);
modify_qp_list_to_rtr(&res, remote_con_array);
modify_qp_list_to_rts(&res);
post_receive_all(&res);
for (i = 0; i < 4; i++) post_send_qp(&res, i, IBV_WR_SEND);
poll_completion(&res, 4, NULL);  /* 4个完成 */
```

## 数据结构变化

### 资源结构
```c
/* 旧 */
struct ibv_qp *qp;           /* 单个QP */

/* 新 */
struct ibv_qp **qp_list;     /* QP数组 */
uint32_t num_qp;             /* QP数量 */
```

### 连接信息
```c
/* 旧 */
struct cm_con_data_t local_con;
struct cm_con_data_t remote_con;

/* 新 */
struct cm_con_data_t local_con[MAX_QP];   /* 数组 */
struct cm_con_data_t remote_con[MAX_QP];
uint32_t num_qp;
```

## Work Request ID (wr_id) 映射

在多QP中，wr_id用于识别完成事件的来源QP：

```c
/* 发送/接收时设置wr_id = QP索引 */
post_receive_qp(res, 2):  → rr.wr_id = 2
post_send_qp(res, 3, op): → sr.wr_id = 3

/* 轮询完成时读取wr_id */
poll_completion(res, n, qp_idx):
    if (ibv_poll_cq(res->cq, 1, &wc) > 0)
        *qp_idx = (int)wc.wr_id;  // 得到QP索引
```

## 关键限制

| 限制 | 值 | 备注 |
|------|-----|------|
| 最大QP数 | 16 | 可通过 `#define MAX_QP` 修改 |
| CQ大小 | 256 | 可通过 `#define CQ_SIZE` 修改 |
| 最大WR | 16 | 每个QP的最大WR数 |
| 缓冲区大小 | 4096 | DEFAULT_MSG_SIZE |

## 性能参数

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| num_qp | 4-8 | 兼顾性能和复杂度 |
| CQ_SIZE | 256 | 足够处理num_qp×max_wr |
| timeout | 14 | QP超时参数(~1.4ms) |
| retry_cnt | 7 | 重试次数 |
| rnr_retry | 7 | RNR重试次数 |

## 编译选项

```makefile
# src/Makefile
CFLAGS = -Wall -Wextra -O2 -g
LDFLAGS = -libverbs -lpthread

# 编译
gcc $(CFLAGS) -c src/rdma_common.c -o build/rdma_common.o
gcc $(CFLAGS) -c src/rdma_server.c -o build/rdma_server.o
gcc build/rdma_common.o build/rdma_server.o -o build/rdma_server $(LDFLAGS)

# 或直接
make
make rebuild
make clean
```

## 错误排查速查表

| 错误 | 原因 | 解决 |
|------|------|------|
| `QP数量不匹配` | 客户端/服务端QP数不同 | 两端指定相同num_qp |
| `Poll CQ超时` | 没有投递Receive或CQ满 | 调用post_receive_all() |
| `RNR错误` | 接收方未准备好 | 确保先post_receive_all() |
| `连接超时` | TCP连接失败 | 检查IP地址和防火墙 |
| `无RDMA设备` | 没有RDMA NIC或Soft-RoCE | `sudo modprobe rdma_rxe` |

## 配置Soft-RoCE

```bash
# 检查网卡
ip link show

# 加载模块
sudo modprobe rdma_rxe

# 创建RoCE设备 (绑定到eth0)
sudo rdma link add rxe0 type rxe netdev eth0

# 验证
ibv_devices
ibv_devinfo -d rxe0

# 查看GID
show_gids.sh
```

## 单机测试 (localhost)

```bash
# 如果服务端和客户端在同一机器
./build/rdma_server rxe0 18515 1 4 &
sleep 1
./build/rdma_client 127.0.0.1 rxe0 18515 1 4
```

## 网络测试 (两台机器)

```bash
# 机器A (10.0.0.1) - 服务端
./build/rdma_server rxe0 18515 1 4

# 机器B (10.0.0.2) - 客户端
./build/rdma_client 10.0.0.1 rxe0 18515 1 4
```

## 调试输出

程序会自动输出详细的步骤信息：

```
========== 步骤1: 获取RDMA设备列表 ==========
========== 步骤2: 选择RDMA设备 ==========
...
========== 准备本地连接信息 ==========
本地QP[0]连接信息:
  - QP号: 0x000001
  - LID: 0xc0a2
  - GID: ...
...
========== 修改多个QP状态 RESET->INIT ==========
  QP[0]: RESET -> INIT
  QP[1]: RESET -> INIT
...
```

## 文档导航

- **[MULTI_QP_README.md](MULTI_QP_README.md)** - 详细说明文档
- **[MULTI_QP_SUMMARY.md](MULTI_QP_SUMMARY.md)** - 改造总结
- **[MULTI_QP_QUICK_REFERENCE.md](MULTI_QP_QUICK_REFERENCE.md)** - 本文件
- **[README.md](README.md)** - 原项目说明
- **[CLAUDE.md](CLAUDE.md)** - 原架构文档

## 常用命令

```bash
# 编译
make

# 清理
make clean

# 重建
make rebuild

# 查看设备
ibv_devices
ibv_devinfo -d rxe0

# 单QP测试
./build/rdma_server rxe0 18515 1 1 &
sleep 1
./build/rdma_client 127.0.0.1 rxe0 18515 1 1

# 4QP测试
./build/rdma_server rxe0 18515 1 4 &
sleep 1
./build/rdma_client 127.0.0.1 rxe0 18515 1 4

# 16QP测试（最大）
./build/rdma_server rxe0 18515 1 16 &
sleep 1
./build/rdma_client 127.0.0.1 rxe0 18515 1 16
```

## 预期输出示例 (4 QP)

```
========== 准备本地连接信息 ==========
本地QP[0]连接信息:
  - QP号: 0x000001
本地QP[1]连接信息:
  - QP号: 0x000002
本地QP[2]连接信息:
  - QP号: 0x000003
本地QP[3]连接信息:
  - QP号: 0x000004

========== 修改多个QP状态 RESET->INIT ==========
  QP[0]: RESET -> INIT
  QP[1]: RESET -> INIT
  QP[2]: RESET -> INIT
  QP[3]: RESET -> INIT
成功修改 4 个QP到INIT状态

========== 修改多个QP状态 INIT->RTR ==========
  QP[0]: INIT -> RTR (远端QP: 0x000001, 远端LID: 0xc0a2)
  QP[1]: INIT -> RTR (远端QP: 0x000002, 远端LID: 0xc0a2)
  QP[2]: INIT -> RTR (远端QP: 0x000003, 远端LID: 0xc0a2)
  QP[3]: INIT -> RTR (远端QP: 0x000004, 远端LID: 0xc0a2)
成功修改 4 个QP到RTR状态

========== 修改多个QP状态 RTR->RTS ==========
  QP[0]: RTR -> RTS
  QP[1]: RTR -> RTS
  QP[2]: RTR -> RTS
  QP[3]: RTR -> RTS
成功修改 4 个QP到RTS状态

========== 开始多QP RDMA数据传输 ==========
投递所有QP的Receive请求到RQ...
等待接收 4 个QP的数据...
投递所有QP的Send请求...
========== 发送成功 ==========
等待接收 4 个QP的服务端回复...
========== 接收成功 ==========
收到服务端回复: 服务端收到，这是回复消息！
========== 多QP RDMA通信完成 ==========
```

---
最后更新: 2026-02-06
版本: 1.0 - 多QP支持完成版
