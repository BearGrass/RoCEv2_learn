# 🚀 新需求实践快速卡片

这是一份快速参考，对应完整的 [开发工作流指南](DEVELOPMENT_WORKFLOW.md)。

## 🎯 三层级实践方式

| 需求类型 | 规模 | 实践方式 | 举例 |
|---------|------|---------|------|
| 轻量级 | 小 | 直接修改→测试→提交→推送 | Bug修复、单文件改动 |
| 功能级 | 中 | 分析→设计→实现→文档→提交→推送 | 新功能、模块增强 |
| 项目级 | 大 | 规划→设计→分阶段→发布→tag | 大型改造、架构调整 |

## 📋 完整流程（功能级需求示例）

### 1️⃣ 需求分析
```
需求：添加RDMA WRITE操作支持

明确：
- 要修改什么文件 (rdma_common.h/c)
- 需要更新什么文档 (ARCHITECTURE.md)
- 如何验证完成 (编译✓ + 测试✓)
```

### 2️⃣ 查看规范
```bash
cat .ai/_conventions.md        # 编码规范
cat .ai/modules/common.md      # 通用库规范
```

### 3️⃣ 代码实现
```bash
# 遵循规范编码
vim src/rdma_common.h
vim src/rdma_common.c

# 添加函数声明和实现
# 完整的Doxygen注释
# 清晰的错误处理
```

### 4️⃣ 编译和测试
```bash
# 编译
make clean && make

# 测试
./build/rdma_server rxe0 18515 1 4    # 终端1
./build/rdma_client 127.0.0.1 rxe0 18515 1 4  # 终端2
```

### 5️⃣ 文档更新
```bash
vim docs/technical/ARCHITECTURE.md
vim .ai/modules/common.md

# 添加功能说明、代码示例、注意事项
```

### 6️⃣ 提交代码
```bash
git add src/rdma_common.h src/rdma_common.c
git commit -m "feat: 添加RDMA WRITE操作支持

- 在rdma_common.h添加post_rdma_write()
- 实现WRITE逻辑
- 支持所有QP
- 完整的参数验证和错误处理

测试通过，文档更新"
```

### 7️⃣ 推送代码
```bash
git push origin main
```

### 8️⃣ 发布版本（重要功能）
```bash
git tag -a v1.1 -m "Release v1.1 - 添加WRITE操作"
git push origin v1.1
```

## 🔗 参考资源速查

| 问题 | 查看文档 |
|-----|--------|
| 编码风格/命名规范 | `.ai/_conventions.md` |
| 通用库怎么写 | `.ai/modules/common.md` |
| 服务端怎么写 | `.ai/modules/server.md` |
| 客户端怎么写 | `.ai/modules/client.md` |
| 怎么提交代码 | `docs/guides/BEST_PRACTICES.md` |
| 项目架构是什么 | `docs/technical/ARCHITECTURE.md` |
| 多QP怎么用 | `docs/technical/MULTI_QP_README.md` |
| 遇到问题怎么办 | `docs/troubleshooting/TROUBLESHOOTING.md` |

## 💡 提交信息类型

```
feat     新功能
fix      bug修复
refactor 重构
docs     文档
perf     性能
style    格式
test     测试
```

**示例：**
```bash
git commit -m "feat: 添加WRITE操作"                      # ✅ 好
git commit -m "add RDMA write function support"        # ✅ 好
git commit -m "修改代码"                                 # ❌ 差
git commit -m "various changes"                        # ❌ 差
```

## ✅ 发布前检查清单

### 代码检查
- [ ] 编译无错误（警告可以有）
- [ ] 遵守编码规范
- [ ] 有完整的注释
- [ ] 错误处理完整
- [ ] 测试通过

### 文档检查
- [ ] 更新了相关文档
- [ ] 代码示例正确
- [ ] 说明清晰完整

### Git检查
- [ ] 提交信息清晰
- [ ] 提交粒度合理
- [ ] 本地测试通过

## 🎓 三个典型案例

### 案例1：修复bug（5分钟）
```bash
vim scripts/diagnose.sh
./scripts/diagnose.sh  # 测试
git add scripts/diagnose.sh
git commit -m "fix: 修复diagnose.sh bug"
git push origin main
```

### 案例2：添加新功能（30分钟）
```bash
# 1. 规范检查
cat .ai/modules/common.md

# 2. 实现功能
vim src/rdma_common.h src/rdma_common.c

# 3. 编译测试
make clean && make && ./build/rdma_server ...

# 4. 更新文档
vim docs/technical/ARCHITECTURE.md

# 5. 提交推送
git add -A
git commit -m "feat: 新功能说明"
git push origin main
```

### 案例3：大型改造（1天+）
```bash
# 1. 设计规范
cat .ai/modules/common.md

# 2. 分阶段实现
git commit -m "feat: stage1"
git commit -m "feat: stage2"
git commit -m "feat: stage3"

# 3. 文档更新
git commit -m "docs: 更新文档"

# 4. 推送和发布
git push origin main
git tag -a v1.1 -m "..."
git push origin v1.1
```

## 📞 需要更多帮助？

查看完整指南：[开发工作流指南](DEVELOPMENT_WORKFLOW.md)

或者参考项目规范和最佳实践：
- 编码规范: `.ai/_conventions.md`
- 最佳实践: `docs/guides/BEST_PRACTICES.md`
- 学习路径: `docs/guides/LEARNING_PATH.md`
