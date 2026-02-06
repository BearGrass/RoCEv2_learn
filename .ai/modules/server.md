# 服务端模块规范 (Server Module)

**文件**: `src/rdma_server.c`  
**职责**: RDMA服务端程序 - 被动连接端，接收然后发送数据  
**依赖**: 通用模块 (common)

## 📌 模块概述

服务端模块实现了RDMA通信中的被动端点。其角色是：
1. 监听TCP连接（被动监听）
2. 等待客户端连接和QP信息交换
3. 建立QP连接（RTR → RTS）
4. 接收客户端数据
5. 发送响应数据
6. 支持1-16个并发QP

## 🔄 执行流程

```
启动参数解析
    ↓
创建TCP监听socket
    ↓
等待客户端连接
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
同步TCP信号
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
./build/rdma_server [device_name] [port] [gid_idx] [num_qp]
```

### 参数说明

| 参数 | 默认值 | 说明 | 示例 |
|------|--------|------|------|
| device_name | 第一可用设备 | RDMA设备名称 | rxe0, mlx5_0 |
| port | 1 | 设备端口号 | 1 或 2 |
| gid_idx | 1 | GID表索引 | RoCEv2通常用1+ |
| num_qp | DEFAULT_NUM_QP | 创建的QP数量 | 1, 4, 8, 16 |

### 使用示例

```bash
# 使用默认参数（第一可用设备，端口1，GID索引1，4个QP）
./build/rdma_server

# 指定设备为rxe0，其他用默认
./build/rdma_server rxe0

# 指定设备和TCP端口
./build/rdma_server rxe0 18515

# 指定设备、端口、GID索引
./build/rdma_server rxe0 18515 1

# 指定所有参数（4个QP）
./build/rdma_server rxe0 18515 1 4

# 使用最大配置（16个QP）
./build/rdma_server rxe0 18515 1 16
```

## 🏗️ 核心数据结构

### 主函数变量
```c
int main(int argc, char *argv[]) {
    /* 参数 */
    const char *device_name = NULL;
    int port = DEFAULT_PORT;        /* 18515 */
    uint32_t gid_index = 1;         /* RoCEv2 */
    uint32_t num_qp = DEFAULT_NUM_QP;  /* 4 */
    
    /* RDMA资源 */
    struct rdma_resources *res = NULL;
    struct cm_con_data_t *local_con_data = NULL;   /* [MAX_QP] */
    struct cm_con_data_t *remote_con_data = NULL;  /* [MAX_QP] */
    
    /* 网络 */
    int sockfd = -1;        /* 监听socket */
    int connfd = -1;        /* 连接socket */
    struct sockaddr_in addr = {0};
    
    /* 其他 */
    int ret = 0;
    uint32_t i = 0;
    
    /* ... */
}
```

## 📝 实现要求

### 参数解析
```c
/**
 * 服务端参数说明:
 * argv[1]: 设备名 (可选，默认为NULL表示使用第一个可用)
 * argv[2]: TCP端口 (可选，默认18515)
 * argv[3]: GID索引 (可选，默认1)
 * argv[4]: QP数量 (可选，默认4)
 * 
 * 示例:
 * ./rdma_server                    # 全默认
 * ./rdma_server rxe0               # 指定设备
 * ./rdma_server rxe0 18515         # 指定设备和端口
 * ./rdma_server rxe0 18515 1 4     # 完整指定
 */
```

**实现细节**:
- 使用 `atoi()` 解析整数参数
- device_name 为 `argv[1]` 或 `NULL`
- port 为 `atoi(argv[2])` 或默认值
- gid_index 为 `atoi(argv[3])` 或默认值
- num_qp 为 `atoi(argv[4])` 或默认值
- 验证 num_qp 不超过 MAX_QP (16)

### 监听socket创建
```c
/**
 * 创建TCP监听socket
 * 
 * 步骤:
 * 1. socket(AF_INET, SOCK_STREAM, 0)
 * 2. setsockopt() 设置SO_REUSEADDR
 * 3. bind() 绑定到 INADDR_ANY:port
 * 4. listen() 开始监听，backlog=1
 * 5. 打印 "listening on port <port>"
 */
```

**错误处理**:
- socket失败返回-1
- bind失败检查端口是否被占用
- listen失败需要关闭socket
- 所有error case必须清理资源

### RDMA资源初始化
```c
/**
 * 调用公共模块函数
 * 
 * res = init_rdma_resources(device_name, 1, gid_index, num_qp);
 * 
 * 参数说明:
 * - device_name: 从命令行或NULL
 * - 端口号: 1（RDMA使用的端口，不是TCP端口）
 * - gid_index: 从命令行或默认1
 * - num_qp: 从命令行或DEFAULT_NUM_QP
 * 
 * 错误处理:
 * - 返回NULL表示初始化失败
 * - 打印错误信息
 * - 关闭socket并返回
 */
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
    fprintf(stderr, "Failed to modify QP to INIT\n");
    goto cleanup;
}

fprintf(stdout, "QPs transitioned to INIT state\n");
for (i = 0; i < res->num_qp; i++) {
    print_qp_state(res, i, "QP INIT");
}
```

### 连接信息分配
```c
/* 分配数组存储多QP的连接信息 */
local_con_data = malloc(sizeof(struct cm_con_data_t) * res->num_qp);
if (local_con_data == NULL) {
    fprintf(stderr, "malloc failed\n");
    goto cleanup;
}

remote_con_data = malloc(sizeof(struct cm_con_data_t) * res->num_qp);
if (remote_con_data == NULL) {
    fprintf(stderr, "malloc failed\n");
    goto cleanup;
}

/* 初始化为零 */
memset(local_con_data, 0, sizeof(struct cm_con_data_t) * res->num_qp);
memset(remote_con_data, 0, sizeof(struct cm_con_data_t) * res->num_qp);
```

### 填充本地连接信息
```c
/* 为每个QP填充本地QP信息 */
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

### TCP连接交换

#### 等待客户端连接
```c
socklen_t addr_len = sizeof(addr);

fprintf(stdout, "Waiting for client connection on port %d...\n", port);
connfd = accept(sockfd, (struct sockaddr *)&addr, &addr_len);
if (connfd < 0) {
    perror("accept");
    goto cleanup;
}

fprintf(stdout, "Client connected from %s:%u\n",
        inet_ntoa(addr.sin_addr), ntohs(addr.sin_port));
```

#### 多QP连接信息交换
```c
/**
 * 调用多QP同步函数
 * 
 * 协议:
 * 1. 服务端先接收客户端的num_qp和QP信息
 * 2. 服务端发送自己的num_qp和QP信息
 * 3. 验证双方num_qp一致
 */
if (sock_sync_data_multi(connfd, local_con_data, remote_con_data, 
                          res, 1) != 0) {  /* is_server=1 */
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
 * 关键点：服务端先投递接收WR
 * 这确保客户端发送时接收端已准备好（防止RNR错误）
 */
if (post_receive_all(res) != 0) {
    fprintf(stderr, "Failed to post receive\n");
    goto cleanup;
}

fprintf(stdout, "Receive WRs posted for all %u QPs\n", res->num_qp);
```

#### TCP同步信号
```c
/**
 * 发送信号告知客户端接收WR已投递
 * 客户端等待此信号后才能发送数据
 */
uint32_t post_recv_flag = 1;  /* 或任何简单的标记 */
if (send(connfd, &post_recv_flag, sizeof(post_recv_flag), 0) < 0) {
    perror("send");
    goto cleanup;
}

fprintf(stdout, "Notified client about posted receives\n");
```

#### 等待数据接收
```c
/**
 * 轮询完成队列等待接收完成
 * 期望num_qp个完成事件
 */
fprintf(stdout, "Waiting for receives to complete...\n");
if (poll_completion(res, res->num_qp, NULL) <= 0) {
    fprintf(stderr, "Failed to poll receive completions\n");
    goto cleanup;
}

fprintf(stdout, "All receives completed\n");
```

#### 投递发送WR
```c
/**
 * 为每个QP投递发送WR
 * 注意：必须是在接收完成之后
 */
fprintf(stdout, "Posting sends for all %u QPs\n", res->num_qp);
for (i = 0; i < res->num_qp; i++) {
    if (post_send_qp(res, i, IBV_WR_SEND) != 0) {
        fprintf(stderr, "Failed to post send on QP %u\n", i);
        goto cleanup;
    }
}
```

#### 等待数据发送
```c
/**
 * 轮询完成队列等待发送完成
 * 期望num_qp个完成事件
 */
fprintf(stdout, "Waiting for sends to complete...\n");
if (poll_completion(res, res->num_qp, NULL) <= 0) {
    fprintf(stderr, "Failed to poll send completions\n");
    goto cleanup;
}

fprintf(stdout, "All sends completed\n");
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
    
    if (connfd >= 0) {
        close(connfd);
        connfd = -1;
    }
    
    if (sockfd >= 0) {
        close(sockfd);
        sockfd = -1;
    }
    
    if (res != NULL) {
        cleanup_rdma_resources(res);
        res = NULL;
    }
    
    return ret;
```

## 🔄 多QP vs 单QP

### 单QP模式
```c
/* 初始化 */
res = init_rdma_resources(device_name, 1, gid_index, 1);  /* num_qp=1 */

/* 创建和转移 */
create_qp_list(res);  /* 创建1个QP */
modify_qp_list_to_init(res);
modify_qp_list_to_rtr(res, remote_con_data);
modify_qp_list_to_rts(res);

/* 数据传输 */
post_receive_all(res);  /* 为1个QP投递 */
poll_completion(res, 1, NULL);  /* 等待1个完成 */
```

### 多QP模式 (4个QP示例)
```c
/* 初始化 */
res = init_rdma_resources(device_name, 1, gid_index, 4);  /* num_qp=4 */

/* 创建和转移 */
create_qp_list(res);  /* 创建4个QP */
modify_qp_list_to_init(res);
modify_qp_list_to_rtr(res, remote_con_data);  /* remote_con_data是数组 */
modify_qp_list_to_rts(res);

/* 数据传输 */
post_receive_all(res);  /* 为4个QP投递 */
poll_completion(res, 4, NULL);  /* 等待4个完成 */
poll_completion(res, 4, NULL);  /* 再等待4个发送完成 */
```

## 📊 输出信息

服务端应在关键步骤打印信息，便于调试：

```
设备和参数:
- Device: <device_name>
- Port: <port>
- GID Index: <gid_index>
- Number of QPs: <num_qp>
- Max msg size: <DEFAULT_MSG_SIZE>

启动:
- listening on port <port>

连接:
- Waiting for client connection on port <port>...
- Client connected from <IP>:<port>

资源初始化:
- RDMA device: <device_name>
- RDMA port: <port>
- Allocated message buffer: <size> bytes

QP状态:
- QPs transitioned to INIT state
- QP INIT (QP <idx>): state=INIT, qp_num=<num>, port=<port>
- QPs transitioned to RTR state
- QP RTR (QP <idx>): state=RTR, ...
- QPs transitioned to RTS state
- QP RTS (QP <idx>): state=RTS, ...

连接信息:
- Connection data exchanged successfully
- Local QP <idx>: qp_num=<num>, lid=<lid>
- Remote QP <idx>: qp_num=<num>, lid=<lid>

数据传输:
- Receive WRs posted for all <num_qp> QPs
- Notified client about posted receives
- Waiting for receives to complete...
- All receives completed
- Posting sends for all <num_qp> QPs
- Waiting for sends to complete...
- All sends completed
- RDMA data transfer complete!
```

## ⚠️ 关键约束

### 同步顺序
1. 服务端必须在投递接收WR **后** 通知客户端
2. 客户端必须等待此通知后再发送数据
3. 服务端接收完成后再投递发送

### QP状态约束
- 创建→INIT→RTR→RTS的顺序不能改变
- RTR必须在接收到远端信息后再进行
- RTS必须在RTR之后进行

### 内存约束
- 所有缓冲区必须 ≤ DEFAULT_MSG_SIZE (4096字节)
- local_con_data 和 remote_con_data 数组大小 = MAX_QP
- 动态分配必须检查失败

### 错误处理
- 所有系统调用必须检查返回值
- 所有RDMA操作必须检查返回值
- 错误时必须完整清理资源
- 使用goto统一清理

## 🔗 依赖关系

```
rdma_server.c
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

## 🧪 测试场景

### 基本测试
```bash
# 终端1：启动服务端（4个QP）
./build/rdma_server rxe0 18515 1 4

# 终端2：启动客户端（4个QP）
./build/rdma_client 127.0.0.1 rxe0 18515 1 4
```

### 单QP测试
```bash
# 服务端
./build/rdma_server rxe0 18515 1 1

# 客户端
./build/rdma_client 127.0.0.1 rxe0 18515 1 1
```

### 最大QP测试
```bash
# 服务端（16个QP）
./build/rdma_server rxe0 18515 1 16

# 客户端（16个QP）
./build/rdma_client 127.0.0.1 rxe0 18515 1 16
```

---

**文档版本**: 1.0  
**最后更新**: 2026年2月6日  
**适用代码**: rdma_server.c  
**状态**: AI编程就绪 ✅
