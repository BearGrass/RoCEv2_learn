# RoCEv2 可视化重构方案

**日期**: 2026-02-26
**目标**: 解决当前前端演示逻辑混乱问题，建立清晰的架构

---

## 📋 当前问题分析

### 1. 架构问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **职责不清** | `renderer.js` 既负责绘制又负责动画状态 | 代码难以维护 |
| **状态混乱** | 步骤状态在模型和渲染器之间来回修改 | 逻辑难以追踪 |
| **动画分散** | 脉冲、发光等效果分散在多个函数中 | 效果不一致 |
| **数据流单向** | 没有清晰的数据流方向 | 调试困难 |

### 2. 代码问题

```
当前架构:
┌─────────────────────────────────────────┐
│  app.js                                 │
│  - 直接操作 renderer                    │
│  - 直接操作 animator                    │
│  - 回调函数分散                         │
└─────────────────────────────────────────┘
         ↓           ↓           ↓
    models.js   renderer.js  animator.js
```

**问题**:
- `app.js` 知道太多内部细节
- `renderer.js` 有 800+ 行，过于臃肿
- `animator.js` 和 `renderer.js` 职责重叠

---

## 🎯 重构目标

### 1. 清晰的架构

```
新架构:
┌─────────────────────────────────────────┐
│  VisualizationApp (控制器)              │
│  - 处理用户输入                         │
│  - 更新场景状态                         │
│  - 触发渲染                             │
└─────────────────┬───────────────────────┘
                  │ (单向数据流)
         ┌────────┼────────┐
         ↓        ↓        ↓
    Scene     Renderer  UIManager
   (模型)    (视图)     (视图)
```

### 2. 模块化设计

| 模块 | 职责 | 行数目标 |
|------|------|----------|
| `models.js` | 数据结构、场景定义 | < 200 |
| `scene.js` | 场景状态管理 | < 150 |
| `renderer.js` | Canvas 绘制 | < 400 |
| `animator.js` | 动画循环、时序控制 | < 200 |
| `ui.js` | UI 更新、事件处理 | < 200 |
| `app.js` | 应用入口、模块协调 | < 150 |

### 3. 单向数据流

```
用户操作 → app.js → scene.js → renderer.js → Canvas
           ↓
       ui.js → DOM
```

---

## 📐 设计方案

### 1. 核心类设计

#### Scene (场景管理器)
```javascript
class Scene {
    constructor(steps) {
        this.steps = steps;          // 步骤数组
        this.currentIndex = 0;       // 当前索引
        this.state = 'idle';         // 'idle' | 'playing' | 'paused'
    }

    // 状态查询
    getCurrentStep() { return this.steps[this.currentIndex]; }
    getCompletedSteps() { return this.steps.slice(0, this.currentIndex); }
    getPendingSteps() { return this.steps.slice(this.currentIndex + 1); }

    // 状态转换
    next() { this.currentIndex++; }
    prev() { this.currentIndex--; }
    reset() { this.currentIndex = 0; }
}
```

#### Renderer (渲染器)
```javascript
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    // 纯函数：给定场景状态，绘制画面
    render(scene) {
        this.clear();
        this.drawBackground();
        this.drawSteps(
            scene.getCurrentStep(),
            scene.getCompletedSteps(),
            scene.getPendingSteps()
        );
        this.drawConnections(scene.steps);
    }
}
```

#### Animator (动画器)
```javascript
class Animator {
    constructor(scene, renderer, fps = 60) {
        this.scene = scene;
        this.renderer = renderer;
        this.fps = fps;
        this.frameId = null;
    }

    play(stepDuration) {
        const frames = stepDuration / (1000 / this.fps);
        let frame = 0;

        const animate = () => {
            frame++;
            this.renderer.render(this.scene, frame / frames);

            if (frame < frames) {
                this.frameId = requestAnimationFrame(animate);
            } else {
                this.scene.next();
                // 继续下一步...
            }
        };
        animate();
    }
}
```

### 2. 渲染分层

```
Canvas
├── Layer 1: 背景层 (静态)
│   ├── 网格背景
│   └── 装饰元素
├── Layer 2: 组件层 (半静态)
│   ├── 系统内存框
│   ├── 内核驱动框
│   └── Client/Server 框
├── Layer 3: 步骤层 (动态)
│   ├── 已完成节点 (绿色/橙色)
│   ├── 当前节点 (橙色 + 脉冲)
│   └── 未开始节点 (灰色)
└── Layer 4: 效果层 (动画)
    ├── 连接线
    ├── 流动效果
    └── 粒子效果
```

### 3. 状态管理

```javascript
// 场景状态
{
    sceneId: 'qp-creation',
    steps: [
        {
            id: 'qp-1-pd',
            name: '保护域 (PD) 分配',
            description: '...',
            codeMapping: { file, start, end, snippet },
            position: { x, y },  // 渲染位置
            status: 'completed'  // 'completed' | 'active' | 'pending'
        },
        // ...
    ],
    currentIndex: 3,
    animationProgress: 0.5  // 0-1，当前步骤的动画进度
}
```

---

## 🔧 实施计划

### 阶段 1: 基础重构 (P0 - 高优先级)

1. **创建 scene.js**
   - 提取场景状态管理逻辑
   - 实现状态转换方法
   - 提供状态查询接口

2. **简化 renderer.js**
   - 移除动画状态管理
   - 将 `drawStepNode` 拆分为独立函数
   - 实现分层渲染

3. **简化 app.js**
   - 使用场景管理器
   - 统一事件处理
   - 简化回调

### 阶段 2: 视觉优化 (P1 - 中优先级)

4. **统一动画效果**
   - 创建 effects.js
   - 统一管理脉冲、发光等效果
   - 参数化配置

5. **改进代码映射**
   - 验证步骤与实际代码的对应关系
   - 添加代码片段高亮
   - 支持点击跳转

### 阶段 3: 交互增强 (P2 - 低优先级)

6. **UI 改进**
   - 步骤详情面板
   - 进度条拖拽
   - 快捷键优化

7. **新增场景**
   - QP 状态转换详解
   - 多 QP 并发演示

---

## 📁 文件结构

### 重构前
```
visualization/
├── index.html
├── css/style.css
└── src/
    ├── models.js      (253 行)
    ├── renderer.js    (796 行)
    ├── animator.js    (208 行)
    ├── app.js         (327 行)
    └── effects.js     (50 行)
```

### 重构后
```
visualization/
├── index.html
├── css/style.css
└── src/
    ├── models.js      (150 行) - 数据结构
    ├── scene.js       (120 行) - 场景管理
    ├── renderer.js    (350 行) - 纯渲染
    ├── animator.js    (150 行) - 动画控制
    ├── ui.js          (150 行) - UI 更新
    └── app.js         (120 行) - 应用入口
```

---

## ✅ 验收标准

### 功能标准
- [ ] QP 创建流程演示正常
- [ ] 数据面流程演示正常
- [ ] 播放/暂停/重置功能正常
- [ ] 速度调节有效
- [ ] 代码映射准确

### 代码标准
- [ ] 单文件不超过 400 行
- [ ] 单函数不超过 60 行
- [ ] 无全局变量污染
- [ ] 清晰的错误处理

### 性能标准
- [ ] 60 FPS 流畅运行
- [ ] 内存无泄漏
- [ ] Canvas 重绘优化

---

## 🔗 相关文档

- [可视化优化需求](VISUALIZATION_IMPROVEMENTS.md)
- [可视化完成报告](VISUALIZATION_OPTIMIZATION_COMPLETE.md)

---

**下一步**: 开始阶段 1 实施，创建 `scene.js` 模块
