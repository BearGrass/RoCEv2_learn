# RoCEv2 QP 创建流程可视化 (React 版)

使用 React + TypeScript + Framer Motion 实现的交互式动画演示，展示 RoCEv2 中队列对（QP）的创建和连接建立流程。

## 技术栈

- **框架**: React 18 + TypeScript
- **动画库**: Framer Motion
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **构建工具**: Vite

## 功能特性

### 演示流程（14 个步骤）

#### 阶段 1：资源准备（4 步）
1. 打开 RDMA 设备 - `ibv_open_device()`
2. 分配保护域 (PD) - `ibv_alloc_pd()`
3. 创建完成队列 (CQ) - `ibv_create_cq()`
4. 注册内存区域 (MR) - `ibv_reg_mr()`

#### 阶段 2：QP 创建与信息交换（3 步）
5. Host A 创建 QP → RESET 状态
6. Host B 创建 QP → RESET 状态
7. QP 信息交换（QPN/GID/LID）

#### 阶段 3：QP 状态转换（6 步）
8. Host A: RESET → INIT
9. Host B: RESET → INIT
10. Host A: INIT → RTR
11. Host B: INIT → RTR
12. Host A: RTR → RTS
13. Host B: RTR → RTS

#### 阶段 4：连接完成（1 步）
14. 连接建立完成，双端 RTS

### 交互功能

- **播放控制**: 播放/暂停、上一步/下一步、重置
- **进度条**: 点击进度条跳转到任意步骤
- **速度调节**: 支持 0.5x, 1x, 1.5x, 2x 四档速度
- **阶段指示**: 清晰显示当前所在阶段
- **状态显示**: 实时显示 Host A/B 的 QP 状态
- **代码展示**: 每个步骤显示对应的 API 代码

## 快速开始

### 安装依赖

```bash
cd visualization-react
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├── components/
│   ├── layout/
│   │   └── DemoContainer.tsx       # 主容器布局
│   ├── scene/
│   │   ├── HostNode.tsx            # 主机节点组件
│   │   ├── NetworkScene.tsx        # 网络场景组件
│   │   └── StateDiagram.tsx        # 状态转换图
│   ├── control/
│   │   ├── ControlPanel.tsx        # 控制面板
│   │   ├── PlaybackControls.tsx    # 播放控制按钮
│   │   ├── ProgressBar.tsx         # 进度条
│   │   ├── SpeedSelector.tsx       # 速度选择器
│   │   └── PhaseIndicator.tsx      # 阶段指示器
│   └── panel/
│       ├── StatePanel.tsx          # 状态信息面板
│       └── CodeDisplay.tsx         # 代码展示
├── hooks/
│   ├── useAnimationController.ts   # 动画控制器 Hook
│   └── useQPStateMachine.ts        # QP 状态机 Hook
├── data/
│   └── animationSteps.ts           # 动画步骤配置
├── types/
│   └── index.ts                    # TypeScript 类型定义
└── constants/
    └── colors.ts                   # 颜色常量
```

## 核心架构

### 数据流

```
用户操作 → ControlPanel → useAnimationController → useQPStateMachine
                                    ↓
                              animationSteps
                                    ↓
                          HostNode / NetworkScene
```

### 状态管理

- `useAnimationController`: 管理动画播放状态、进度、速度
- `useQPStateMachine`: 管理 Host A/B 的 QP 状态
- 资源状态：通过 useState 管理 PD/CQ/MR 的累积

## 颜色规范

### QP 状态颜色

| 状态 | 颜色 | 含义 |
|------|------|------|
| RESET | 灰色 | 重置状态 |
| INIT | 黄色 | 初始化状态 |
| RTR | 蓝色 | 接收就绪 |
| RTS | 绿色 | 发送就绪 |

### 主机配色

- Host A: 蓝色系 (#3B82F6)
- Host B: 紫色系 (#8B5CF6)

## 动画效果

1. **QP 状态转换**: 背景色渐变 + 放大脉冲
2. **资源创建**: fadeIn + scaleIn
3. **数据包传输**: 沿连接线移动的圆点
4. **连接线**: SVG stroke-dasharray 虚线流动效果
5. **高亮**: 发光边框 + 其他组件降低透明度

## 学习资源

- [RDMA Architecture Guide](../docs/technical/ARCHITECTURE.md)
- [QP State Management](../docs/technical/QP_STATE_USAGE.md)

## 开发说明

### 添加新步骤

在 `src/data/animationSteps.ts` 中添加新的步骤配置：

```typescript
{
  id: 'step-xx',
  phase: 1,
  title: '步骤标题',
  description: '步骤描述',
  duration: 2000,
  actions: [
    { target: 'hostA', type: 'highlight', element: 'rnic' },
    { target: 'panel', type: 'showCode', code: '...' },
  ],
  stateChange: { host: 'A', from: null, to: 'RESET' },
}
```

### 修改颜色

编辑 `src/constants/colors.ts` 文件。

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可

MIT
