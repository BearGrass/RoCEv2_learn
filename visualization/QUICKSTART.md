# RDMA 可视化工具快速开始指南

## 一句话启动

```bash
# 进入项目目录后：
cd visualization
python3 -m http.server 8000
# 然后打开浏览器访问: http://localhost:8000/visualization/index.html
```

或者使用启动脚本：
```bash
./visualization/run.sh
```

## 功能演示

### 演示场景 1: QP 创建流程

这个场景展示从受保护域分配到 Queue Pair 就绪的完整过程。

**关键步骤**:
1. 分配保护域 (PD) - RDMA 资源的权限容器
2. 创建完成队列 (CQ) - 接收工作请求完成通知
3. 注册内存区域 (MR) - 使 RDMA 硬件可以直接访问应用内存
4. 创建 QP - 用于点对点通信的队列对
5-7. QP 状态转换 - RESET → INIT → RTR → RTS
8. 完成 - QP 准备进行数据传输

**在代码中的位置**:
- `src/rdma_common.c`: init_rdma_resources() 初始化流程
- `src/rdma_common_qp.c`: QP 创建和状态转换函数

### 演示场景 2: 数据面流程

这个场景展示 RDMA Write 单向通信的完整过程。

**关键步骤**:
1. 准备 Send WR - 构建发送工作请求
2. 投递 Send WR - 将请求提交到 SQ（发送队列）
3. RDMA Write 执行 - 网卡直接写入远端内存
4. 本地完成 - 本地 CQ 产生工作完成通知
5. 远端数据可用 - 远端应用可以读取数据
6-7. 接收侧处理 - 准备并投递接收请求
8. 完成 - 一个数据传输周期结束

**在代码中的位置**:
- `src/rdma_common_net.c`: post_send(), post_receive(), poll_completion()
- `src/rdma_client.c`/`src/rdma_server.c`: 主应用流程

## 控制操作

| 操作 | 按钮 | 快捷键 | 用途 |
|------|------|--------|------|
| 播放 | ▶ 播放 | `Space` | 自动演示所有步骤 |
| 暂停 | ⏸ 暂停 | `Space` | 暂停当前演示 |
| 重置 | ↻ 重置 | `R` | 回到第一步 |
| 上一步 | ⏮ 上一步 | `←` | 返回上一步骤 |
| 下一步 | 下一步 ⏭ | `→` | 前进到下一步骤 |
| 速度 | 滑块 | - | 调节演示速度 (0.5x - 2.0x) |

## 界面说明

**左侧面板 - 信息显示**:
- 演示场景选择按钮
- 当前步骤的详细描述
- 对应源代码的位置和代码片段

**中央画布 - 可视化**:
- QP 创建流程：节点网格 + 连接箭头
- 数据面流程：时间线布局 + 顺序步骤

**下方控制栏 - 播放控制**:
- 播放/暂停/重置按钮
- 上一步/下一步单步控制
- 速度调节滑块
- 进度条和步骤计数

## 学习技巧

### 方法 1: 快速浏览
1. 选择一个演示场景
2. 点击 "播放" 按钮
3. 观察 Canvas 上的动画和左侧面板的代码映射

### 方法 2: 逐步学习
1. 选择演示场景
2. 使用 "下一步" 按钮逐个步骤查看
3. 每步都对照左侧面板的代码位置查看源代码
4. 使用 "上一步" 返回复习

### 方法 3: 调整速度学习
1. 点击 "播放"
2. 使用速度滑块调节到合适的速度
3. 观察整个流程如何演进

## 代码对照

每个步骤都显示对应的源代码位置，格式为：

```
文件: src/rdma_common.c
行: 110-125
代码片段: pd = ibv_alloc_pd(ib_ctx);
```

**对照方法**:
1. 记下显示的文件和行号
2. 打开相应的源代码文件
3. 跳转到指定行号查看实现细节
4. 理解该步骤在整个流程中的作用

## 常见问题

**Q: 如何在本地开发机上查看？**  
A: 在项目根目录运行 `python3 -m http.server 8000`，然后在浏览器打开 `http://localhost:8000/visualization/`

**Q: 可以修改演示内容吗？**  
A: 可以！编辑 `visualization/src/models.js` 修改步骤描述和代码映射

**Q: 如何添加新的演示场景？**  
A: 在 `src/models.js` 中定义新的步骤数组和场景，修改 `index.html` 添加按钮

**Q: 支持离线使用吗？**  
A: 支持！直接在浏览器中打开 `visualization/index.html` 即可（无需服务器）

**Q: 在手机上可以用吗？**  
A: 支持！响应式设计自动适配各种屏幕大小

## 相关源代码快速导航

- **RDMA 资源初始化**: `src/rdma_common.c` - `init_rdma_resources()`
- **QP 创建和管理**: `src/rdma_common_qp.c` - `create_qp()`, `modify_qp_to_*()`
- **工作请求和完成**: `src/rdma_common_net.c` - `post_send()`, `poll_completion()`
- **服务端主循环**: `src/rdma_server.c` - `main()`
- **客户端主循环**: `src/rdma_client.c` - `main()`
- **调试工具**: `src/rdma_common_debug.c` - `print_qp_state()` 等

## 进阶使用

### 自定义演示
编辑 `visualization/src/models.js` 中的步骤定义，可以：
- 修改步骤名称和描述
- 更新代码映射的文件和行号
- 调整每个步骤的持续时间（毫秒）

### 自定义样式
编辑 `visualization/css/style.css` 改变：
- 配色方案（颜色变量）
- 字体和大小
- 布局和间距

### 扩展动画
在 `visualization/src/renderer.js` 中添加新的绘制方法：
- 自定义节点形状和颜色
- 添加动画效果（波形、脉冲等）
- 改变布局算法

## 下一步

- 查看完整文档: `visualization/README.md`
- 浏览源代码了解实现细节
- 在项目 Issue 中分享反馈和建议
