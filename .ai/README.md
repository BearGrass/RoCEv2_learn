# RoCEv2 AI编程项目规范手册

**项目**: RoCEv2学习项目 - RDMA多QP编程框架  
**版本**: 1.0 - AI编程专业版  
**更新日期**: 2026年2月6日  
**状态**: 生产就绪 ✅

---

## 📖 快速导航

### 核心文档
- [项目规格索引](../_index.md) - 所有规范文档的中央索引
- [C语言编码规范](../_conventions.md) - **必读** - 所有代码必须遵守的规范
- [通用模块规范](../modules/common.md) - RDMA基础设施 (rdma_common.h/c)
- [服务端模块规范](../modules/server.md) - 被动RDMA端点 (rdma_server.c)
- [客户端模块规范](../modules/client.md) - 主动RDMA端点 (rdma_client.c)

### 项目文档
- [README.md](../../README.md) - 项目总体说明和使用指南
- [RULE.md](../../RULE.md) - 原始C语言编码规范
- [MULTI_QP_README.md](../../MULTI_QP_README.md) - 多QP详细技术指南
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) - 故障排除指南

---

## 🎯 项目概览

### 项目结构

```
RoCEv2_learn/
├── specs/                          ← AI编程规范文档
│   ├── _index.md                   规格索引（你在这里）
│   ├── _conventions.md             C语言编码规范
│   └── modules/
│       ├── common.md               通用模块规范
│       ├── server.md               服务端模块规范
│       └── client.md               客户端模块规范
├── src/
│   ├── rdma_common.h              RDMA公共头文件
│   ├── rdma_common.c              RDMA核心实现
│   ├── rdma_server.c              服务端程序
│   ├── rdma_client.c              客户端程序
│   └── rdma_common_debug.c        调试版本（可选）
├── build/
│   ├── rdma_server                编译的服务端二进制
│   └── rdma_client                编译的客户端二进制
├── Makefile                        编译脚本
├── README.md                       项目说明
├── RULE.md                         编码规范
└── ...其他文档...
```

### 技术栈

- **语言**: C11（遵循POSIX）
- **RDMA库**: libibverbs（InfiniBand Verbs API）
- **传输**: RoCEv2 (RDMA over Converged Ethernet v2)
- **连接类型**: RC (Reliable Connection)
- **编译器**: GCC
- **平台**: Linux (x86_64)

### 核心特性

✅ 多QP支持（1-16个并发Queue Pair）  
✅ 共享CQ模型（单个完成队列处理所有QP）  
✅ TCP+RDMA混合通信（控制平面+数据平面）  
✅ 完整的错误处理和资源管理  
✅ 详细的调试输出  
✅ RoCEv2标准兼容  

---

## 🚀 快速开始

### 编译

```bash
cd /home/long/git/RoCEv2_learn
make clean
make
```

预期输出：
```
编译完成
-rwxrwxr-x build/rdma_server (约137KB)
-rwxrwxr-x build/rdma_client (约137KB)
```

### 运行示例（4个QP）

**终端1 - 启动服务端**:
```bash
./build/rdma_server rxe0 18515 1 4
```

**终端2 - 启动客户端**:
```bash
./build/rdma_client 127.0.0.1 rxe0 18515 1 4
```

### 验证执行

观察输出中的关键信息：
- ✅ "listening on port"
- ✅ "Client connected from"
- ✅ "QPs transitioned to RTS state"
- ✅ "RDMA data transfer complete!"

---

## 📚 架构说明

### 两平面模型

```
┌─────────────────────────────────────────┐
│          应用层 (Application)           │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────┐              ┌──────────┐
│TCP平面  │              │RDMA平面  │
│(控制)   │              │(数据)    │
├─────────┤              ├──────────┤
│端口号   │              │QP对      │
│交换元数据 │              │CQ        │
│握手     │              │MR        │
└─────────┘              └──────────┘
```

### QP生命周期

```
RESET
  ↓ (create_qp)
INIT
  ↓ (modify_qp_to_init)
INIT
  ↓ (TCP元数据交换)
INIT
  ↓ (modify_qp_to_rtr)
RTR (Ready To Receive)
  ↓ (modify_qp_to_rts)
RTS (Ready To Send)
  ↓ (post_send/receive/poll)
RTS (数据传输中)
  ↓ (cleanup)
销毁
```

### 同步点（关键）

```
时间 → →

服务端:  create_qp
客户端:                create_qp
         ↓
服务端:  QP→INIT
客户端:                QP→INIT
         ↓
服务端:  TCP同步
客户端:                TCP同步
         ↓
服务端:  QP→RTR, RTS
客户端:                QP→RTR, RTS
         ↓
服务端:  post_receive_all (先！)
         send_TCP_signal
客户端:                recv_TCP_signal
                       post_send_qp
         ↓
服务端:  poll_completion (receive)
         post_send_qp
客户端:                poll_completion (send)
         ↓
服务端:  poll_completion (send)
客户端:                poll_completion (receive)
```

---

## 🔧 模块详解

### 1. 通用模块 (Common Module)

**文件**: `src/rdma_common.h` 和 `src/rdma_common.c`

**职责**:
- RDMA资源生命周期管理
- QP状态机控制
- 内存注册和保护域
- 工作请求投递和完成轮询
- TCP元数据交换

**关键数据结构**:
- `struct rdma_resources` - 所有RDMA对象的容器
- `struct cm_con_data_t` - QP元数据

**关键函数**:
- 初始化: `init_rdma_resources()`
- QP管理: `create_qp()`, `create_qp_list()`
- 状态转移: `modify_qp_to_init()`, `modify_qp_to_rtr()`, `modify_qp_to_rts()`
- 多QP: `modify_qp_list_to_*()`, `post_receive_all()`, `post_send_qp()`
- 网络: `sock_sync_data()`, `sock_sync_data_multi()`
- 轮询: `poll_completion()`
- 清理: `cleanup_rdma_resources()`

**详见**: [通用模块规范](../modules/common.md)

### 2. 服务端模块 (Server Module)

**文件**: `src/rdma_server.c`

**职责**:
- TCP监听和连接接受
- QP配置和连接建立
- 数据接收和发送
- 资源管理

**执行模式**:
1. 监听TCP连接（被动）
2. 初始化RDMA资源
3. 建立QP连接
4. **先**投递接收WR
5. **然后**发送TCP信号
6. 投递发送WR
7. 轮询完成

**参数**:
```bash
./rdma_server [device_name] [port] [gid_idx] [num_qp]
```

**详见**: [服务端模块规范](../modules/server.md)

### 3. 客户端模块 (Client Module)

**文件**: `src/rdma_client.c`

**职责**:
- TCP连接初始化
- QP配置和连接建立
- 数据发送和接收
- 资源管理

**执行模式**:
1. 连接TCP服务端（主动）
2. 初始化RDMA资源
3. 建立QP连接
4. **等待**服务端TCP信号
5. 投递接收WR
6. 投递发送WR
7. 轮询完成

**参数**:
```bash
./rdma_client <server_ip> [device_name] [port] [gid_idx] [num_qp]
```

**详见**: [客户端模块规范](../modules/client.md)

---

## 📋 编码规范要点

### 必读规范

**完整规范**: [C语言编码规范](../_conventions.md)

### 快速清单

- [ ] 函数不超过80行（不含注释）
- [ ] 文件不超过1000行（含注释）
- [ ] 参数不超过5个（超过使用结构体）
- [ ] 函数圈复杂度 ≤ 15
- [ ] 每行 ≤ 100个字符
- [ ] 每行最多1条语句
- [ ] 使用4个空格缩进（禁止Tab）
- [ ] K&R大括号风格
- [ ] 变量名: snake_case
- [ ] 常量名: UPPER_CASE
- [ ] 公开函数: Doxygen注释
- [ ] 检查所有malloc/指针返回值
- [ ] 所有错误情况都要处理
- [ ] 动态分配必须检查失败
- [ ] 指针为NULL时需检查
- [ ] 使用const修饰不修改的指针
- [ ] 释放内存后置为NULL
- [ ] 使用goto进行统一的错误清理

---

## 🔑 关键概念

### 多QP设计

**为什么选择多QP？**
- 提高并发性和吞吐量
- 支持多路RDMA传输
- 共享一个CQ可以降低内存使用

**架构**:
- 1个共享CQ处理所有QP的完成事件
- 每个QP有独立的SQ和RQ
- 使用wr_id字段标识QP源
- 支持1-16个并发QP

**重要约束**:
- 所有QP共享单个CQ（大小256）
- 每个QP最多16个未完成WR
- 默认4个QP，最多16个

### RoCEv2特定事项

- **GID索引**: 必须 >= 1（0是IB模式）
- **GRH**: 必须启用Global Routing Header
- **Hop Limit**: 通常设为1（L2网络）
- **MTU**: 配合网卡设置

### TCP vs RDMA通信

**TCP（控制平面）**:
- 交换QP号、LID、GID
- 握手同步
- 小数据量
- 可靠但低速

**RDMA（数据平面）**:
- 实际业务数据传输
- 零复制（direct memory access）
- 高速（无CPU开销）
- 需要先建立连接（via TCP）

### 重要的同步模式

```
问题: 如何防止RNR (Receiver Not Ready) 错误？

解决方案:
1. 接收端先投递receive WR到RQ
2. 发送端投递send WR到SQ
3. RDMA硬件匹配WR并传输数据

实现:
- 服务端先post_receive_all()
- 服务端发送TCP信号
- 客户端等待TCP信号
- 客户端再post_send_qp()
```

---

## 🧪 测试矩阵

### 基础功能测试

| 配置 | 命令 | 预期结果 |
|------|------|---------|
| 单QP | `./server 1` + `./client 127.0.0.1 ... 1` | ✅ |
| 4QP | `./server 4` + `./client 127.0.0.1 ... 4` | ✅ |
| 16QP | `./server 16` + `./client 127.0.0.1 ... 16` | ✅ |
| 默认 | `./server` + `./client 127.0.0.1` | ✅ (4QP) |
| 设备 | 指定rxe0/mlx5_0 | ✅ |

### 故障排查

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| Connection refused | 服务端未启动 | 先启动服务端 |
| RNR errors | 接收WR未投递 | 检查post_receive顺序 |
| Timeout | poll_completion超时 | 检查QP状态和TCP信号 |
| Invalid QP state | 状态转移顺序错 | 遵循RESET→INIT→RTR→RTS |
| Segfault | 指针错误 | 检查NULL指针 |

---

## 📊 代码统计

### 代码量

| 文件 | 行数 | 功能 |
|------|------|------|
| rdma_common.h | ~150 | 数据结构和声明 |
| rdma_common.c | ~1200+ | 核心RDMA实现 |
| rdma_server.c | ~300+ | 服务端应用 |
| rdma_client.c | ~300+ | 客户端应用 |
| **总计** | **~2000** | **完整RDMA框架** |

### 关键函数

| 函数 | 文件 | 行数 | 复杂度 |
|------|------|------|--------|
| init_rdma_resources | common.c | ~80 | 中 |
| modify_qp_to_rtr | common.c | ~60 | 中 |
| sock_sync_data_multi | common.c | ~50 | 中 |
| poll_completion | common.c | ~40 | 低 |
| main (server) | server.c | ~150 | 中 |
| main (client) | client.c | ~150 | 中 |

---

## 🔗 依赖和兼容性

### 系统依赖

```bash
# Ubuntu/Debian
sudo apt-get install libibverbs-dev librdmacm-dev

# CentOS/RHEL
sudo yum install libibverbs-devel librdmacm-devel
```

### 编译依赖

- GCC 5.0+
- glibc 2.17+
- Linux kernel 3.10+

### RDMA设备

**硬件**:
- Mellanox InfiniBand/Ethernet RDMA NICs
- Xilinx RNICs
- 其他支持libibverbs的设备

**软件**:
- Soft-RoCE (rxe) - 仅用于学习和测试
- 需要加载rdma_rxe内核模块

### 向后兼容性

✅ 单QP模式仍然支持  
✅ 旧的函数API保持  
✅ 新的多QP函数无侵入性  

---

## 🎓 学习路径

### 初学者

1. 阅读 [README.md](../../README.md) - 项目概览
2. 运行基础示例 - 单QP模式
3. 研究 [通用模块规范](../modules/common.md) - 理解RDMA核心
4. 跟踪服务端和客户端代码执行

### 中级

1. 深入 [C语言编码规范](../_conventions.md)
2. 修改代码（例如增加日志）
3. 从单QP升级到多QP
4. 编写简单的修改

### 高级

1. 添加新的RDMA操作（WRITE, READ）
2. 实现事件通知机制
3. 性能优化和调测
4. 扩展到WAN场景

---

## 🛠️ 常见任务

### 增加一个新功能

1. 在相应模块规范中添加设计文档
2. 在头文件中添加声明和Doxygen注释
3. 在源文件中实现
4. 遵循编码规范
5. 编译和测试
6. 更新相关规范文档

### 修复一个bug

1. 在TROUBLESHOOTING.md中查找相似情况
2. 定位错误（通常在poll_completion或同步点）
3. 添加调试输出
4. 验证修复
5. 更新相关文档

### 性能优化

1. 使用批量投递（多个WR）
2. 增加CQ大小
3. 调整超时参数
4. 使用事件通知而非轮询

---

## 📖 文档交叉引用

### 按主题

**RDMA基础**:
- [通用模块规范](../modules/common.md) - API和数据结构
- [MULTI_QP_README.md](../../MULTI_QP_README.md) - 多QP详解

**应用开发**:
- [服务端模块规范](../modules/server.md) - 完整的服务端示例
- [客户端模块规范](../modules/client.md) - 完整的客户端示例

**编码标准**:
- [C语言编码规范](../_conventions.md) - 强制标准
- [RULE.md](../../RULE.md) - 原始版本

**故障排查**:
- [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) - 常见问题
- [QUICKFIX.md](../../QUICKFIX.md) - 快速修复

---

## ✨ 最佳实践

### 开发工作流

```
1. 需求分析
   ↓
2. 更新相关规范文档
   ↓
3. 编写代码（参考规范）
   ↓
4. 遵循编码规范检查清单
   ↓
5. 编译验证 (make clean && make)
   ↓
6. 功能测试
   ↓
7. 代码审查 (自己审)
   ↓
8. 文档同步
   ↓
9. 提交
```

### 代码审查要点

- ✅ 遵循命名规范
- ✅ 函数大小合理
- ✅ 错误处理完整
- ✅ 内存管理正确
- ✅ 注释清晰
- ✅ 无编译警告
- ✅ 相关模块规范已更新

### 常见陷阱

❌ 忘记检查malloc返回值  
❌ 跳过QP状态转移步骤  
❌ TCP同步顺序错误  
❌ 接收WR投递顺序错  
❌ 没有正确关闭socket  
❌ 没有完整清理资源  
❌ 忽略poll_completion超时  
❌ 混淆wr_id的用途  

---

## 📞 获取帮助

### 快速查找

| 问题类型 | 查看文档 |
|---------|---------|
| 函数定义和使用 | [通用模块规范](../modules/common.md) |
| 服务端如何实现 | [服务端模块规范](../modules/server.md) |
| 客户端如何实现 | [客户端模块规范](../modules/client.md) |
| 代码应该怎么写 | [C语言编码规范](../_conventions.md) |
| 出了什么问题 | [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) |
| 快速修复 | [QUICKFIX.md](../../QUICKFIX.md) |

### 调试技巧

1. 编译时加 `-DDEBUG` 启用详细输出
2. 使用 `print_qp_state()` 检查QP状态
3. 在关键点添加fprintf调试
4. 使用strace跟踪系统调用
5. 使用ibv_devinfo检查设备信息

---

## 📈 性能指标（参考）

基于4个QP的默认配置：

| 指标 | 单位 | 值 |
|------|------|-----|
| 消息大小 | 字节 | 4096 |
| QP数量 | 个 | 4 |
| CQ大小 | 项 | 256 |
| 连接延迟 | ms | ~50 |
| 单次传输延迟 | µs | ~100-500 |
| 吞吐量 | Mbps | 取决于设备 |

**注**: 这些是估计值，实际性能取决于硬件和网络。

---

## 📝 变更日志

### v1.0 (2026-02-06) - 初始版本

✅ 完整的多QP支持 (1-16个QP)  
✅ 共享CQ模型  
✅ TCP+RDMA混合通信  
✅ 完整的API文档  
✅ 编码规范  
✅ 模块规范  
✅ 生产就绪  

---

## 📄 许可和使用

本项目是教学项目，用于学习RDMA编程概念。

### 许可

- 源代码：自由使用和修改
- 文档：共享和改进
- 示例：直接使用或改编

### 引用

如果在学术或商业项目中使用，请参考本项目文档。

---

## 🎉 总结

本手册提供了RoCEv2项目的完整AI编程规范和指导。

### 核心要点

✅ **模块化**: 3个模块，各司其职  
✅ **规范化**: 所有代码遵循统一规范  
✅ **可扩展**: 支持1-16个并发QP  
✅ **可维护**: 详细的文档和注释  
✅ **生产级**: 完整的错误处理和资源管理  

### 下一步

1. 选择感兴趣的模块开始学习
2. 参考相应的规范文档
3. 遵循编码规范编写代码
4. 测试和迭代

---

**快速链接**:
- 📋 [编码规范](_conventions.md)
- 🔧 [通用模块](modules/common.md)
- 🖥️ [服务端](modules/server.md)
- 💻 [客户端](modules/client.md)
- 📖 [项目首页](../../README.md)

**最后更新**: 2026年2月6日  
**文档状态**: 完整和最新 ✅  
**AI编程准备**: 就绪 ✅
