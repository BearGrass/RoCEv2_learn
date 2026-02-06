# 🎯 新需求实践指南

本指南说明如何在RoCEv2_learn项目中创建和实践新需求。

## 📋 需求管理框架

### 三个层级的实践方式

#### 1️⃣ 轻量级需求（Bug修复、小改动）
适合：单文件修改、小功能补丁

```
修复/改动 → 代码实现 → 测试验证 → git commit → 直接推送
```

#### 2️⃣ 功能级需求（新功能、模块增强）
适合：涉及多文件、需要文档更新

```
需求分析 → 规范设计 → 代码实现 → 文档更新 → git commit → PR审查 → 合并推送
```

#### 3️⃣ 项目级需求（大型改造、架构调整）
适合：跨越多个模块、影响全局

```
项目计划 → 规范制定 → 分阶段实现 → 完整文档 → 发布报告 → tag发布
```

---

## 🔄 完整实践流程

### 第一步：需求分析和规划

**创建需求文档** (可选，存放在 `reports/` 或 `docs/`)

```
需求名称：[简短描述]
优先级：   [高/中/低]
影响范围： [描述涉及的模块]
交付时间： [预计完成时间]
验收标准： [如何验证完成]
```

**示例需求：** "添加RDMA WRITE操作支持"

### 第二步：设计阶段

#### 参考规范文档

根据需求性质，查阅相关规范：

```
┌─────────────────────────────────────────────┐
│         参考 .ai/ 目录的规范               │
├─────────────────────────────────────────────┤
│ • .ai/_conventions.md                       │
│   └─ 编码标准、命名规范、注释要求         │
│                                              │
│ • .ai/modules/common.md                    │
│   └─ 通用库设计、函数接口规范              │
│                                              │
│ • .ai/modules/server.md                    │
│   └─ 服务端模块设计、流程规范              │
│                                              │
│ • .ai/modules/client.md                    │
│   └─ 客户端模块设计、流程规范              │
└─────────────────────────────────────────────┘
```

#### 设计检查清单

在开始实现前，确认以下事项：

- [ ] 明确要修改或创建哪些文件
- [ ] 理解相关的模块规范
- [ ] 确定函数签名和接口
- [ ] 考虑向后兼容性
- [ ] 规划文档更新内容

### 第三步：代码实现

#### 3.1 遵守编码规范

**参考 `.ai/_conventions.md`，确保：**

```c
// ✅ 正确：遵循规范
/**
 * 描述函数功能
 * @param param1 参数说明
 * @return 返回值说明
 */
int my_new_function(int param1, int param2)
{
    // 实现逻辑
    // 每行不超过100字符
    // 函数不超过80行
    // 清晰的错误处理
    if (param1 == NULL) {
        fprintf(stderr, "Error: param1 is NULL\n");
        return -EINVAL;
    }
    
    return 0;
}

// ❌ 错误：违反规范
int myNewFunction(int a,int b,int c,int d,int e)
{int x; x=a+b+c+d+e;
return x;}
```

#### 3.2 模块更新策略

**如果修改 `rdma_common.h/c`（通用库）：**

1. 查看 `.ai/modules/common.md` 的设计规范
2. 确保函数名称遵循规范
3. 添加完整的Doxygen注释
4. 更新README或文档

**示例：添加新的RDMA操作**

```c
// 在 rdma_common.h 中声明
/**
 * 投递RDMA WRITE请求
 * @param res RDMA资源指针
 * @param qp_index QP索引
 * @param local_addr 本地地址
 * @param remote_addr 远程地址
 * @param size 传输大小
 * @return 0成功, 负数表示错误
 */
int post_rdma_write(struct rdma_resources *res, int qp_index,
                    uint64_t local_addr, uint64_t remote_addr,
                    uint32_t size);

// 在 rdma_common.c 中实现
int post_rdma_write(struct rdma_resources *res, int qp_index,
                    uint64_t local_addr, uint64_t remote_addr,
                    uint32_t size)
{
    // 参数验证
    if (res == NULL || qp_index >= res->num_qp) {
        return -EINVAL;
    }
    
    // 实现逻辑
    // ...
    
    return 0;
}
```

### 第四步：测试验证

#### 编译测试

```bash
# 清理旧编译
make clean

# 重新编译
make

# 查看编译结果
ls -lh build/rdma_*
```

#### 功能测试

```bash
# 终端1：启动服务端
./build/rdma_server rxe0 18515 1 4

# 终端2：启动客户端
./build/rdma_client 127.0.0.1 rxe0 18515 1 4

# 观察输出验证新功能
```

#### 测试检查清单

- [ ] 代码编译无错误（允许benign warnings）
- [ ] 程序运行无崩溃
- [ ] 新功能按预期工作
- [ ] 不破坏现有功能
- [ ] 内存无泄漏（valgrind检查可选）

### 第五步：文档更新

#### 5.1 选择合适的文档位置

根据改动类型更新文档：

```
如果修改了...           更新这个文档
═══════════════════════════════════════════════
核心库(rdma_common)     → docs/technical/ARCHITECTURE.md
                        → .ai/modules/common.md

服务端(rdma_server)     → .ai/modules/server.md
                        → docs/guides/LEARNING_PATH.md

客户端(rdma_client)     → .ai/modules/client.md
                        → docs/guides/LEARNING_PATH.md

新增功能(如WRITE操作)   → docs/technical/MULTI_QP_README.md
                        → docs/troubleshooting/FAQ.md

编码规范变化           → .ai/_conventions.md
                        → docs/guides/BEST_PRACTICES.md
```

#### 5.2 文档更新模板

**对于新功能，在相关技术文档中添加：**

```markdown
## 新功能：RDMA WRITE操作

### 功能说明
描述该功能做什么，为什么需要这个功能。

### 使用方法
```c
// 代码示例
int ret = post_rdma_write(res, qp_index, local, remote, size);
if (ret != 0) {
    // 错误处理
}
```

### 注意事项
- 列出使用时需要注意的事项
- 与现有功能的交互关系
- 性能考虑

### 参考
- 参考规范文档位置
- 相关源代码文件
```

### 第六步：代码提交

#### 6.1 提交前的检查清单

```bash
# 查看改动的文件
git status

# 查看具体改动
git diff src/rdma_common.c  # 查看某个文件的改动

# 仅当确认无误后才提交
```

#### 6.2 遵循提交规范

**提交信息格式：**

```
<type>: <subject>

<body>

<footer>
```

**类型（type）：**
- `feat`: 新功能
- `fix`: bug修复
- `refactor`: 代码重构
- `docs`: 文档更新
- `style`: 格式调整
- `test`: 测试相关
- `perf`: 性能优化

**示例提交：**

```bash
git add src/rdma_common.h src/rdma_common.c docs/technical/ARCHITECTURE.md

git commit -m "feat: 添加RDMA WRITE操作支持

- 在rdma_common.h添加post_rdma_write()函数声明
- 在rdma_common.c实现RDMA WRITE逻辑
- 支持所有QP的写操作
- 添加参数验证和错误处理
- 更新架构文档说明新操作

测试：
- 编译通过无错误
- 功能测试验证成功
- 不破坏现有功能

相关规范：
- .ai/_conventions.md (编码规范)
- .ai/modules/common.md (通用库规范)
"
```

#### 6.3 提交最佳实践

```bash
# 1. 保持提交粒度合理（不要一次性提交过多文件）
# 2. 每个提交应该是可工作的完整功能
# 3. 描述WHY而不仅仅是WHAT

# 好的做法：小的、有意义的提交
git commit -m "feat: 添加WRITE操作"
git commit -m "docs: 更新ARCHITECTURE说明WRITE操作"
git commit -m "test: 验证WRITE操作功能"

# 不好的做法：一个巨大的提交包含所有
# git commit -m "各种改动" (这样无法理解改动内容)
```

### 第七步：代码推送

#### 7.1 推送到远程仓库

```bash
# 查看本地和远程的关系
git log --oneline -5
git log --oneline -5 origin/main

# 推送到远程
git push origin main

# 验证推送成功
git log --oneline -5 origin/main
```

#### 7.2 处理推送冲突

如果出现冲突：

```bash
# 1. 获取最新的远程代码
git fetch origin

# 2. 查看冲突内容
git diff main origin/main

# 3. 进行合并
git merge origin/main

# 4. 解决冲突（编辑文件）
# vim conflicted_file.c

# 5. 标记为已解决
git add conflicted_file.c

# 6. 完成合并
git commit -m "Merge remote changes"

# 7. 重新推送
git push origin main
```

### 第八步：发布版本（可选）

如果是重要的功能发布，可以创建新的版本标签：

```bash
# 创建新版本标签
git tag -a v1.1 -m "Release v1.1 - 添加RDMA WRITE操作支持

新增功能：
- RDMA WRITE操作
- 支持所有QP
- 完整的错误处理

改进：
- 代码质量提升
- 文档更新

"

# 推送标签到远程
git push origin v1.1

# 查看所有标签
git tag -l
```

---

## 📝 实践案例

### 案例1：简单bug修复

**需求：** 修复diagnose.sh脚本中的一个bug

**实践流程：**

```bash
# 1. 编辑脚本
vim scripts/diagnose.sh

# 2. 测试
./scripts/diagnose.sh

# 3. 提交
git add scripts/diagnose.sh
git commit -m "fix: 修复diagnose.sh中的设备列表显示问题"

# 4. 推送
git push origin main
```

### 案例2：添加新的RDMA操作

**需求：** 添加RDMA READ操作支持

**实践流程：**

```bash
# 1. 查看规范
cat .ai/modules/common.md

# 2. 编辑源文件
vim src/rdma_common.h   # 添加函数声明
vim src/rdma_common.c   # 实现函数

# 3. 编译测试
make clean && make

# 4. 编辑服务端和客户端（如果需要）
vim src/rdma_server.c
vim src/rdma_client.c

# 5. 功能测试
./build/rdma_server rxe0 18515 1 4  # 终端1
./build/rdma_client 127.0.0.1 rxe0 18515 1 4  # 终端2

# 6. 更新文档
vim docs/technical/ARCHITECTURE.md
vim .ai/modules/common.md

# 7. 提交代码
git add -A
git commit -m "feat: 添加RDMA READ操作支持

- 在rdma_common.h添加post_rdma_read()函数
- 实现RDMA READ逻辑
- 支持所有QP的读操作
- 更新相关文档
"

# 8. 推送
git push origin main
```

### 案例3：重大功能改造

**需求：** 支持多种传输类型（当前仅RC）

**实践流程：**

```bash
# 1. 规划和设计
# 编辑设计文档 (可选)
cat > FEATURE_DESIGN.md << 'EOF'
# 多传输类型支持设计

## 目标
支持RC、UC、RD等多种传输类型

## 影响范围
- rdma_common.h/c (核心修改)
- 新增传输类型选择参数
- 文档更新

## 交付标准
- 代码完成
- 测试通过
- 文档完整
EOF

# 2. 更新规范（如果影响规范）
vim .ai/modules/common.md

# 3. 分阶段实现
git add src/rdma_common.h
git commit -m "feat: 添加传输类型选择参数"

git add src/rdma_common.c
git commit -m "feat: 实现多传输类型支持逻辑"

git add src/rdma_server.c src/rdma_client.c
git commit -m "feat: 客户端和服务端支持多传输类型"

git add docs/
git commit -m "docs: 更新文档说明多传输类型"

# 4. 测试
make clean && make
# 测试RC
./build/rdma_server rxe0 18515 1 4
./build/rdma_client 127.0.0.1 rxe0 18515 1 4

# 5. 推送
git push origin main

# 6. 发布新版本
git tag -a v1.1 -m "Release v1.1 - 多传输类型支持"
git push origin v1.1
```

---

## 🎓 学习资源

在实践过程中可以参考：

| 资源 | 位置 | 用途 |
|-----|-----|------|
| 编码规范 | `.ai/_conventions.md` | 遵循编码标准 |
| 通用库设计 | `.ai/modules/common.md` | 理解核心库 |
| 服务端规范 | `.ai/modules/server.md` | 服务端开发 |
| 客户端规范 | `.ai/modules/client.md` | 客户端开发 |
| 快速开始 | `docs/QUICK_START.md` | 快速上手 |
| 项目架构 | `docs/technical/ARCHITECTURE.md` | 理解设计 |
| 多QP详解 | `docs/technical/MULTI_QP_README.md` | 深入了解 |
| 最佳实践 | `docs/guides/BEST_PRACTICES.md` | 开发工作流 |

---

## ✅ 检查清单

每个新需求实践都应该包括：

### 代码方面
- [ ] 遵守 `.ai/_conventions.md` 编码规范
- [ ] 参考相关模块规范
- [ ] 添加完整的Doxygen注释
- [ ] 处理错误情况
- [ ] 编译无错误警告
- [ ] 功能测试通过

### 文档方面
- [ ] 更新相关的技术文档
- [ ] 更新规范文档（如需）
- [ ] 添加使用示例
- [ ] 更新FAQ（如适用）
- [ ] 更新学习路径（如影响学习内容）

### Git方面
- [ ] 提交信息清晰完整
- [ ] 提交粒度合理
- [ ] 遵守commit规范
- [ ] 本地测试通过后再推送
- [ ] 推送到正确的分支

### 版本发布
- [ ] 创建合适的版本标签
- [ ] 标签消息完整详细
- [ ] 推送标签到远程

---

## 🚀 快速命令参考

```bash
# 开发流程
make clean && make                  # 编译
git add -A && git commit -m "..."   # 提交
git push origin main                # 推送

# 查看状态
git status                          # 查看改动
git diff                            # 查看详细改动
git log --oneline -5                # 查看最近提交

# 版本管理
git tag -a v1.x -m "说明"           # 创建标签
git push origin v1.x                # 推送标签
git tag -l                          # 列出所有标签

# 参考规范
cat .ai/_conventions.md             # 编码规范
cat .ai/modules/common.md           # 通用库规范
cat docs/guides/BEST_PRACTICES.md   # 最佳实践
```

---

**现在你已经准备好在RoCEv2_learn项目中实践新需求了！** 🎉

有任何问题可以参考项目文档或规范文件。祝实践顺利！
