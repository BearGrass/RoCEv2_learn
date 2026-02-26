# 可视化增强：QP 信息交换与数据传输视觉区分

## 概述

本次优化为 RoCEv2 可视化模块添加了 QP 信息交换和数据传输的视觉区分，使两种不同的通信阶段具有明显的视觉差异，提升教学效果。

## 修改内容

### 1. 动画步骤配置调整 (`animationSteps.ts`)

**文件**: `visualization-react/src/data/animationSteps.ts`

#### Step-11: QP 信息交换
- 将 `data` 字段改为 `'QP-INFO'`，便于类型识别
- 延长 `duration` 从 2500ms 到 3000ms，让双向动画更完整
- 更新面板提示文字为"双向交换 QP 信息（有来有回）"

#### Step-18: 连接完成（数据传输）
- 将 `data` 改为 `'RDMA WRITE'`，更准确描述操作类型
- 延长 `duration` 从 3000ms 到 4000ms，让持续传输动画更明显

### 2. 数据类型识别逻辑优化 (`useAnimationController.ts`)

**文件**: `visualization-react/src/hooks/useAnimationController.ts`

```typescript
case 'dataExchange':
  // 设置数据类型：QP 信息交换或数据传输
  const isQPInfo = action.data?.includes('QP-INFO') ||
                  action.data?.includes('QPN') ||
                  action.data?.includes('GID') ||
                  action.data?.includes('QP Info');
  const isDataTransfer = action.data?.includes('RDMA') || action.data?.includes('DATA');
  setState(prev => ({
    ...prev,
    dataType: isQPInfo ? 'qp-info' : isDataTransfer ? 'data' : prev.dataType,
  }));
  break;
```

### 3. 网络场景视觉增强 (`NetworkScene.tsx`)

**文件**: `visualization-react/src/components/scene/NetworkScene.tsx`

#### QP 信息交换动画（虚线 + 琥珀色）
| 特性 | 配置 |
|:----:|:----:|
| 连接线样式 | 虚线（#F59E0B） |
| 动画方向 | 双向同时传输 |
| 动画元素 | 圆点（琥珀色/紫色） |
| 动画时长 | 1.2s × 2 趟 = 2.4s |
| 颜色主题 | 琥珀色/紫色 |
| 标签 | `QP Info ⇄` |

**动画时序**：
- 第一趟：0s 开始，1.2s 完成（双向同时）
- 第二趟：1.5s 延迟后开始，2.7s 完成
- 总时长 2.7s，在 step 的 3s 内完成

#### 数据传输动画（实线 + 绿色）
| 特性 | 配置 |
|:----:|:----:|
| 连接线样式 | 实线（#10B981） |
| 动画方向 | 单向连续传输 |
| 动画元素 | 数据包（绿色矩形带"DATA"文字） |
| 动画时长 | 0.8s × 3 个包循环 |
| 颜色主题 | 绿色 |
| 标签 | `RDMA WRITE →` |

**动画时序**：
- 数据包 1：0s 出发，0.8s 完成
- 数据包 2：0.3s 延迟后出发
- 数据包 3：0.6s 延迟后出发
- 循环播放，体现"持续传输"

### 4. 视觉对比总结

| 特性 | QP 信息交换 | 数据传输 |
|:----:|:----------:|:--------:|
| 连接线样式 | 虚线（琥珀色） | 实线（绿色） |
| 动画方向 | 双向同时 | 单向连续 |
| 动画元素 | 圆点 + 箭头 | 数据包（矩形） |
| 颜色主题 | 琥珀色/紫色 | 绿色 |
| 交换机配色 | amber 渐变 | green 渐变 |
| 标签符号 | ⇄ | → |
| 动画次数 | 2 趟完整传输 | 持续循环 |

---

# 可视化修复：进度条跳转资源累积问题

## 问题描述

用户反馈：按播放按钮一个节点一个节点过去时资源图标正常显示，但直接点击上方阶段条（进度条）跳转到某一步骤时，会导致有些资源图标不显示。

## 根因分析

`goToStep` 函数原本只执行目标步骤的动作，不执行之前步骤的动作。例如：
- 用户直接跳转到 step-4（index 3）
- 只会执行 step-4 的动作（创建 MR）
- 不会执行 step-2 和 step-3 的动作（创建 PD 和 CQ）
- 结果：Host A 只显示 MR，缺少 PD 和 CQ

## 修复方案

### 1. 添加 `resetResources` 回调（`App.tsx`）

```typescript
const resetResources = useCallback(() => {
  setHostAResources([]);
  setHostBResources([]);
}, []);
```

### 2. 修改 `useAnimationController` 签名

添加 `resetResources` 参数：

```typescript
export function useAnimationController(
  updateHostState: (host: 'A' | 'B', state: QPState) => void,
  addResource: (host: 'A' | 'B', resource: 'PD' | 'CQ' | 'MR') => void,
  resetResources: () => void
): UseAnimationControllerReturn
```

### 3. 修改 `goToStep` 函数

累积执行从 0 到 index 的所有步骤的资源创建动作：

```typescript
const goToStep = useCallback((index: number) => {
  if (index >= 0 && index < totalSteps) {
    // 重置资源状态
    resetResources();

    // 累积执行从 0 到 index 的所有步骤的资源创建动作
    for (let i = 0; i <= index; i++) {
      const step = animationSteps[i];
      step.actions.forEach(action => {
        if (action.type === 'createResource' && action.resource) {
          const host = action.target === 'hostA' ? 'A' : 'B';
          addResource(host, action.resource);
        }
      });
    }

    // 执行目标步骤的其他动作（状态变更等）
    executeStep(index);
  }
}, [totalSteps, executeStep, addResource, resetResources]);
```

### 4. 修改 `executeStep` 函数

添加 `skipResources` 参数（未使用，保留扩展性）：

```typescript
const executeStep = useCallback((index: number, skipResources: boolean = false) => {
  // ...
  // 执行动作（如果不需要跳过资源创建）
  if (!skipResources) {
    processStepActions(step);
  }
  // ...
}, [updateHostState, processStepActions]);
```

## 修复效果

现在当用户点击进度条跳转到任意步骤时：
1. 重置所有资源状态
2. 累积执行从第 1 步到目标步骤的所有资源创建动作
3. 执行目标步骤的其他动作（状态变更、代码显示等）

**示例**：用户跳转到 step-4 时，Host A 会正确显示 PD、CQ、MR 三个资源图标。

## 修改文件清单

| 文件 | 修改内容 |
|:-----|:--------:|
| `visualization-react/src/data/animationSteps.ts` | 调整 step-11 和 step-18 配置 |
| `visualization-react/src/hooks/useAnimationController.ts` | 添加资源累积逻辑 |
| `visualization-react/src/components/scene/NetworkScene.tsx` | 视觉区分动画 |
| `visualization-react/src/App.tsx` | 添加 resetResources 回调 |

## 验证步骤

1. 启动开发服务器：`cd visualization-react && npm run dev`
2. 打开 http://localhost:5173
3. 测试场景 1：点击 Play，观察动画正常播放
4. 测试场景 2：点击进度条跳转到 step-4，确认 Host A 显示 PD、CQ、MR
5. 测试场景 3：点击进度条跳转到 step-11，确认 QP 信息交换动画为双向传输
6. 测试场景 4：点击进度条跳转到 step-18，确认数据传输动画为持续单向传输

## 构建验证

```bash
cd visualization-react
npm run build   # 构建成功
npm run lint    # 无错误
```

构建输出：
```
✓ built in 1.67s
```
