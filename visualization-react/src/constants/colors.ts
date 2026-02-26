export const COLORS = {
  // QP 状态颜色
  qpState: {
    RESET: { bg: '#9CA3AF', text: '#1F2937', label: '重置' },
    INIT:  { bg: '#FBBF24', text: '#1F2937', label: '初始化' },
    RTR:   { bg: '#60A5FA', text: '#FFFFFF', label: '接收就绪' },
    RTS:   { bg: '#34D399', text: '#1F2937', label: '发送就绪' },
  },

  // 数据流颜色
  dataFlow: {
    control: '#8B5CF6',
    qpInfo:  '#F59E0B',
    data:    '#10B981',
  },

  // 主机配色
  host: {
    A: { primary: '#3B82F6', secondary: '#DBEAFE' },
    B: { primary: '#8B5CF6', secondary: '#EDE9FE' },
  },

  // 背景和边框
  background: {
    main: '#F8FAFC',
    card: '#FFFFFF',
    dark: '#1E293B',
  },

  // 资源颜色
  resources: {
    PD: { bg: '#FECACA', text: '#991B1B', label: 'PD' },
    CQ: { bg: '#BFDBFE', text: '#1E40AF', label: 'CQ' },
    MR: { bg: '#D1FAE5', text: '#065F46', label: 'MR' },
  },
};
