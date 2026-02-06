# 可视化需求说明 

**状态**: ✅ 已完成

## 需求描述
1. ✅ 针对RDMA通信中的步骤，提供一种可视化方式，方便学习者学习
2. ✅ 与当前的代码互相联动，可视化最好可以表明是代码的哪一部分
3. ✅ 可视化是可以播放的动态的

## 要求
1. ✅ 尝试让项目可以在浏览器中运行
2. ⏭ 如果可以在 ASCII 终端运行也可以，但是优先完成要求1
3. ✅ 生成合适的目录放置可视化代码，与本体分离防止相互影响

## 实现总结

### 项目结构

创建 `visualization/` 独立模块，包含以下组件：

| 文件 | 作用 | 行数 |
|------|------|------|
| index.html | 主页面和UI框架 | 119 |
| css/style.css | 响应式样式表 | 234 |
| src/models.js | 数据模型和场景定义 | 197 |
| src/renderer.js | Canvas 2D 渲染引擎 | 236 |
| src/animator.js | 动画和播放控制 | 177 |
| src/app.js | 应用主程序和事件处理 | 232 |
| run.sh | 快速启动脚本 | 40 |
| README.md | 完整文档 | 273 |

**总计**: 1,508 行代码，完全独立于项目本体

### 技术架构

**前端技术栈**:
- HTML5 Canvas API 用于高性能 2D 图形渲染
- Vanilla JavaScript (ES6) 实现，无外部依赖
- 响应式 CSS 设计，支持多种屏幕尺寸

**核心模块**:

1. **models.js** - RDMA 流程数据模型
   - `RDMAStep`: 单个步骤定义
   - `CodeMapping`: 代码映射（文件、行号、代码片段）
   - `Scenario`: 场景容器和状态管理
   - 两个完整场景定义

2. **renderer.js** - Canvas 渲染引擎
   - QP 创建流程：2D 网格布局，8 个步骤节点 + 连接线
   - 数据面流程：时间线布局，展示顺序步骤
   - 支持节点着色（活跃/已完成/未开始）
   - 步骤信息面板绘制

3. **animator.js** - 动画和播放控制
   - 状态机管理（播放/暂停/单步）
   - 自定义播放速度 (0.5x - 2.0x)
   - 进度追踪和事件回调
   - 帧同步使用 requestAnimationFrame

4. **app.js** - 应用主程序
   - UI 事件绑定（按钮、快捷键）
   - 场景切换和加载
   - 进度条和计数器更新
   - 代码映射信息展示

### 演示场景

#### 场景1: QP 创建流程 (8 步骤)

展示从资源分配到 Queue Pair 就绪的完整过程：

```
第1步: 保护域(PD)分配
      → ibv_alloc_pd(ib_ctx)
      
第2步: 完成队列(CQ)创建
      → ibv_create_cq(ib_ctx, ...)
      
第3步: 内存注册(MR)
      → ibv_reg_mr(pd, buf_ptr, ...)
      
第4步: QP 创建
      → ibv_create_qp(pd, &qp_init_attr)
      
第5步: QP 状态 RESET → INIT
      → ibv_modify_qp(qp, &attr, IBV_QP_STATE)
      
第6步: QP 状态 INIT → RTR (Ready to Receive)
      → 配置接收参数和 GID 信息
      
第7步: QP 状态 RTR → RTS (Ready to Send)
      → 启用发送功能
      
第8步: 完成 - QP 就绪
      → 可开始数据传输
```

#### 场景2: 数据面流程 (8 步骤)

展示 RDMA Write 单向通信的完整过程：

```
第1步: 准备 Send WR
      → 构建发送工作请求和缓冲区
      
第2步: Post Send WR
      → ibv_post_send(qp, &sr, &bad_wr)
      
第3步: RDMA Write 执行
      → 网卡直接写入远端内存，无需远端 CPU 干预
      
第4步: 本地完成 (Local Completion)
      → 本地 CQ 产生工作完成通知
      
第5步: 远端数据可用
      → 远端内存已收到数据，应用可读取
      
第6步: 准备 Recv WR
      → 构建接收工作请求
      
第7步: Post Recv WR
      → ibv_post_recv(qp, &rr, &bad_wr)
      
第8步: 完成 - 数据传输周期结束
      → 准备下一轮通信
```

### 代码映射集成

每个步骤都关联源代码映射：

```javascript
new CodeMapping(
  'src/rdma_common.c',          // 源文件
  110,                          // 开始行
  125,                          // 结束行
  'pd = ibv_alloc_pd(ib_ctx);' // 代码片段
)
```

UI 左侧面板实时显示：
- 源文件路径
- 代码位置（行号范围）
- 关键代码片段

### 播放控制功能

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 播放 | Space | 自动播放所有步骤 |
| 暂停 | Space | 暂停当前播放 |
| 重置 | R | 回到第一个步骤 |
| 上一步 | ← | 移动到上一个步骤 |
| 下一步 | → | 移动到下一个步骤 |
| 速度调节 | - | 0.5x 到 2.0x 范围调节 |
| 进度条 | - | 实时显示当前进度 |

### 使用方法

#### 快速启动

```bash
# 方法1: 使用启动脚本
cd visualization
./run.sh

# 方法2: Python HTTP 服务器
python3 -m http.server 8000

# 方法3: 直接打开
open visualization/index.html
```

然后在浏览器打开: `http://localhost:8000/visualization/`

#### VS Code 集成

- 安装 Live Server 扩展
- 右键点击 `visualization/index.html`
- 选择 "Open with Live Server"

### 设计亮点

1. **完全解耦**: 可视化模块与主项目完全分离，不依赖任何 C 源代码
2. **零依赖**: 纯 HTML5 + JavaScript，无需 npm/yarn 或后端服务器
3. **高性能**: 使用 Canvas 2D 而非 SVG，requestAnimationFrame 同步刷新
4. **易于扩展**: 模块化设计，可轻松添加新的演示场景或自定义渲染
5. **学习友好**: 代码映射帮助学习者对照源代码理解流程
6. **响应式设计**: 支持桌面、平板和手机等多种设备

### 后续优化方向

- 添加 3D WebGL 版本展示更复杂的拓扑
- 支持多个 QP 的并发演示
- 添加错误路径和超时场景
- 支持导出为 GIF/视频
- 添加实时代码编辑和 linting
- 支持 Touch 手势控制（手机端）

## Git 提交

**提交哈希**: 335fae3  
**提交信息**: feat: 实现RDMA可视化模块 - QP创建和数据面流程演示
