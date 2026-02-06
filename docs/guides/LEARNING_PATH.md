# 📚 RoCEv2 学习路径

按照你的目标选择合适的学习线路。

## 🎓 初学者 (1-2小时)

**目标**: 快速了解项目和RDMA基础

1. **第一步** (15分钟)
   - 阅读 [README.md](../../README.md) 项目概览
   - 阅读 [QUICK_START.md](../QUICK_START.md) 快速开始

2. **第二步** (30分钟)
   - 编译和运行基础示例
   - 观察程序输出

3. **第三步** (45分钟)
   - 阅读 [项目架构](../technical/ARCHITECTURE.md)
   - 理解RDMA两平面模型

## 👨‍💻 中级开发者 (3-5小时)

**目标**: 深入理解RDMA编程和项目代码

1. **第一步** (1小时)
   - 阅读 [通用模块规范](../../.ai/modules/common.md)
   - 理解核心RDMA API

2. **第二步** (1小时)
   - 阅读 [服务端规范](../../.ai/modules/server.md)
   - 理解执行流程

3. **第三步** (1.5小时)
   - 阅读 [客户端规范](../../.ai/modules/client.md)
   - 理解同步点和通信

4. **第四步** (1.5小时)
   - 跟踪源代码执行
   - 修改代码添加日志

## 🔬 高级开发者 (10+小时)

**目标**: 精通RDMA编程，能独立扩展功能

1. **第一步** (2小时)
   - 完整阅读 [C编码规范](../../.ai/_conventions.md)
   - 理解所有编码标准

2. **第二步** (3小时)
   - 深入研究 [多QP架构](../technical/MULTI_QP_README.md)
   - 理解多QP设计

3. **第三步** (3小时)
   - 添加新的RDMA操作 (WRITE, READ等)
   - 性能优化和调测

4. **第四步** (2+小时)
   - 自己实现新功能
   - 参与项目贡献

## 🎯 按目标选择

### "我想快速开始"
→ [QUICK_START.md](../QUICK_START.md) (5分钟)

### "我想理解项目"
→ [项目架构](../technical/ARCHITECTURE.md) (30分钟)
→ [通用模块](../../.ai/modules/common.md) (1小时)

### "我想学习编程"
→ 初学者路线 + [C编码规范](../../.ai/_conventions.md)

### "我想贡献代码"
→ 中级路线 + [最佳实践](BEST_PRACTICES.md)

### "我想精通RDMA"
→ 高级路线 + [多QP详解](../technical/MULTI_QP_README.md)
