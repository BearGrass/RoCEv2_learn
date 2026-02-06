# C语言编码规范

本规范用于指导AI编程和代码生成，确保项目中的C语言代码保持一致性和高质量。

## 📋 文件规范

### 文件大小限制
- 单个源文件不超过300行（含注释和空行）
- 单个头文件不超过500行
- 超出限制时应分割为多个模块

### 文件命名
- **源文件** (`.c`): 小写字母和下划线，如 `memory_manager.c`
- **头文件** (`.h`): 与源文件同名，如 `memory_manager.h`
- **特殊情况**: `main.c` 可不对应头文件

### 文件结构
```
[文件头注释]
[includes]
[宏定义和类型定义]
[全局变量]
[前向声明]
[实现函数体]
```

### 头文件保护
```c
#ifndef MODULE_NAME_H
#define MODULE_NAME_H

/* ... 内容 ... */

#endif /* MODULE_NAME_H */
```

### Include 顺序
1. 对应的头文件（如果是.c文件）
2. C标准库头文件
3. POSIX系统头文件
4. 第三方库头文件
5. 项目内部头文件

示例:
```c
#include "memory_manager.h"

#include <stdio.h>
#include <stdlib.h>

#include <unistd.h>
#include <sys/types.h>

#include <infiniband/verbs.h>

#include "config.h"
#include "log.h"
```

## 🔧 函数规范

### 函数大小
- 单个函数不超过80行（不含注释和空行）
- 超出时应分割为多个函数
- 函数圈复杂度 (CC) 不超过15

### 函数参数
- 不超过5个参数
- 参数超过5个时使用结构体封装
- 不修改的参数使用 `const` 修饰
- 指针参数必须在函数开头检查是否为 `NULL`

示例:
```c
/* 不好：参数过多 */
int init_device(const char *name, int port, int gid_idx, 
                const char *server_ip, int timeout, int retry_count);

/* 好：使用结构体 */
struct init_config {
    const char *device_name;
    int port;
    int gid_index;
    const char *server_ip;
    int timeout;
    int retry_count;
};
int init_device(const struct init_config *config);
```

### 函数嵌套深度
- 最大4层嵌套
- 超出时使用 `goto` 进行错误处理
- 使用提前返回 (early return) 简化逻辑

### 函数职责
- 每个函数只做一件事 (Single Responsibility Principle)
- 清晰命名表达函数的唯一职责
- 避免副作用

### 函数文档 (Doxygen格式)
```c
/**
 * 分配并初始化RDMA资源
 *
 * @param device_name 指定的RDMA设备名称（如"rxe0"）
 * @param port_num    RDMA使用的端口号
 * @param gid_index   GID表索引，RoCEv2通常使用 >= 1
 * @return            初始化成功返回RDMA资源结构体指针，失败返回NULL
 *
 * @note GID索引为0通常是IB模式，RoCEv2应使用索引1或更高
 * @see cleanup_rdma_resources() 用于清理分配的资源
 */
struct rdma_resources *init_rdma_resources(
    const char *device_name,
    uint16_t port_num,
    uint32_t gid_index);
```

## 📏 行规范

### 行长度
- 每行不超过100个字符
- 超出时进行适当换行

### 语句规范
- 每行最多一条语句
- 不允许使用逗号运算符

### 变量声明
- 每行最多声明一个变量
- 尽可能靠近使用地点声明

示例:
```c
/* 不好 */
int x, y, z; 
void *ptr; FILE *fp;

/* 好 */
int x;
int y;
int z;

void *ptr;
FILE *fp;
```

## 🔤 命名规范

### 变量名
- 使用小写字母和下划线
- 名称应表达其含义
- 示例: `user_count`, `buffer_size`, `is_running`

### 函数名
- 使用小写字母和下划线
- 动词开头表示操作
- 示例: `create_qp()`, `post_send()`, `poll_completion()`

### 常量和宏
- 使用大写字母和下划线
- 示例: `MAX_BUFFER_SIZE`, `DEFAULT_PORT`, `ERROR_INVALID_ARG`

### 类型定义
- 使用驼峰式或 `_t` 后缀
- 示例: `struct rdma_resources`, `typedef struct rdma_qp_t`

### 全局变量
- 添加 `g_` 前缀
- 示例: `g_device_list`, `g_config`

### 静态变量
- 添加 `s_` 前缀
- 示例: `s_instance_count`, `s_cache_size`

### 布尔变量
- 使用 `is_`, `has_`, `can_` 前缀
- 示例: `is_connected`, `has_permission`, `can_write`

## 📐 缩进和格式

### 缩进
- 使用4个空格缩进（**禁止使用Tab**)
- 每级缩进增加4个空格

### 大括号风格 (K&R)
```c
/* 函数定义 */
int calculate_sum(int a, int b)
{
    return a + b;
}

/* 条件语句 */
if (condition) {
    do_something();
} else {
    do_other();
}

/* 循环 */
while (is_running) {
    process_item();
}
```

### 关键字间距
- 关键字后加空格: `if (`, `for (`, `while (`, `switch (`
- 函数名与括号无空格: `func()`, `get_value()`
- 类型转换与变量无空格: `(int)value`

### 运算符间距
- 二元运算符两侧加空格: `a + b`, `x = y`
- 一元运算符与操作数无空格: `*ptr`, `!flag`, `++counter`
- 逗号后加空格: `func(a, b, c)`
- 冒号后加空格（三目）: `condition ? true_val : false_val`

示例:
```c
/* 好的格式 */
int result = (a + b) * (c - d);
char *name = malloc(size);
if (ptr != NULL && size > 0) {
    memcpy(dest, src, size);
}
```

## 💬 注释规范

### 文件头注释
```c
/**
 * @file rdma_common.c
 * @brief RDMA核心功能实现 - 资源管理、状态转换、工作请求投递
 *
 * 本文件实现RDMA生命周期管理的所有关键步骤，包括：
 * - RDMA资源的初始化和清理
 * - QP状态机转移（RESET → INIT → RTR → RTS）
 * - 完成队列轮询和事件处理
 * - TCP元数据交换
 *
 * @note 所有函数必须遵守多QP共享CQ的设计约束
 */
```

### 公开函数文档
- 必须使用Doxygen格式
- 说明功能、参数、返回值、错误码
- 列出相关函数和注意事项

```c
/**
 * 将QP从INIT状态转移到RTR状态
 *
 * 此函数配置远端QP信息并初始化连接参数。
 * 必须在接收到远端QP号、LID和GID后调用。
 *
 * @param res          RDMA资源结构指针，必须非NULL且已初始化
 * @param remote_data  远端QP连接信息
 * @param qp_idx       要转移的QP在qp_list中的索引（多QP模式）
 * @return             成功返回0，失败返回非零错误码
 * @retval -EINVAL     参数无效或QP状态不对
 * @retval -ENODEV     设备操作失败
 *
 * @pre QP必须处于INIT状态
 * @post QP转移到RTR状态
 *
 * @see modify_qp_to_init()  初始化QP前需先调用此函数
 * @see modify_qp_to_rts()   转移到RTS前必须先进行此转移
 *
 * @note RoCEv2模式下必须设置GRH（Global Routing Header）
 */
int modify_qp_to_rtr(struct rdma_resources *res,
                      const struct cm_con_data_t *remote_data,
                      uint32_t qp_idx);
```

### 行内注释
- 解释**为什么**而非**做什么**
- 注释代码的目的和意图
- 注释复杂的逻辑和边界条件

```c
/* 好的行内注释 */
// RoCEv2中GID索引必须 >= 1，0通常是IB模式
ah_attr.grh.dgid_index = 1;

// 投递接收WR前需等待TCP同步，防止RNR错误
sock_sync_data(sock, POST_RECEIVE_FLAG);
post_receive(res);

/* 不好的注释 - 重复代码意思 */
x = y + 1;  // 将y加1赋给x
```

### TODO 和 FIXME
```c
/* TODO: 实现多设备支持 */
/* FIXME: 处理GID索引为0的IB模式 */
```

### 项目一致性
- 项目中保持注释语言一致（本项目使用**中文**）
- 重要注释可用英文补充技术细节

## 📚 头文件规范

### Include Guard
```c
#ifndef RDMA_COMMON_H
#define RDMA_COMMON_H

/* ... 内容 ... */

#endif /* RDMA_COMMON_H */
```

### 只放声明，不放实现
```c
/* 头文件中 - 只放声明 */
int process_data(const char *buffer, size_t size);

/* 不应在头文件中 */
int process_data(const char *buffer, size_t size) {
    return strlen(buffer);  // 错误！
}
```

### Inline 函数例外
```c
/* 头文件中可以定义inline函数 */
static inline int min(int a, int b) {
    return (a < b) ? a : b;
}
```

### 删除不必要的包含
```c
/* rdma_server.h 中 */
#include "rdma_common.h"  /* 需要：使用结构体 */
#include <stdio.h>        /* 不需要：只在.c中使用 */  /* ❌ 移除 */
```

## 🧠 内存管理规范

### 分配和释放
```c
/* 必须检查返回值 */
void *ptr = malloc(size);
if (ptr == NULL) {
    fprintf(stderr, "malloc failed\n");
    return -ENOMEM;
}

/* 释放后置为NULL */
if (ptr != NULL) {
    free(ptr);
    ptr = NULL;
}

/* 更好：重复释放是安全的 */
free(ptr);
ptr = NULL;
```

### 谁分配谁释放
```c
/* 分配者 */
struct buffer *alloc_buffer(size_t size) {
    struct buffer *buf = malloc(sizeof(*buf));
    if (buf == NULL) return NULL;
    buf->data = malloc(size);
    if (buf->data == NULL) {
        free(buf);
        return NULL;
    }
    buf->size = size;
    return buf;
}

/* 分配者也应负责释放 */
void free_buffer(struct buffer *buf) {
    if (buf != NULL) {
        free(buf->data);
        free(buf);
    }
}
```

### 错误路径清理
```c
int init_resource(struct resource *res) {
    res->data = malloc(DATA_SIZE);
    if (res->data == NULL) {
        goto error;
    }
    
    res->list = malloc(sizeof(int) * 10);
    if (res->list == NULL) {
        goto error;
    }
    
    return 0;

error:
    free(res->data);
    res->data = NULL;
    free(res->list);
    res->list = NULL;
    return -ENOMEM;
}
```

### 不返回局部变量地址
```c
/* ❌ 错误 */
int *get_ptr(void) {
    int local = 42;
    return &local;  /* 返回栈地址，危险！ */
}

/* ✅ 正确 */
int *get_ptr(void) {
    static int local = 42;
    return &local;
}

/* 或者 */
int get_value(void) {
    int local = 42;
    return local;  /* 返回值 */
}
```

## ⚠️ 错误处理规范

### 返回值约定
- 成功返回 **0** 或正数
- 失败返回 **负数**错误码
- 返回指针失败时返回 **NULL**

```c
/* 函数返回整数状态 */
int post_send(struct rdma_resources *res, const void *data, size_t size) {
    if (res == NULL || data == NULL) {
        return -EINVAL;  /* 参数无效 */
    }
    
    if (size > res->max_msg_size) {
        return -EMSGSIZE;  /* 消息太大 */
    }
    
    /* 执行操作 */
    return 0;  /* 成功 */
}

/* 函数返回指针 */
struct rdma_resources *init_rdma(const char *dev) {
    struct rdma_resources *res = malloc(sizeof(*res));
    if (res == NULL) {
        return NULL;  /* 内存不足 */
    }
    return res;
}
```

### 检查所有可能的失败
```c
int connect_server(const char *server_ip, uint16_t port) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("socket");
        return -1;
    }
    
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    
    if (inet_pton(AF_INET, server_ip, &addr.sin_addr) <= 0) {
        fprintf(stderr, "Invalid IP address\n");
        close(sock);
        return -1;
    }
    
    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("connect");
        close(sock);
        return -1;
    }
    
    return sock;
}
```

### 统一错误码定义
```c
/* errors.h */
#define ERR_INVALID_ARG      (-1)
#define ERR_NO_MEMORY        (-2)
#define ERR_DEVICE_NOT_FOUND (-3)
#define ERR_CONNECTION_FAIL  (-4)
#define ERR_TIMEOUT          (-5)
#define ERR_QP_INVALID_STATE (-6)
```

### Assert用于编程错误
```c
#include <assert.h>

void process_array(int *arr, size_t len) {
    assert(arr != NULL);        /* 编程错误，不应发生 */
    assert(len > 0);
    
    for (size_t i = 0; i < len; i++) {
        if (arr[i] < 0) {
            /* 运行时数据错误，应检查处理 */
            fprintf(stderr, "Invalid data at index %zu\n", i);
            return;
        }
    }
}
```

## 🔒 安全编码规范

### 字符串操作
```c
/* ❌ 不安全 */
char buffer[64];
strcpy(buffer, user_input);  /* 缓冲区溢出 */

/* ✅ 安全 */
char buffer[64];
strncpy(buffer, user_input, sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\0';

/* 或者使用 snprintf */
snprintf(buffer, sizeof(buffer), "%s", user_input);
```

### 指针验证
```c
int process_data(const void *data, size_t size) {
    /* 检查NULL指针 */
    if (data == NULL) {
        return -EINVAL;
    }
    
    /* 检查大小 */
    if (size == 0 || size > MAX_SIZE) {
        return -EINVAL;
    }
    
    /* 继续处理... */
    return 0;
}
```

### 数组边界检查
```c
int access_array(int *arr, size_t arr_len, size_t index) {
    if (arr == NULL) {
        return -EINVAL;
    }
    
    if (index >= arr_len) {
        return -ERANGE;  /* 索引超出范围 */
    }
    
    return arr[index];
}
```

### 整数溢出检查
```c
/* 检查乘法溢出 */
int multiply_safe(int a, int b, int *result) {
    if (a == 0 || b == 0) {
        *result = 0;
        return 0;
    }
    
    if (a > INT_MAX / b) {
        return -EOVERFLOW;  /* 将溢出 */
    }
    
    *result = a * b;
    return 0;
}
```

## 🎯 类型使用规范

### 精确宽度整数类型
```c
#include <stdint.h>

/* 不要使用 */
int count;      /* 宽度不确定 */
unsigned long size;

/* 应该使用 */
int32_t count;
uint32_t size;
uint8_t byte;
int64_t large_value;
```

### Size 和数组索引
```c
#include <string.h>

/* 不好 */
void copy_data(char *dst, const char *src, int size) {
    memcpy(dst, src, size);
}

/* 好 - 使用 size_t */
void copy_data(char *dst, const char *src, size_t size) {
    memcpy(dst, src, size);
}

/* 数组索引也应使用 size_t */
for (size_t i = 0; i < array_len; i++) {
    printf("%zu\n", i);
}
```

### 布尔类型
```c
#include <stdbool.h>

/* 不好 */
int is_connected = 0;
if (!is_connected) { }

/* 好 */
bool is_connected = false;
if (!is_connected) { }
```

### const 修饰符
```c
/* 参数不应被修改 */
int calculate(const int *values, size_t count);

/* 指向常量的指针 */
const int *ptr = &value;  /* 指向的值是const */
int * const ptr = &value; /* 指针本身是const */

/* 返回指向常量的指针 */
const char *get_version(void);
```

### 枚举优于宏
```c
/* 不好 - 使用宏 */
#define STATE_INIT  0
#define STATE_READY 1
#define STATE_RUN   2

/* 好 - 使用枚举 */
enum qp_state {
    QP_STATE_INIT = 0,
    QP_STATE_READY = 1,
    QP_STATE_RUN = 2,
};

enum qp_state state = QP_STATE_INIT;
```

## 🔨 宏定义规范

### 多语句宏
```c
/* ❌ 错误 */
#define LOCK(m)    pthread_mutex_lock(&m); \
                   critical_section(); \
                   pthread_mutex_unlock(&m);

if (flag)
    LOCK(mutex);  /* 只锁定第一条语句 */

/* ✅ 正确 */
#define LOCK(m) do { \
    pthread_mutex_lock(&m); \
    critical_section(); \
    pthread_mutex_unlock(&m); \
} while(0)
```

### 宏参数保护
```c
/* ❌ 错误 */
#define SQUARE(x) x * x
int result = SQUARE(2 + 3);  /* 结果是2 + 3 * 2 + 3 = 11，不是25 */

/* ✅ 正确 */
#define SQUARE(x) ((x) * (x))
int result = SQUARE(2 + 3);  /* 结果是25 */
```

### 宏展开保护
```c
/* ❌ 错误 */
#define MAX(a, b) a > b ? a : b
if (MAX(x++, y) > 10)  /* x可能被++两次 */

/* ✅ 正确 */
#define MAX(a, b) (((a) > (b)) ? (a) : (b))
if (MAX(x++, y) > 10)
```

### 避免宏副作用
```c
/* ❌ 有副作用 */
#define CHECK(x) if (!(x)) { printf("Failed: %s\n", #x); return -1; }
CHECK(++counter > 10);  /* counter被修改 */

/* ✅ 无副作用 */
#define CHECK(x) do { \
    if (!(x)) { \
        printf("Failed: %s\n", #x); \
        return -1; \
    } \
} while(0)
```

### 优先使用 inline 函数
```c
/* ❌ 宏实现 */
#define MIN(a, b) (((a) < (b)) ? (a) : (b))

/* ✅ inline函数 */
static inline int min(int a, int b) {
    return (a < b) ? a : b;
}
```

## 📖 使用示例

完整的函数实现示例：

```c
/**
 * 投递发送工作请求到指定QP
 *
 * @param res    RDMA资源结构，不能为NULL
 * @param qp_idx 目标QP的索引（多QP模式）
 * @param msg    要发送的消息数据
 * @return       成功返回0，失败返回负错误码
 *
 * @note 必须在QP处于RTS状态后调用
 * @see post_receive() 确保接收端已投递接收请求
 */
int post_send_qp(struct rdma_resources *res, uint32_t qp_idx, 
                  const char *msg) {
    /* 参数检查 */
    if (res == NULL || msg == NULL) {
        return -EINVAL;
    }
    
    if (qp_idx >= res->num_qp) {
        return -ERANGE;
    }
    
    /* 边界检查 */
    size_t msg_len = strlen(msg);
    if (msg_len >= DEFAULT_MSG_SIZE) {
        return -EMSGSIZE;
    }
    
    /* 构建工作请求 */
    struct ibv_send_wr send_wr;
    struct ibv_sge send_sge;
    struct ibv_send_wr *bad_send_wr = NULL;
    
    memset(&send_wr, 0, sizeof(send_wr));
    memset(&send_sge, 0, sizeof(send_sge));
    
    send_sge.addr = (uintptr_t)res->buf;
    send_sge.length = msg_len;
    send_sge.lkey = res->mr->lkey;
    
    send_wr.wr_id = qp_idx;  /* 用wr_id存储QP索引 */
    send_wr.sg_list = &send_sge;
    send_wr.num_sge = 1;
    send_wr.opcode = IBV_WR_SEND;
    send_wr.send_flags = IBV_SEND_SIGNALED;
    
    /* 投递 */
    int ret = ibv_post_send(res->qp_list[qp_idx], &send_wr, 
                             &bad_send_wr);
    if (ret) {
        fprintf(stderr, "Failed to post send on QP %u: %d\n", 
                qp_idx, ret);
        return -ret;
    }
    
    return 0;
}
```

---

**文档更新**: 2026年2月6日  
**适用范围**: 所有C语言代码  
**强制程度**: 必须遵守 ✅
