# 客户端模块规范 (Client Module)

**文件**: `src/rdma_client.c`  
**职责**: RDMA客户端程序 - 主动连接端，发送然后接收数据  
**依赖**: 通用模块 (common)

## 📌 模块概述

客户端模块实现了RDMA通信中的主动端点。其角色是：
1. 连接到TCP服务端（主动连接）
2. 交换QP信息和建立RDMA连接
3. 建立QP连接（RTR → RTS）
4. 发送数据到服务端
5. 接收服务端响应数据
6. 支持1-16个并发QP

## 🔄 执行流程

```
启动参数解析
    ↓
连接TCP服务端
    ↓
初始化RDMA资源 (init_rdma_resources)
    ↓
创建QP列表 (create_qp_list)
    ↓
QP → INIT状态 (modify_qp_list_to_init)
    ↓
交换TCP连接信息 (sock_sync_data_multi)
    ↓
QP → RTR状态 (modify_qp_list_to_rtr)
    ↓
QP → RTS状态 (modify_qp_list_to_rts)
    ↓
投递接收WR (post_receive_all)
    ↓
等待服务端信号 (TCP)
    ↓
投递发送WR (post_send_qp × num_qp)
    ↓
轮询完成事件 (poll_completion)
    ↓
资源清理
    ↓
退出
```

## 📋 命令行参数

```bash
./build/rdma_client <server_ip> [device_name] [port] [gid_idx] [num_qp]
```

### 参数说明

| 参数 | 默认值 | 必需 | 说明 | 示例 |
|------|--------|------|------|------|
| server_ip | - | ✓ | 服务端IP地址 | 127.0.0.1, 10.0.134.5 |
| device_name | 第一可用设备 | - | RDMA设备名称 | rxe0, mlx5_0 |
| port | 18515 | - | TCP连接端口 | 18515 |
| gid_idx | 1 | - | GID表索引 | RoCEv2通常用1+ |
| num_qp | DEFAULT_NUM_QP | - | 创建的QP数量 | 1, 4, 8, 16 |

### 使用示例

```bash
# 最小参数（仅指定服务端IP）
./build/rdma_client 127.0.0.1

# 指定服务端和设备
./build/rdma_client 127.0.0.1 rxe0

# 指定服务端、设备和端口
./build/rdma_client 127.0.0.1 rxe0 18515

# 指定服务端、设备、端口、GID索引
./build/rdma_client 127.0.0.1 rxe0 18515 1

# 完整参数（指定4个QP）
./build/rdma_client 127.0.0.1 rxe0 18515 1 4

# 最大配置（16个QP）
./build/rdma_client 127.0.0.1 rxe0 18515 1 16
```

## 🏗️ 核心数据结构

### 主函数变量
```c
int main(int argc, char *argv[]) {
    /* 参数 */
    const char *server_ip = NULL;   /* 必需 */
    const char *device_name = NULL;
    int port = DEFAULT_PORT;         /* 18515 */
    uint32_t gid_index = 1;          /* RoCEv2 */
    uint32_t num_qp = DEFAULT_NUM_QP;   /* 4 */
    
    /* RDMA资源 */
    struct rdma_resources *res = NULL;
    struct cm_con_data_t *local_con_data = NULL;   /* [MAX_QP] */
    struct cm_con_data_t *remote_con_data = NULL;  /* [MAX_QP] */
    
    /* 网络 */
    int sock = -1;  /* TCP socket */
    struct sockaddr_in addr = {0};
    
    /* 其他 */
    int ret = 0;
    uint32_t i = 0;
    uint32_t post_recv_flag = 0;  /* 接收来自服务端的信号 */
    
    /* ... */
}
```

## 📝 实现要求

### 参数解析和验证
```c
/**
 * 客户端参数说明（注意：server_ip是第一个参数）:
 * argv[1]: 服务端IP地址（必需）
 * argv[2]: 设备名 (可选，默认为NULL表示使用第一个可用)
 * argv[3]: TCP端口 (可选，默认18515)
 * argv[4]: GID索引 (可选，默认1)
 * argv[5]: QP数量 (可选，默认4)
 * 
 * 示例:
 * ./rdma_client 127.0.0.1              # 最小参数
 * ./rdma_client 127.0.0.1 rxe0         # 指定设备
 * ./rdma_client 127.0.0.1 rxe0 18515   # 指定设备和端口
 * ./rdma_client 127.0.0.1 rxe0 18515 1 4  # 完整指定
 */

/* 必须验证server_ip */
if (argc < 2) {
    fprintf(stderr, "Usage: %s <server_ip> [device_name] [port] [gid_idx] [num_qp]\n",
            argv[0]);
    return -1;
}

server_ip = argv[1];

/* 可选参数 */
if (argc > 2) {
    device_name = argv[2];
}
if (argc > 3) {
    port = atoi(argv[3]);
}
if (argc > 4) {
    gid_index = atoi(argv[4]);
}
if (argc > 5) {
    num_qp = atoi(argv[5]);
}

/* 验证参数 */
if (num_qp <= 0 || num_qp > MAX_QP) {
    fprintf(stderr, "Invalid num_qp: %u (must be 1-%d)\n", num_qp, MAX_QP);
    return -1;
}
```

### TCP服务端连接
```c
/**
 * 主动连接到服务端
 * 
 * 步骤:
 * 1. socket(AF_INET, SOCK_STREAM, 0)
 * 2. inet_pton() 将IP地址转换为二进制
 * 3. connect() 连接到 server_ip:port
 * 4. 打印连接成功信息
 */

sock = socket(AF_INET, SOCK_STREAM, 0);
if (sock < 0) {
    perror("socket");
    return -1;
}

memset(&addr, 0, sizeof(addr));
addr.sin_family = AF_INET;
addr.sin_port = htons(port);

if (inet_pton(AF_INET, server_ip, &addr.sin_addr) <= 0) {
    fprintf(stderr, "Invalid server IP address: %s\n", server_ip);
    close(sock);
    return -1;
}

fprintf(stdout, "Connecting to server %s:%d...\n", server_ip, port);
if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
    perror("connect");
    close(sock);
    return -1;
}

fprintf(stdout, "Connected to server successfully\n");
```

### RDMA资源初始化
```c
/**
 * 调用公共模块函数
 * 参数与服务端相同
 */

fprintf(stdout, "Initializing RDMA resources...\n");
fprintf(stdout, "- Device: %s\n", device_name ? device_name : "(first available)");
fprintf(stdout, "- Port: 1\n");
fprintf(stdout, "- GID Index: %u\n", gid_index);
fprintf(stdout, "- Number of QPs: %u\n", num_qp);

res = init_rdma_resources(device_name, 1, gid_index, num_qp);
if (res == NULL) {
    fprintf(stderr, "Failed to initialize RDMA resources\n");
    goto cleanup;
}

fprintf(stdout, "RDMA resources initialized successfully\n");
```

### QP创建和状态转移

#### 创建QP
```c
if (create_qp_list(res) != 0) {
    fprintf(stderr, "Failed to create QPs\n");
    goto cleanup;
}
```

#### RESET → INIT 转移
```c
if (modify_qp_list_to_init(res) != 0) {
    fprintf(stderr, "Failed to modify QPs to INIT\n");
    goto cleanup;
}

fprintf(stdout, "QPs transitioned to INIT state\n");
for (i = 0; i < res->num_qp; i++) {
    print_qp_state(res, i, "QP INIT");
}
```

### 连接信息分配
```c
/* 与服务端完全相同的分配过程 */
local_con_data = malloc(sizeof(struct cm_con_data_t) * res->num_qp);
if (local_con_data == NULL) {
    fprintf(stderr, "malloc failed for local_con_data\n");
    goto cleanup;
}

remote_con_data = malloc(sizeof(struct cm_con_data_t) * res->num_qp);
if (remote_con_data == NULL) {
    fprintf(stderr, "malloc failed for remote_con_data\n");
    goto cleanup;
}

memset(local_con_data, 0, sizeof(struct cm_con_data_t) * res->num_qp);
memset(remote_con_data, 0, sizeof(struct cm_con_data_t) * res->num_qp);
```

### 填充本地连接信息
```c
/* 与服务端完全相同的填充逻辑 */
for (i = 0; i < res->num_qp; i++) {
    struct ibv_qp_attr qp_attr;
    struct ibv_qp_init_attr qp_init_attr;
    
    if (ibv_query_qp(res->qp_list[i], &qp_attr, IBV_QP_STATE,
                      &qp_init_attr) < 0) {
        fprintf(stderr, "Failed to query QP %u\n", i);
        goto cleanup;
    }
    
    local_con_data[i].qp_num = res->qp_list[i]->qp_num;
    local_con_data[i].lid = res->port_attr.lid;
    memcpy(local_con_data[i].gid, &res->gid, 16);
    
    fprintf(stdout, "Local QP %u: qp_num=%u, lid=%u\n",
            i, local_con_data[i].qp_num, local_con_data[i].lid);
}
```

### TCP连接信息交换

#### 多QP同步（客户端角色：is_server=0）
```c
/**
 * 客户端调用同步函数时is_server=0
 * 
 * 协议（客户端视角）:
 * 1. 发送本地num_qp
 * 2. 发送本地QP信息数组
 * 3. 接收远端num_qp
 * 4. 接收远端QP信息数组
 * 5. 验证两边num_qp一致
 */

if (sock_sync_data_multi(sock, local_con_data, remote_con_data, 
                         res, 0) != 0) {  /* is_server=0 */
    fprintf(stderr, "Failed to sync connection data\n");
    goto cleanup;
}

fprintf(stdout, "Connection data exchanged successfully\n");
for (i = 0; i < res->num_qp; i++) {
    fprintf(stdout, "Remote QP %u: qp_num=%u, lid=%u\n",
            i, remote_con_data[i].qp_num, remote_con_data[i].lid);
}
```

### INIT → RTR 转移
```c
/* 与服务端完全相同 */
if (modify_qp_list_to_rtr(res, remote_con_data) != 0) {
    fprintf(stderr, "Failed to modify QPs to RTR\n");
    goto cleanup;
}

fprintf(stdout, "QPs transitioned to RTR state\n");
for (i = 0; i < res->num_qp; i++) {
    print_qp_state(res, i, "QP RTR");
}
```

### RTR → RTS 转移
```c
/* 与服务端完全相同 */
if (modify_qp_list_to_rts(res) != 0) {
    fprintf(stderr, "Failed to modify QPs to RTS\n");
    goto cleanup;
}

fprintf(stdout, "QPs transitioned to RTS state\n");
for (i = 0; i < res->num_qp; i++) {
    print_qp_state(res, i, "QP RTS");
}
```

### 数据传输

#### 投递接收WR
```c
/**
 * 客户端也需要投递接收WR以接收服务端的响应
 */
if (post_receive_all(res) != 0) {
    fprintf(stderr, "Failed to post receive WRs\n");
    goto cleanup;
}

fprintf(stdout, "Receive WRs posted for all %u QPs\n", res->num_qp);
```

#### 等待服务端信号
```c
/**
 * 关键点：客户端必须等待服务端的信号
 * 这确保服务端的接收WR已投递
 * 否则客户端发送时会触发RNR错误
 */

fprintf(stdout, "Waiting for server to signal post_receive completion...\n");
ssize_t n = recv(sock, &post_recv_flag, sizeof(post_recv_flag), 0);
if (n < 0) {
    perror("recv");
    goto cleanup;
}

if (n == 0) {
    fprintf(stderr, "Server closed connection\n");
    goto cleanup;
}

fprintf(stdout, "Server signaled, proceeding with sends\n");
```

#### 投递发送WR
```c
/**
 * 现在才能安全地投递发送WR
 * 为每个QP投递一个send WR
 */

fprintf(stdout, "Posting sends for all %u QPs\n", res->num_qp);
for (i = 0; i < res->num_qp; i++) {
    if (post_send_qp(res, i, IBV_WR_SEND) != 0) {
        fprintf(stderr, "Failed to post send on QP %u\n", i);
        goto cleanup;
    }
}
```

#### 等待发送完成
```c
/**
 * 轮询完成队列等待发送完成
 * 期望num_qp个发送完成事件
 */

fprintf(stdout, "Waiting for sends to complete...\n");
if (poll_completion(res, res->num_qp, NULL) <= 0) {
    fprintf(stderr, "Failed to poll send completions\n");
    goto cleanup;
}

fprintf(stdout, "All sends completed\n");
```

#### 等待接收完成
```c
/**
 * 再轮询完成队列等待接收完成
 * 期望num_qp个接收完成事件
 */

fprintf(stdout, "Waiting for receives to complete...\n");
if (poll_completion(res, res->num_qp, NULL) <= 0) {
    fprintf(stderr, "Failed to poll receive completions\n");
    goto cleanup;
}

fprintf(stdout, "All receives completed\n");
fprintf(stdout, "RDMA data transfer complete!\n");
```

### 资源清理
```c
cleanup:
    if (local_con_data != NULL) {
        free(local_con_data);
        local_con_data = NULL;
    }
    
    if (remote_con_data != NULL) {
        free(remote_con_data);
        remote_con_data = NULL;
    }
    
    if (sock >= 0) {
        close(sock);
        sock = -1;
    }
    
    if (res != NULL) {
        cleanup_rdma_resources(res);
        res = NULL;
    }
    
    return ret;
```

## 🔄 客户端 vs 服务端

### 主要区别

| 方面 | 服务端 | 客户端 |
|------|--------|--------|
| socket行为 | listen() + accept() | connect() |
| TCP同步is_server参数 | 1 | 0 |
| TCP数据流顺序 | 先recv后send | 先send后recv |
| 工作请求顺序 | recv → send | send → recv |
| 等待信号 | 需要客户端连接 | 需要服务端post_recv完成 |

### 同步顺序详解

```
时间线:
T0: 服务端监听，客户端连接
T1: 两端初始化RDMA资源
T2: 两端创建QP，转移到INIT状态
T3: TCP交换连接信息
T4: 两端转移QP到RTR状态
T5: 两端转移QP到RTS状态
T6: 【服务端】投递接收WR到所有QP
T7: 【服务端】发送TCP信号 (post_recv_flag)
T8: 【客户端】接收TCP信号
T9: 【客户端】投递发送WR到所有QP
T10: RDMA发送数据传输
T11: 【服务端】轮询完成（等待接收完成）
T12: 【客户端】轮询完成（等待发送完成）
T13: 【服务端】投递发送WR回复
T14: 【客户端】轮询完成（等待接收完成）
T15: 【服务端】轮询完成（等待发送完成）
T16: 两端清理资源并退出
```

## 📊 输出信息

客户端应在关键步骤打印信息，便于调试（类似服务端）：

```
启动:
- Connecting to server <ip>:<port>...
- Connected to server successfully

初始化:
- Initializing RDMA resources...
- Device: <device_name>
- RDMA resources initialized successfully

QP状态:
- QPs transitioned to INIT state
- QP INIT (QP <idx>): ...
- QPs transitioned to RTR state
- QPs transitioned to RTS state

连接:
- Connection data exchanged successfully
- Local QP <idx>: qp_num=<num>, lid=<lid>
- Remote QP <idx>: qp_num=<num>, lid=<lid>

数据传输:
- Receive WRs posted for all <num_qp> QPs
- Waiting for server to signal post_receive completion...
- Server signaled, proceeding with sends
- Posting sends for all <num_qp> QPs
- Waiting for sends to complete...
- All sends completed
- Waiting for receives to complete...
- All receives completed
- RDMA data transfer complete!
```

## ⚠️ 关键约束

### TCP同步约束
- **必须**等待服务端的post_recv信号后再发送
- **必须**按照协议顺序进行TCP数据交换
- is_server参数影响收发顺序，不能弄错

### QP状态约束
- 与服务端完全相同的RESET → INIT → RTR → RTS序列
- 必须在完成TCP同步后再转移到RTR

### 同步点约束
```
服务端post_receive → 发送TCP信号 → 客户端接收信号 → 客户端post_send
```
任何顺序错误都会导致RNR (Receiver Not Ready) 错误。

## 🔗 依赖关系

```
rdma_client.c
    ↓
    requires: rdma_common.h/c
    functions used:
    - init_rdma_resources()
    - create_qp_list()
    - modify_qp_list_to_init/rtr/rts()
    - sock_sync_data_multi()
    - post_receive_all()
    - post_send_qp()
    - poll_completion()
    - cleanup_rdma_resources()
    - print_qp_state()
```

## 🧪 执行模式

### 典型执行顺序（2个终端）

**终端1（服务端）**:
```bash
$ ./build/rdma_server rxe0 18515 1 4
listening on port 18515
Waiting for client connection on port 18515...
[等待客户端连接...]
```

**终端2（客户端）**:
```bash
$ ./build/rdma_client 127.0.0.1 rxe0 18515 1 4
Connecting to server 127.0.0.1:18515...
Connected to server successfully
[继续初始化...]
```

**然后两个程序进行协调**:
- 交换RDMA连接信息
- QP状态转移
- 数据传输完成

## 💡 调试提示

### 常见问题

1. **Connection refused**
   - 服务端是否正在运行？
   - 端口号是否匹配？
   - 防火墙是否阻止？

2. **RNR Errors**
   - 服务端是否在投递接收WR后发送了信号？
   - 客户端是否等待了信号？

3. **Timeout**
   - poll_completion 等待超过5秒
   - 检查QP是否正确转移到RTS状态
   - 检查远端是否投递了对应的WR

4. **Invalid QP state**
   - 检查QP状态转移的顺序
   - 不能跳过任何状态

---

**文档版本**: 1.0  
**最后更新**: 2026年2月6日  
**适用代码**: rdma_client.c  
**状态**: AI编程就绪 ✅
