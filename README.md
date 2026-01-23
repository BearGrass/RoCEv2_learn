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
│   ├── rdma_common.h      # 公共头文件和函数声明
│   ├── rdma_common.c      # 公共函数实现
│   ├── rdma_server.c      # 服务端程序
│   └── rdma_client.c      # 客户端程序
├── build/                 # 编译输出目录
├── Makefile               # 编译脚本
└── README.md              # 本文档
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

## 故障排除

遇到问题？使用内置的诊断工具：

```bash
# 运行诊断脚本，自动检查配置
./diagnose.sh

# 查看GID表
./show_gids.sh
```

**常见问题快速修复：**
- 📖 查看 [QUICKFIX.md](QUICKFIX.md) - 快速解决90%的问题
- 📚 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 详细故障排除指南

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
**A**: 这是最常见的问题！运行 `./diagnose.sh` 进行诊断，通常是GID索引配置错误。详见 [QUICKFIX.md](QUICKFIX.md)

## 参考资料

- [RDMA Aware Networks Programming User Manual](https://www.rdmamojo.com/)
- [InfiniBand Architecture Specification](https://www.infinibandta.org/)
- [Linux RDMA Documentation](https://www.kernel.org/doc/Documentation/infiniband/)
- [RoCE vs iWARP vs InfiniBand](https://www.rdmamojo.com/2014/03/31/roce-vs-infiniband/)

## 贡献

欢迎提交Issue和Pull Request来改进这个学习项目！

## 许可证

本项目仅用于学习目的，代码可自由使用和修改。
