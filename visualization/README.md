# RDMA RoCEv2 可视化模块

## 项目概述

本模块为 RoCEv2 RDMA 学习项目提供可视化工具，通过交互式的网页应用演示 RDMA 通信的核心流程。

### 功能特性

- **QP创建流程演示**：从PD分配、CQ创建、MR注册到QP状态转换（RESET→INIT→RTR→RTS）的完整可视化
- **数据面流程演示**：展示RDMA Write单向通信中从发送WR投递、数据传输到接收WR的完整过程
- **代码映射集成**：每个步骤都关联对应的源代码位置，帮助学习者对照代码理解
- **交互式播放控制**：支持自动播放、暂停、单步执行、速度调节等功能
- **浏览器原生实现**：纯HTML5 + Canvas + JavaScript，无需后端服务器

## 目录结构

```
visualization/
├── index.html          # 主页面
├── css/
│   └── style.css      # 样式表
├── src/
│   ├── models.js      # 数据模型（场景、步骤定义）
│   ├── renderer.js    # Canvas渲染引擎
│   ├── animator.js    # 动画和播放控制
│   └── app.js         # 应用主程序
└── README.md          # 本文件
```

## 使用方法

### 方式1：直接打开HTML文件

在浏览器中打开 `visualization/index.html`：

```bash
# 使用 Python 的简单 HTTP 服务器
python3 -m http.server 8000

# 或使用 Node.js http-server
npx http-server

# 然后在浏览器访问
http://localhost:8000/visualization/
```

### 方式2：VS Code Live Server

在 VS Code 中使用 Live Server 扩展直接预览：

1. 右键点击 `visualization/index.html`
2. 选择 "Open with Live Server"

## 界面说明

### 左侧面板

- **演示场景**：选择 QP创建流程 或 数据面流程
- **当前步骤信息**：显示当前步骤的名称、描述和步骤编号
- **代码映射**：显示对应的源代码文件、行号和代码片段

### 中央画布

- 实时绘制 RDMA 通信流程的可视化图形
- QP创建流程：以节点+连线的方式展示8个步骤
- 数据面流程：以时间线的方式展示8个步骤

### 控制栏

| 按钮 | 功能 | 快捷键 |
|------|------|--------|
| ▶ 播放 | 自动播放所有步骤 | Space |
| ⏸ 暂停 | 暂停当前播放 | Space |
| ↻ 重置 | 回到第一个步骤 | R |
| ⏮ 上一步 | 移动到上一个步骤 | ← |
| 下一步 ⏭ | 移动到下一个步骤 | → |
| 速度控制 | 调节播放速度 (0.5x - 2.0x) | - |

## 技术实现

### 核心架构

```
┌─────────────────────────────────────────┐
│         HTML UI & Canvas                 │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│Models│  │Render│  │Animat│
└──────┘  └──────┘  └──────┘
    │          │          │
    └──────────┼──────────┘
               │
         ┌─────▼─────┐
         │    App    │
         └───────────┘
```

### 关键模块

#### models.js
- `RDMAStep`：定义单个步骤的信息和代码映射
- `Scenario`：定义场景及其步骤集合，管理当前步骤状态
- 预定义的两个场景：`QPCreationScenario` 和 `DataPlaneScenario`

#### renderer.js
- `Renderer`：Canvas 2D 上下文的封装
- 提供绘制步骤节点、箭头、文本等原语
- 支持两种不同的布局：2D网格（QP创建）和时间线（数据面）

#### animator.js
- `Animator`：控制动画播放的状态机
- 管理播放、暂停、单步执行等操作
- 支持自定义播放速度和事件回调

#### app.js
- `RDMAVisualizationApp`：应用主程序
- 整合所有组件并处理用户交互
- 管理 UI 更新和事件绑定

### 动画机制

1. **帧更新循环**：使用 `requestAnimationFrame` 实现流畅的动画
2. **步骤计时**：每个步骤有固定的持续时间 (600-1500ms)，受播放速度影响
3. **进度跟踪**：计算当前步骤的完成进度并更新 UI
4. **事件回调**：步骤变化、场景完成等事件通过回调通知监听者

## 演示场景详情

### QP创建流程

展示从 RDMA 资源分配到 Queue Pair 就绪的完整过程：

1. **保护域(PD)分配** - 申请 PD 用于权限管理
2. **完成队列(CQ)创建** - 创建 CQ 接收完成通知
3. **内存注册(MR)** - 注册应用内存使 RDMA 可访问
4. **QP创建** - 创建 Queue Pair 用于通信
5. **RESET→INIT** - 初始化 QP 状态
6. **INIT→RTR** - 设置接收参数和 GID 信息
7. **RTR→RTS** - 启用发送功能
8. **完成** - QP 就绪可进行数据传输

### 数据面流程

展示 RDMA Write 单向通信的完整过程：

1. **准备Send WR** - 构建发送工作请求
2. **Post Send WR** - 投递到 SQ
3. **RDMA Write 执行** - 直接写入远端内存
4. **本地完成** - 本地 CQ 产生完成通知
5. **远端数据可用** - 远端应用可读取数据
6. **准备Recv WR** - 构建接收工作请求（用于主动接收场景）
7. **Post Recv WR** - 投递接收请求
8. **完成** - 数据传输周期结束

## 代码映射说明

每个步骤的代码映射包含：

- **文件**: 源代码所在文件路径
- **行号范围**: 代码在文件中的位置
- **代码片段**: 相关代码的示例

例如 QP 创建步骤的映射：
```
文件: src/rdma_common_qp.c
行: 50-95
代码: qp = ibv_create_qp(pd, &qp_init_attr);
```

## 扩展和定制

### 添加新的演示场景

1. 在 `src/models.js` 中定义新的步骤数组
2. 创建新的 `Scenario` 实例
3. 注册到 `SCENARIOS` 对象中
4. 在 `index.html` 中添加对应的按钮

例如：
```javascript
const MyScenarioSteps = [
    new RDMAStep('step1', '步骤1', '描述...', new CodeMapping(...)),
    // ...
];

const MyScenario = new Scenario('my-scenario', 'My Scenario', 'Description', MyScenarioSteps);

SCENARIOS['my-scenario'] = MyScenario;
```

### 自定义渲染

修改 `src/renderer.js` 中的绘制方法来改变可视化样式：

- 修改 `colors` 对象改变配色
- 修改 `drawXxxFlow()` 方法改变布局
- 添加新的绘制原语方法

## 性能优化

- 使用 Canvas 2D API 而非 SVG 以获得更好性能
- 只在必要时重绘 Canvas（步骤变化时）
- 使用 `requestAnimationFrame` 而非 `setInterval` 同步浏览器刷新

## 浏览器兼容性

- Chrome/Edge 70+
- Firefox 60+
- Safari 12+
- 任何支持 Canvas 和 ES6 的现代浏览器

## 与项目集成

本模块与 RoCEv2 RDMA 学习项目完全独立，包含在 `visualization/` 子目录中：

- 不依赖项目的 C 源代码
- 无需编译或构建项目即可使用
- 所有代码映射基于源代码的逻辑结构，可手动维护

### 维护代码映射

当源代码发生变化时，更新 `src/models.js` 中的 `CodeMapping` 对象：

```javascript
new CodeMapping(
    'src/rdma_common.c',      // 文件路径
    110,                      // 开始行
    125,                      // 结束行
    'pd = ibv_alloc_pd(...);' // 代码片段
)
```

## 许可证

与 RoCEv2 RDMA 学习项目相同的开源许可。

## 联系和反馈

如有问题或建议，请在项目 Issue 中反馈。
