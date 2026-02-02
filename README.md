# RoCEv2 学习项目

这是一个用于学习RoCEv2 (RDMA over Converged Ethernet v2) 通信流程的教学项目。通过详细注释的C语言代码，帮助你深入理解RDMA编程的每一个细节。

## 项目简介

本项目包含一个完整的RDMA客户端-服务端通信示例，使用RC (Reliable Connection) 传输类型，适用于Soft-RoCE (rxe) 和硬件RDMA网卡。

**核心特性：**
- 详细的中文注释，每个步骤都有说明
- 完整的RDMA编程流程展示
- 支持RoCEv2协议
- 简单易懂的代码结构

## 项目结构

```
RoCEv2_learn/
├── src/
│   ├── rdma_common.h      # 公共头文件和常量定义
│   ├── rdma_common.c      # 共享函数实现（生命周期、状态转换）
│   ├── rdma_server.c      # 服务端程序
│   └── rdma_client.c      # 客户端程序
├── build/                 # 编译输出目录
├── Makefile               # 编译脚本
├── diagnose.sh            # 诊断脚本（检查RDMA设备和GID配置）
├── show_gids.sh           # GID查看脚本
├── logs/                  # 运行日志目录
├── README.md              # 项目主文档
├── CLAUDE.md              # AI助手指导文档
├── QUICKFIX.md            # 快速修复指南
├── TROUBLESHOOTING.md     # 详细故障排除
├── QP_STATE_USAGE.md      # QP运行时状态查询说明
└── QP_STATE_USAGE.md      # QP状态转换使用指南
```

## 环境要求

### 软件依赖
- Linux操作系统
- GCC编译器
- libibverbs库（RDMA用户态库）
- 已配置的RDMA设备（硬件网卡或Soft-RoCE）

### 安装依赖
```bash
# Ubuntu/Debian
sudo apt-get install libibverbs-dev librdmacm-dev

# CentOS/RHEL
sudo yum install libibverbs-devel librdmacm-devel
```

### Soft-RoCE配置（如果没有硬件RDMA网卡）
```bash
# 加载RXE内核模块
sudo modprobe rdma_rxe

# 在网络接口上创建RXE设备（替换eth0为你的网卡名）
sudo rdma link add rxe0 type rxe netdev eth0

# 查看RDMA设备
ibv_devices
```

## 编译

```bash
# 编译所有程序
make

# 清理编译文件
make clean

# 重新编译
make rebuild

# 查看帮助
make help
```

编译成功后，可执行文件位于 `build/` 目录：
- `build/rdma_server` - 服务端程序
- `build/rdma_client` - 客户端程序

## 使用方法

### 1. 在服务端机器上运行服务端程序

```bash
# 基本用法（使用默认设备和端口18515）
./build/rdma_server

# 指定设备名
./build/rdma_server rxe0

# 指定设备名和端口
./build/rdma_server rxe0 18515

# 完整参数：设备名 端口 GID索引
./build/rdma_server rxe0 18515 1
```

**参数说明：**
- `设备名`: RDMA设备名称（如 rxe0, mlx5_0），不指定则使用默认设备
- `端口`: TCP监听端口，默认18515
- `GID索引`: GID表索引，RoCEv2通常使用1

### 2. 在客户端机器上运行客户端程序

```bash
# 必须指定服务端IP
./build/rdma_client 10.0.134.5

# 指定服务端IP和设备名
./build/rdma_client 10.0.134.5 rxe0

# 指定服务端IP、设备名和端口
./build/rdma_client 10.0.134.5 rxe0 18515

# 完整参数：服务端IP 设备名 端口 GID索引
./build/rdma_client 10.0.134.5 rxe0 18515 1
```

**参数说明：**
- `服务端IP`: 服务端的IP地址（必需）
- `设备名`: RDMA设备名称
- `端口`: 服务端监听的TCP端口
- `GID索引`: GID表索引

### 3. 查看运行结果

程序运行时会打印详细的步骤信息，帮助你理解整个RDMA通信流程。

**服务端输出示例：**
```
========================================
   RDMA服务端 - RoCEv2学习程序
========================================
设备: rxe0
TCP端口: 18515
GID索引: 1
========================================

========== 步骤1: 获取RDMA设备列表 ==========
找到 1 个RDMA设备

========== 步骤2: 选择RDMA设备 ==========
选择设备: rxe0

...（更多详细输出）
```

## RDMA通信流程详解

本项目演示了完整的RDMA RC (Reliable Connection) 通信流程：

### 阶段1: 资源初始化
1. **获取设备列表** - `ibv_get_device_list()`
2. **打开设备** - `ibv_open_device()`
3. **查询端口属性** - `ibv_query_port()`
4. **分配Protection Domain** - `ibv_alloc_pd()`
5. **注册Memory Region** - `ibv_reg_mr()`
6. **创建Completion Queue** - `ibv_create_cq()`
7. **创建Queue Pair** - `ibv_create_qp()`

### 阶段2: QP状态转换
QP必须经历以下状态转换才能进行通信：

```
RESET → INIT → RTR → RTS
```

- **RESET → INIT**: 初始化QP，设置端口和访问权限
- **INIT → RTR**: Ready to Receive，配置远端地址信息
- **RTR → RTS**: Ready to Send，可以发送和接收数据

### 阶段3: 连接建立
1. 服务端和客户端通过TCP socket交换连接信息：
   - QP号 (QP Number)
   - LID (Local ID)
   - GID (Global ID) - RoCEv2必需
2. 双方使用对方的信息完成QP状态转换

### 阶段4: 数据传输
1. **Post Receive**: 预先投递接收请求到RQ (Receive Queue)
2. **Post Send**: 投递发送请求到SQ (Send Queue)
3. **Poll CQ**: 轮询Completion Queue获取完成事件

### 关键概念说明

**Protection Domain (PD)**: 保护域，隔离不同应用的RDMA资源

**Memory Region (MR)**: 注册的内存区域，RDMA硬件可以直接访问
- lkey: 本地访问密钥
- rkey: 远程访问密钥（RDMA读写操作需要）

**Queue Pair (QP)**: 队列对，包含发送队列(SQ)和接收队列(RQ)

**Completion Queue (CQ)**: 完成队列，用于通知操作完成

**Work Request (WR)**: 工作请求，描述要执行的操作
- Send WR: 发送数据
- Receive WR: 接收数据
- RDMA Write WR: 远程写（本示例未使用）
- RDMA Read WR: 远程读（本示例未使用）

**GID (Global ID)**: 全局标识符，RoCEv2用于IP路由
- GID索引0: 通常是IB网络的GID
- GID索引1及以上: RoCEv2 GID（基于IPv4/IPv6）

## 学习建议

1. **阅读代码顺序**：
   - 先看 `rdma_common.h` 了解数据结构
   - 再看 `rdma_common.c` 理解每个步骤的实现
   - 然后对比 `rdma_server.c` 和 `rdma_client.c` 的流程

2. **动手实验**：
   - 运行程序，观察详细输出
   - 修改缓冲区大小、消息内容等参数
   - 尝试注释某些步骤，观察会发生什么错误

3. **使用调试工具**：
   ```bash
   # 查看RDMA设备信息
   ibv_devices
   ibv_devinfo

   # 查看GID表
   show_gids

   # 简单的ping测试
   ibv_rc_pingpong -d rxe0 -g 1
   ```

4. **扩展实验**：
   - 尝试实现RDMA Write/Read操作
   - 增加多轮数据传输
   - 实现多客户端连接
   - 测量延迟和吞吐量

## 项目文档导航

本项目包含多个文档，针对不同的使用场景：

| 文档 | 用途 |
|------|------|
| **QUICKFIX.md** | ⚡ 快速修复指南，解决90%的问题（特别是GID配置）|
| **TROUBLESHOOTING.md** | 📚 详细故障排除，包含诊断步骤和原因分析 |
| **QP_STATE_USAGE.md** | 🔍 QP运行时状态查询功能说明 |
| **CLAUDE.md** | 🤖 为AI助手提供的项目架构和代码指导 |

## 深入理解：RDMA架构模型

### 两平面模型

RDMA通信采用**两平面分离**的架构，这是理解整个项目的关键：

**1. 控制平面（Control Plane）- TCP通信**
- 使用TCP socket进行**带外（out-of-band）**通信
- 交换连接元数据：QP号、LID、GID等
- 在本项目中由 `sock_sync_data()` 函数实现
- **必须在QP转至RTR状态前完成**，因为需要对方的QP信息

**2. 数据平面（Data Plane）- RDMA直接传输**
- QP连接建立后，使用RDMA进行**直接内存访问**
- 旁路TCP，通过高性能网络硬件直接传输
- Post Receive → Post Send → Poll Completion
- 这是高性能的关键：无需CPU参与数据复制

```
┌─ Server ──────────────────┐    ┌─ Client ──────────────────┐
│                           │    │                           │
│  TCP Socket (Control)  ◄──┼────┼─► TCP Socket (Control)  │
│  └─ 交换QP元数据          │    │    └─ 交换QP元数据         │
│                           │    │                           │
│  RDMA (Data Plane)     ◄──┼────┼─► RDMA (Data Plane)     │
│  └─ 高速直接传输          │    │    └─ 高速直接传输        │
│     (无TCP开销)          │    │       (无TCP开销)         │
└───────────────────────────┘    └────────────────────────────┘
```

### RoCEv2特定配置

RoCEv2 (RDMA over Converged Ethernet v2) 在以太网上运行RDMA，需要特定配置：

**1. GID索引选择（最常见的问题）**
- GID索引0：通常是IB (InfiniBand) 网络的GID，RoCEv2不用
- **GID索引1+：RoCEv2用，基于IPv4/IPv6地址**
- ⚠️ 大多数错误来自使用错误的GID索引！
- 查看可用GID：`./show_gids.sh` 或 `ibv_devinfo -d rxe0`

**2. Global Routing Header (GRH) 配置**
- RoCEv2在Ethernet上运行，需要GRH用于IP路由
- `ah_attr.is_global = 1` - 启用全局路由
- `ah_attr.grh.dgid` - 设置目标GID
- `ah_attr.grh.sgid_index` - 设置源GID索引
- `ah_attr.grh.hop_limit` - 通常设为1（L2网络）

**3. 其他重要参数**
```c
// 路径MTU配置
port_attr.active_mtu  // 查询活跃MTU

// 连接参数
timeout = 14          // 超时时间
retry_cnt = 7         // 重试次数
rnr_retry = 7         // RNR (Receiver Not Ready) 重试
```

### 同步点设计（防止RNR错误）

RDMA RC连接中，接收方必须先投递Receive WR，否则发送方的数据到达时会出现RNR错误：

```
Server Side:                    Client Side:
1. post_receive()    ────────► （等待信号）
2. send TCP signal ◄────────  （收到信号后）
                               1. post_send()
3. poll_completion()           2. post_receive()
   ↑                          3. poll_completion()
   └─ 等待数据到达
```

这个顺序保证了：**接收方永远比发送方先投递WR**，避免RNR。

## 故障排除

遇到问题？使用内置的诊断工具：

```bash
# 运行诊断脚本，自动检查配置
./diagnose.sh

# 查看GID表
./show_gids.sh
```

**快速诊断流程：**
1. 运行 `./diagnose.sh` 检查设备和GID
2. 确保GID索引1的值不是全0
3. 使用正确的GID索引启动Server和Client（通常是1）
4. 如果仍然失败，查看 [QUICKFIX.md](QUICKFIX.md) 或 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 常见问题

### Q1: 编译时找不到 libibverbs
**A**: 安装开发库 `sudo apt-get install libibverbs-dev`

### Q2: 运行时提示找不到RDMA设备
**A**: 确保已加载驱动并配置了RDMA设备，运行 `ibv_devices` 检查

### Q3: GID索引应该使用多少？
**A**: 对于RoCEv2，通常使用GID索引1或更高。运行 `./show_gids.sh` 查看可用的GID

### Q4: 程序卡在"等待客户端连接"
**A**: 检查防火墙设置，确保TCP端口（默认18515）未被阻止

### Q5: 修改QP到RTR状态失败
**A**: 这是最常见的问题！**90%的情况是GID索引错误。** 运行 `./diagnose.sh` 进行诊断，然后查看 [QUICKFIX.md](QUICKFIX.md) 快速修复指南。使用 `./show_gids.sh` 验证GID索引1是否有有效值。

## 参考资料

- [RDMA Aware Networks Programming User Manual](https://www.rdmamojo.com/)
- [InfiniBand Architecture Specification](https://www.infinibandta.org/)
- [Linux RDMA Documentation](https://www.kernel.org/doc/Documentation/infiniband/)
- [RoCE vs iWARP vs InfiniBand](https://www.rdmamojo.com/2014/03/31/roce-vs-infiniband/)

## 贡献

欢迎提交Issue和Pull Request来改进这个学习项目！

## 许可证

本项目仅用于学习目的，代码可自由使用和修改。
