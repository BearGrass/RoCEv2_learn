# RDMA 故障排除指南

本文档帮助你诊断和解决RoCEv2学习项目中常见的问题。

## 问题: QP从INIT到RTR状态转换失败

### 错误信息
```
========== 步骤10: 修改QP状态 INIT->RTR ==========
错误: 修改QP到RTR状态失败
修改QP到RTR失败
```

### 原因分析

这是RoCEv2最常见的问题，通常由以下原因引起：

1. **GID索引配置错误**（最常见）
2. GID未正确配置
3. 端口未激活
4. 连接信息交换错误

---

## 诊断步骤

### 步骤1: 运行诊断脚本

```bash
./diagnose.sh
```

这个脚本会检查：
- RDMA设备是否存在
- GID表配置
- 端口状态
- 网卡配置

### 步骤2: 检查GID配置

**关键点：RoCEv2必须使用有效的GID索引（通常是1，不是0）**

```bash
# 查看GID表
show_gids

# 或者手动查看
cat /sys/class/infiniband/rxe0/ports/1/gids/*
```

**正确的输出示例：**
```
DEV     PORT    INDEX   GID                                     IPv4            VER     DEV
---     ----    -----   ---                                     ------------    ---     ---
rxe0    1       0       fe80:0000:0000:0000:xxxx:xxxx:xxxx:xxxx                 v1      eth0
rxe0    1       1       0000:0000:0000:0000:0000:ffff:0a00:8606 10.0.134.6      v2      eth0
                ↑                                               ↑
           索引1 = RoCEv2                                    你的IP地址
```

**问题诊断：**
- 如果GID索引1显示全0，说明GID未配置
- 如果没有v2类型的GID，说明RoCEv2不可用

### 步骤3: 检查端口状态

```bash
ibv_devinfo -d rxe0
```

查找这一行：
```
state:                  PORT_ACTIVE (4)
```

如果不是`PORT_ACTIVE`，检查关联的网卡：

```bash
# 查看网卡状态
ip link show eth0

# 激活网卡
sudo ip link set eth0 up

# 确保网卡有IP地址
ip addr show eth0
```

### 步骤4: 验证连接信息交换

在代码输出中查找这些信息：

**服务端输出：**
```
本地连接信息:
  - QP号: 0x000013
  - LID: 0x0000
  - GID: 0000:0000:0000:0000:0000:ffff:0a00:8605
       ↑ 应该包含IP地址

远端连接信息:
  - QP号: 0x000012
  - LID: 0x0000
  - GID: 0000:0000:0000:0000:0000:ffff:0a00:8606
       ↑ 应该包含客户端IP地址
```

**检查点：**
- GID不应该全为0
- GID应该包含对方的IP地址（最后4个字节）

---

## 常见解决方案

### 方案1: 使用正确的GID索引

**问题：** 使用了GID索引0（IB类型）而不是索引1（RoCEv2类型）

**解决：**
```bash
# 服务端 - 明确指定GID索引1
./build/rdma_server rxe0 18515 1
                               ↑

# 客户端 - 明确指定GID索引1
./build/rdma_client 10.0.134.5 rxe0 18515 1
                                           ↑
```

### 方案2: 重新创建RXE设备

**问题：** RXE设备配置不正确

**解决：**
```bash
# 1. 删除现有RXE设备
sudo rdma link delete rxe0

# 2. 重新创建（替换eth0为你的网卡名）
sudo rdma link add rxe0 type rxe netdev eth0

# 3. 验证
ibv_devices
show_gids
```

### 方案3: 确保网卡配置正确

**问题：** 网卡未激活或无IP地址

**解决：**
```bash
# 激活网卡
sudo ip link set eth0 up

# 配置IP地址（如果还没有）
sudo ip addr add 10.0.134.6/24 dev eth0

# 验证
ip addr show eth0
```

### 方案4: 检查防火墙

虽然这不影响QP状态转换，但可能影响TCP连接：

```bash
# 临时关闭防火墙测试
sudo ufw disable

# 或者开放端口
sudo ufw allow 18515/tcp
```

---

## 使用官方工具测试

在修复配置后，使用官方工具验证RDMA连接：

```bash
# 服务端（IP: 10.0.134.5）
ibv_rc_pingpong -d rxe0 -g 1

# 客户端（IP: 10.0.134.6）
ibv_rc_pingpong -d rxe0 -g 1 10.0.134.5
```

如果这个能成功，说明RDMA配置正确，可以再试我们的程序。

---

## 代码已修复的问题

最新版本的代码已经修复了以下问题：

1. ✅ 强制设置 `is_global = 1`（之前有条件判断可能跳过）
2. ✅ 使用端口实际MTU（之前硬编码为1024）
3. ✅ 添加详细的errno错误信息
4. ✅ 在错误时打印调试信息

**重新编译：**
```bash
make rebuild
```

---

## 调试输出解读

更新后的代码会在失败时提供详细信息：

```
错误: 修改QP到RTR状态失败: Invalid argument (errno=22)
调试提示:
  - 远端QP号: 0x000013
  - 远端LID: 0x0000
  - GID索引: 1
  - 远端GID: 0000:0000:0000:0000:0000:ffff:0a00:8605
请检查: 1) GID配置 2) 端口状态 3) 连接信息交换是否正确
```

**常见errno值：**
- `errno=22` (EINVAL): 参数无效，通常是GID索引错误或端口未激活
- `errno=19` (ENODEV): 设备不存在
- `errno=12` (ENOMEM): 内存不足

---

## 仍然无法解决？

### 收集诊断信息

```bash
# 1. 运行诊断脚本并保存输出
./diagnose.sh > diagnostic.txt

# 2. 收集完整的程序输出
./build/rdma_server rxe0 18515 1 > server.log 2>&1
./build/rdma_client 10.0.134.5 rxe0 18515 1 > client.log 2>&1

# 3. 检查内核日志
sudo dmesg | tail -50
```

### 常见特殊情况

**情况1：虚拟机环境**
- Soft-RoCE在某些虚拟化环境中可能不稳定
- 尝试在物理机或支持的虚拟化平台（如KVM）上测试

**情况2：多网卡**
- 确保RXE绑定到正确的网卡
- 确保使用正确网卡的IP地址

**情况3：内核版本**
- RXE需要较新的内核（建议4.8+）
- 检查：`uname -r`

---

## 参考命令速查

```bash
# 查看RDMA设备
ibv_devices
ibv_devinfo

# 查看GID表
show_gids

# 管理RXE设备
sudo rdma link add rxe0 type rxe netdev eth0
sudo rdma link delete rxe0
rdma link show

# 网卡管理
ip link show
ip addr show
sudo ip link set eth0 up

# 测试工具
ibv_rc_pingpong -d rxe0 -g 1
ibv_rc_pingpong -d rxe0 -g 1 <server_ip>
```
