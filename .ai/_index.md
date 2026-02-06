# RoCEv2 项目规格索引

本目录包含所有模块的规范文档，用于指导AI编程和代码生成。

## 📚 核心文档

### [编码规范](_conventions.md)
- C语言编码标准
- 函数和文件规范
- 命名约定
- 注释规范
- 内存管理规则
- 错误处理标准
- 安全编码规范

## 🏗️ 模块规范

### [通用模块](modules/common.md)
**职责**: RDMA基础设施，被所有模块使用
- RDMA资源生命周期管理
- 内存注册和保护域
- QP状态机控制
- 完成队列轮询
- TCP元数据交换

**暴露接口**:
- `struct rdma_resources`：RDMA资源容器
- `init_rdma_resources()`：初始化所有RDMA对象
- `modify_qp_to_init/rtr/rts()`：QP状态转移
- `post_receive/send()`：工作请求投递
- `poll_completion()`：完成队列轮询
- `cleanup_rdma_resources()`：资源清理

**关键实现细节**:
- RoCEv2的GID索引必须 >= 1
- 必须等待接收WR投递完成再发送
- CQ大小根据预期工作数量计算
- MR必须包含所有RDMA操作的缓冲区

### [服务端模块](modules/server.md)
**职责**: RDMA服务端程序
- TCP监听和连接接受
- QP配置和连接建立
- 接收和发送数据
- 异常处理和资源清理

**依赖关系**:
- 通用模块 (common)

### [客户端模块](modules/client.md)
**职责**: RDMA客户端程序
- TCP连接初始化
- QP配置和连接建立
- 发送和接收数据
- 异常处理和资源清理

**依赖关系**:
- 通用模块 (common)

## 🔄 多QP扩展

### 多QP架构设计
- 共享CQ模型：单个完成队列处理所有QP的完成事件
- 独立RQ/SQ：每个QP有独立的接收队列和发送队列
- wr_id映射：使用工作请求ID存储QP索引用于事件路由

### 多QP相关接口
- `create_qp_list()`：批量创建QP
- `modify_qp_list_to_init/rtr/rts()`：批量状态转移
- `post_receive_qp()`：为指定QP投递接收请求
- `post_receive_all()`：为所有QP投递接收请求
- `post_send_qp()`：为指定QP投递发送请求
- `sock_sync_data_multi()`：TCP多QP元数据交换

## 📊 模块依赖关系

```
    Server          Client
      |               |
      +------ Common -----+
             (RDMA核心)
```

## 🎯 AI编程指南

### 代码生成要求
1. **遵循编码规范** - 参考 `_conventions.md` 中的所有规则
2. **模块化设计** - 每个文件只实现一个模块
3. **完整的错误处理** - 检查所有可能失败的调用
4. **充分的文档** - Doxygen格式的函数注释
5. **单元可测性** - 尽量独立，易于单独测试

### 修改现有代码时
1. **遵守现有风格** - 保持代码一致性
2. **更新相关文档** - 修改功能时同步更新规范
3. **验证构建** - 修改后必须通过编译
4. **测试依赖** - 考虑对其他模块的影响

### 添加新功能时
1. 在规范中定义新模块或扩展现有模块
2. 在 `modules/` 目录创建或更新规范文档
3. 实现符合规范的代码
4. 更新 `_index.md` 反映新模块
5. 完成功能后创建一个git commit

## 🔗 相关文档

- [README.md](../README.md) - 项目总体说明
- [CLAUDE.md](../.github/copilot-instructions.md) - Copilot指导文档
- [RULE.md](../RULE.md) - C语言编码规范
- [MULTI_QP_README.md](../MULTI_QP_README.md) - 多QP详细说明
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - 故障排除指南

## 📝 文档维护

- 规范文档应与实现代码同步更新
- 每次重要修改都应在对应的规范中记录
- 定期审查规范的准确性和完整性

---

**最后更新**: 2026年2月6日  
**项目版本**: Multi-QP 1.0  
**状态**: AI编程规范就绪 ✅
