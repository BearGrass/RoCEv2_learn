// QP 状态
export type QPState = 'RESET' | 'INIT' | 'RTR' | 'RTS' | null;

// 主机标识
export type HostId = 'A' | 'B';

// 动画步骤动作类型
export type ActionType =
  | 'highlight'           // 高亮组件
  | 'createResource'      // 创建资源（PD/CQ/MR）
  | 'createQP'            // 创建 QP
  | 'modifyQP'            // 修改 QP 状态
  | 'showCode'            // 显示代码
  | 'showParams'          // 显示参数
  | 'showInfo'            // 显示信息
  | 'showSuccess'         // 显示成功消息
  | 'dataExchange'        // 数据交换动画
  | 'showConnection';     // 显示连接线

// 动作定义
export interface StepAction {
  target: 'hostA' | 'hostB' | 'network' | 'panel';
  type: ActionType;
  element?: string;
  resource?: 'PD' | 'CQ' | 'MR';
  code?: string;
  location?: string;  // 代码位置：文件路径和行号
  params?: string[];
  text?: string;
  // 用于 modifyQP 动作
  from?: QPState;
  to?: QPState;
  // 用于 dataExchange 动作
  fromHost?: 'hostA' | 'hostB';
  toHost?: 'hostA' | 'hostB';
  data?: string;
  label?: string;
  style?: 'solid' | 'dashed';
  color?: string;
}

// 状态变更
export interface StateChange {
  host: HostId;
  from: QPState;
  to: QPState;
}

// 动画步骤
export interface AnimationStep {
  id: string;
  phase: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  duration: number;          // 毫秒
  actions: StepAction[];
  stateChange: StateChange | null;
}

// 动画控制器状态
export interface AnimationState {
  currentStepIndex: number;
  isPlaying: boolean;
  speed: number;             // 0.5, 1, 1.5, 2
  hostAState: QPState;
  hostBState: QPState;
  hostAResources: ('PD' | 'CQ' | 'MR')[];
  hostBResources: ('PD' | 'CQ' | 'MR')[];
  activeElements: string[];  // 当前高亮的元素 ID
  showConnection: boolean;
  connectionStyle: 'none' | 'dashed' | 'solid';
  dataType: 'qp-info' | 'data' | null;  // 数据类型
}
