# 📚 AI编程规范 - 快速导航

## 🎯 根据你的需求快速查找

### "我要编写代码"

**必读文档** (按优先级):
1. [C编码规范](specs/_conventions.md) - 所有代码必须遵守
2. [相关模块规范](specs/_index.md) - 模块API和实现
3. [代码示例](specs/modules/common.md) - 参考实现框架

**典型流程**:
```
需求 → 查看模块规范 → 参考编码规范 → 编写代码 → 遵守清单 → 编译和测试
```

### "我要修改现有代码"

**步骤**:
1. 找到相关的[模块规范](specs/_index.md)
2. 理解当前实现
3. 参考[编码规范](specs/_conventions.md)修改
4. 更新模块规范文档
5. 重新编译和测试

**例子**: 修改 `post_send_qp()` 函数
- 打开 [modules/common.md](specs/modules/common.md)
- 查找 `post_send_qp()` API说明
- 理解其功能和约束
- 修改实现，遵循编码规范

### "我要添加新功能"

**步骤**:
1. 在[模块规范](specs/_index.md)中设计新API
2. 写Doxygen注释
3. 添加到对应的.h文件
4. 在.c文件中实现
5. 遵循[编码规范](specs/_conventions.md)
6. 更新模块规范文档

**例子**: 添加RDMA WRITE操作
- 在 modules/common.md 中添加设计说明
- 在 rdma_common.h 中添加函数声明
- 在 rdma_common.c 中实现函数
- 按照 _conventions.md 编码

### "我想了解项目架构"

**推荐顺序**:
1. [项目规范手册](specs/README.md) - 全景图
2. [模块规范索引](specs/_index.md) - 模块关系
3. [通用模块规范](specs/modules/common.md) - 核心API
4. [服务端规范](specs/modules/server.md) - 实现例子
5. [客户端规范](specs/modules/client.md) - 实现例子

### "项目出现问题"

**查找步骤**:
1. 编译问题 → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. 运行时错误 → [QUICKFIX.md](QUICKFIX.md)
3. 理解错误原因 → 相关的[模块规范](specs/_index.md)
4. 检查代码是否遵守[编码规范](specs/_conventions.md)

### "我要学习RDMA编程"

**学习路径**:
1. **初学** (1-2小时)
   - [README.md](README.md) - 项目概览
   - [specs/README.md](specs/README.md) - 规范概览
   - 编译和运行基础示例

2. **入门** (3-5小时)
   - [modules/common.md](specs/modules/common.md) - 理解RDMA核心
   - [modules/server.md](specs/modules/server.md) - 理解服务端
   - 跟踪代码执行流程

3. **进阶** (5-10小时)
   - [_conventions.md](specs/_conventions.md) - 深入编码规范
   - 修改代码添加日志
   - 从单QP升级到多QP

4. **精通** (10+小时)
   - 添加WRITE/READ等操作
   - 性能优化和调测
   - 自己实现新功能

---

## 📖 文档导航表

### 按目的分类

| 目的 | 首选文档 | 备选文档 |
|------|---------|---------|
| 快速开始 | [README.md](README.md) | [specs/README.md](specs/README.md) |
| 编码规范 | [_conventions.md](specs/_conventions.md) | [RULE.md](RULE.md) |
| API参考 | [modules/common.md](specs/modules/common.md) | [CLAUDE.md](.github/copilot-instructions.md) |
| 服务端 | [modules/server.md](specs/modules/server.md) | rdma_server.c源码 |
| 客户端 | [modules/client.md](specs/modules/client.md) | rdma_client.c源码 |
| 多QP详解 | [MULTI_QP_README.md](MULTI_QP_README.md) | [modules/common.md](specs/modules/common.md) |
| 故障排查 | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | [QUICKFIX.md](QUICKFIX.md) |
| 项目设计 | [CLAUDE.md](.github/copilot-instructions.md) | [specs/README.md](specs/README.md) |

### 按文件类型分类

**规范文档**:
- [specs/_conventions.md](specs/_conventions.md) - C编码规范
- [specs/_index.md](specs/_index.md) - 规格索引
- [specs/modules/](specs/modules/) - 模块规范

**项目文档**:
- [README.md](README.md) - 项目说明
- [specs/README.md](specs/README.md) - 规范手册
- [CLAUDE.md](.github/copilot-instructions.md) - Copilot指导
- [RULE.md](RULE.md) - 编码规范原始版

**技术文档**:
- [MULTI_QP_README.md](MULTI_QP_README.md) - 多QP实现
- [MULTI_QP_SUMMARY.md](MULTI_QP_SUMMARY.md) - 改造总结
- [MULTI_QP_QUICK_REFERENCE.md](MULTI_QP_QUICK_REFERENCE.md) - 快速参考
- [QP_STATE_USAGE.md](QP_STATE_USAGE.md) - QP状态管理

**故障文档**:
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 详细排查
- [QUICKFIX.md](QUICKFIX.md) - 快速修复

**报告文档**:
- [MULTI_QP_CHECKLIST.md](MULTI_QP_CHECKLIST.md) - 完成清单
- [SPECS_COMPLETION_REPORT.md](SPECS_COMPLETION_REPORT.md) - 改造报告

---

## 🔍 文档搜索索引

### 想查找具体内容

**函数/API**:
- `ibv_` 开头的库函数 → [modules/common.md](specs/modules/common.md)
- `post_receive`, `post_send` → [modules/common.md](specs/modules/common.md)
- `modify_qp_to_*` → [modules/common.md](specs/modules/common.md)
- `sock_sync_data` → [modules/common.md](specs/modules/common.md)
- `poll_completion` → [modules/common.md](specs/modules/common.md)

**概念**:
- RoCEv2 → [README.md](README.md), [MULTI_QP_README.md](MULTI_QP_README.md)
- QP状态机 → [modules/common.md](specs/modules/common.md), [QP_STATE_USAGE.md](QP_STATE_USAGE.md)
- 多QP设计 → [MULTI_QP_README.md](MULTI_QP_README.md), [modules/common.md](specs/modules/common.md)
- TCP同步 → [modules/server.md](specs/modules/server.md), [modules/client.md](specs/modules/client.md)
- RNR错误 → [TROUBLESHOOTING.md](TROUBLESHOOTING.md), [modules/server.md](specs/modules/server.md)

**编码规则**:
- 命名规范 → [_conventions.md](specs/_conventions.md#命名规范)
- 函数规范 → [_conventions.md](specs/_conventions.md#函数规范)
- 注释规范 → [_conventions.md](specs/_conventions.md#注释规范)
- 内存管理 → [_conventions.md](specs/_conventions.md#内存管理规范)
- 错误处理 → [_conventions.md](specs/_conventions.md#错误处理规范)

**代码位置**:
- 服务端实现 → [modules/server.md](specs/modules/server.md)
- 客户端实现 → [modules/client.md](specs/modules/client.md)
- RDMA核心 → [modules/common.md](specs/modules/common.md)

---

## ⚡ 高频问题快速答案

### Q: 如何开始编写符合规范的代码?
A: 
1. 阅读 [_conventions.md](specs/_conventions.md) 的快速清单部分
2. 参考相关模块规范中的代码框架
3. 按照清单逐项检查

### Q: 我的代码编译失败，怎么办?
A:
1. 检查 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) 中的常见错误
2. 查看 [QUICKFIX.md](QUICKFIX.md) 的快速修复
3. 验证 [_conventions.md](specs/_conventions.md) 的语法规范

### Q: 如何理解QP状态转移?
A:
1. 查看 [modules/common.md](specs/modules/common.md) 中的流程图
2. 阅读各个 `modify_qp_to_*()` 函数的说明
3. 参考 [QP_STATE_USAGE.md](QP_STATE_USAGE.md)

### Q: 多QP模式怎么用?
A:
1. 快速了解 → [MULTI_QP_QUICK_REFERENCE.md](MULTI_QP_QUICK_REFERENCE.md)
2. 完整理解 → [MULTI_QP_README.md](MULTI_QP_README.md)
3. API说明 → [modules/common.md](specs/modules/common.md) 中的多QP函数

### Q: 怎样添加新的RDMA操作(如WRITE)?
A:
1. 设计: 在 [modules/common.md](specs/modules/common.md) 中添加设计说明
2. 声明: 在头文件中添加Doxygen注释
3. 实现: 遵循 [_conventions.md](specs/_conventions.md) 编码
4. 文档: 更新模块规范

### Q: 代码应该怎么注释?
A:
1. 文件头: [_conventions.md](specs/_conventions.md#文件头注释)
2. 函数: [_conventions.md](specs/_conventions.md#公开函数文档)
3. 行内: [_conventions.md](specs/_conventions.md#行内注释)

### Q: 内存分配失败了怎么办?
A:
1. 查看 [_conventions.md](specs/_conventions.md#内存管理规范)
2. 参考错误处理的goto模式
3. 参考各模块中的错误清理代码

### Q: 如何运行项目?
A:
1. 编译: `make clean && make`
2. 服务端: `./build/rdma_server rxe0 18515 1 4`
3. 客户端: `./build/rdma_client 127.0.0.1 rxe0 18515 1 4`

---

## 📊 文档地图

```
项目根目录
├── 开始阅读
│   ├── README.md ← 项目总体说明
│   ├── specs/README.md ← 规范手册
│   └── SPECS_COMPLETION_REPORT.md ← 改造报告
│
├── 核心规范
│   ├── specs/_conventions.md ← 编码规范 (必读)
│   ├── specs/_index.md ← 规格索引
│   └── specs/modules/
│       ├── common.md ← RDMA核心
│       ├── server.md ← 服务端
│       └── client.md ← 客户端
│
├── 项目文档
│   ├── CLAUDE.md ← AI指导
│   ├── RULE.md ← 编码规范原始版
│   ├── MULTI_QP_README.md ← 多QP详解
│   ├── MULTI_QP_SUMMARY.md ← 改造总结
│   ├── MULTI_QP_QUICK_REFERENCE.md ← 快速参考
│   └── MULTI_QP_CHECKLIST.md ← 完成清单
│
├── 技术文档
│   ├── QP_STATE_USAGE.md ← QP状态说明
│   ├── TROUBLESHOOTING.md ← 故障排查
│   └── QUICKFIX.md ← 快速修复
│
└── 源代码
    ├── src/rdma_common.h ← RDMA头文件
    ├── src/rdma_common.c ← RDMA实现
    ├── src/rdma_server.c ← 服务端
    └── src/rdma_client.c ← 客户端
```

---

## 🎯 推荐阅读顺序

### 快速开始 (30分钟)
1. [README.md](README.md) - 项目概览
2. [specs/README.md](specs/README.md) 的快速开始部分
3. 运行编译和基础示例

### 深入理解 (2-3小时)
1. [modules/common.md](specs/modules/common.md) - 理解RDMA核心
2. [modules/server.md](specs/modules/server.md) - 理解服务端流程
3. [modules/client.md](specs/modules/client.md) - 理解客户端流程
4. 跟踪源代码执行

### 规范学习 (1-2小时)
1. [_conventions.md](specs/_conventions.md) - 完整编码规范
2. 检查清单 - 确保理解所有规范

### 实战编程 (按需)
1. 编码前查看相关模块规范
2. 参考代码示例和框架
3. 遵循编码规范清单
4. 参考错误处理模式

---

## 💡 使用技巧

### 快速查找函数

```bash
# 查找函数定义
grep -r "^int post_send_qp" specs/ src/

# 查找函数使用
grep "post_send_qp" src/*.c

# 查找宏定义
grep "#define.*MAX_QP" specs/ src/
```

### 快速检查编码规范

```bash
# 检查行长度
awk 'length > 100 {print NR": "length" chars"}' src/rdma_common.c

# 检查缩进
grep "^	" src/*.c  # Tab字符（应该用空格）

# 检查函数长度
grep -n "^}" src/rdma_common.c
```

### 快速查看模块关系

在 [specs/_index.md](specs/_index.md) 中有清晰的依赖关系图

### 快速验证多QP配置

```bash
# 查看默认配置
grep "DEFAULT_NUM_QP\|MAX_QP\|CQ_SIZE" src/rdma_common.h

# 查看运行时参数
./build/rdma_server --help  # (如果支持)
```

---

## 📞 文档支持清单

**我想...** | **查看这个文档**
---------|------------------
编写代码 | [specs/_conventions.md](specs/_conventions.md)
理解API | [specs/modules/common.md](specs/modules/common.md)
实现服务端 | [specs/modules/server.md](specs/modules/server.md)
实现客户端 | [specs/modules/client.md](specs/modules/client.md)
学习RoCEv2 | [MULTI_QP_README.md](MULTI_QP_README.md)
查看多QP | [MULTI_QP_QUICK_REFERENCE.md](MULTI_QP_QUICK_REFERENCE.md)
修复bug | [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
快速解决问题 | [QUICKFIX.md](QUICKFIX.md)
了解状态机 | [QP_STATE_USAGE.md](QP_STATE_USAGE.md)
参考实例 | [specs/modules/](specs/modules/)中的代码框架
学习项目 | [specs/README.md](specs/README.md)
查看编码规范 | [RULE.md](RULE.md) 或 [specs/_conventions.md](specs/_conventions.md)

---

## ✅ 规范检查清单

编码前检查:
- [ ] 理解相关的[模块规范](specs/_index.md)
- [ ] 阅读相关的[编码规范](specs/_conventions.md)部分
- [ ] 查看相关的代码示例

编码后检查:
- [ ] 函数不超过80行
- [ ] 参数不超过5个
- [ ] 有Doxygen注释
- [ ] 检查返回值
- [ ] 内存管理正确
- [ ] 错误处理完整

提交前检查:
- [ ] `make clean && make` 通过
- [ ] 无编译警告
- [ ] 遵守编码规范
- [ ] 更新文档
- [ ] 测试功能

---

🎯 **现在你已经了解了整个规范体系，可以开始编程了！**

推荐的第一步: 打开 [specs/_conventions.md](specs/_conventions.md)，快速浏览编码规范。
