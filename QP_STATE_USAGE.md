# QP运行时状态打印功能说明

## 功能介绍

新增的 `print_qp_state()` 函数可以查询并打印Queue Pair (QP)的所有运行时状态信息。该函数会显示QP的各种属性，包括：

### 打印的信息类型

1. **基本信息**
   - QP号（QP Number）
   - QP类型（RC/UC/UD等）

2. **QP状态**
   - 当前状态：RESET → INIT → RTR → RTS

3. **队列容量**
   - Send Queue 最大WR数和SGE数
   - Receive Queue 最大WR数和SGE数
   - 内联数据大小

4. **端口配置**
   - 端口号
   - PKEY索引

5. **Packet Sequence Numbers (PSN)**
   - SQ PSN（发送队列PSN）
   - RQ PSN（接收队列PSN）

6. **路径MTU**
   - 路径最大传输单元

7. **可靠性参数**
   - 超时时间（毫秒）
   - 重试次数
   - RNR重试次数和最小超时

8. **RDMA操作限制**
   - 最大本地未完成RDMA读/原子操作
   - 最大远端未完成RDMA读/原子操作

9. **访问权限**
   - Local Write
   - Remote Write
   - Remote Read
   - Remote Atomic

10. **寻址信息 (Address Handle)**
    - 远端LID
    - Service Level
    - Port Number
    - Global Routing信息（GID、Flow Label等）

11. **远端QP信息**
    - 远端QP号

## 函数声明

```c
/**
 * 打印QP的运行时状态
 * 查询并打印QP的当前属性和状态信息
 * @param res: RDMA资源结构体指针
 * @param title: 状态标题（可选，用于标识打印的上下文）
 * @return: 成功返回0，失败返回-1
 */
int print_qp_state(struct rdma_resources *res, const char *title);
```

## 使用示例

在RDMA服务端代码中，已在以下关键位置添加了状态打印：

### 1. INIT状态后
```c
if (modify_qp_to_init(&res)) {
    fprintf(stderr, "修改QP到INIT失败\n");
    rc = 1;
    goto cleanup;
}

/* 打印QP状态：INIT阶段 */
print_qp_state(&res, "INIT状态");
```

### 2. RTR状态后
```c
if (modify_qp_to_rtr(&res, &remote_con_data)) {
    fprintf(stderr, "修改QP到RTR失败\n");
    rc = 1;
    goto cleanup;
}

/* 打印QP状态：RTR阶段 */
print_qp_state(&res, "RTR状态");
```

### 3. RTS状态后
```c
if (modify_qp_to_rts(&res)) {
    fprintf(stderr, "修改QP到RTS失败\n");
    rc = 1;
    goto cleanup;
}

printf("\n========== RDMA连接已建立 ==========\n");

/* 打印QP状态：RTS阶段 */
print_qp_state(&res, "RTS状态（RDMA连接已建立）");
```

## 在自己的代码中使用

你可以在任何需要了解QP状态的地方调用此函数：

```c
#include "rdma_common.h"

// 在任何位置打印QP状态
print_qp_state(&res, "自定义标题");
```

## 输出示例

函数会以美观的表格格式输出QP状态信息，如：

```
╔════════════════════════════════════════════════════════════╗
║  QP运行时状态 - INIT状态
║────────────────────────────────────────────────────────────║
║
║ 【基本信息】
║  QP号: 0x000001
║  QP类型: RC (Reliable Connection)
║
║ 【QP状态】
║  当前状态: INIT
║
║ 【队列容量】
║  Send Queue:
║    - 最大WR数: 16
║    - 最大SGE数: 1
║  Receive Queue:
║    - 最大WR数: 16
║    - 最大SGE数: 1
║  内联数据大小: 0
│
... (其他状态信息)
║
╚════════════════════════════════════════════════════════════╝
```

## 编译

确保代码已编译：
```bash
make clean && make
```

## 调试建议

1. **查看状态转换过程**：通过在各个状态转换点调用此函数，可以追踪QP状态的演变
2. **诊断连接问题**：如果RDMA连接失败，打印QP状态可以帮助诊断问题
3. **验证配置**：确认PSN、LID、GID等配置是否正确
4. **性能分析**：了解QP的各项参数配置

## 注意事项

- 该函数使用 `ibv_query_qp()` 查询QP属性，不会修改QP状态
- 如果QP处于RESET或INIT状态，寻址信息（Address Handle）不会显示
- 超时时间的计算公式：超时(ms) = (1 << timeout) × 4.096 / 1000
