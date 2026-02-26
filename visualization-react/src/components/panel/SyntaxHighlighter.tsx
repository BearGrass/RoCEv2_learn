interface SyntaxHighlighterProps {
  code: string;
}

// 简单的 C 语言语法高亮组件
export function SyntaxHighlighter({ code }: SyntaxHighlighterProps) {
  // 关键字
  const keywords = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'goto', 'default', 'struct', 'union', 'enum', 'typedef', 'sizeof',
    'const', 'static', 'extern', 'volatile', 'inline', 'register', 'auto',
    'void', 'int', 'char', 'short', 'long', 'float', 'double', 'signed', 'unsigned',
    'NULL', 'true', 'false', 'bool',
  ];

  // 类型定义
  const types = [
    'ibv_context', 'ibv_pd', 'ibv_cq', 'ibv_qp', 'ibv_mr', 'ibv_wc',
    'ibv_device', 'ibv_port_attr', 'ibv_qp_attr', 'ibv_sge', 'ibv_send_wr',
    'ibv_recv_wr', 'cm_con_data_t', 'rdma_resources', 'sockaddr_in',
    'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t',
    'size_t', 'ssize_t', 'FILE', 'intptr_t',
  ];

  // 函数名（RDMA 相关）
  const functions = [
    'ibv_open_device', 'ibv_close_device', 'ibv_query_device', 'ibv_query_port',
    'ibv_alloc_pd', 'ibv_dealloc_pd', 'ibv_create_cq', 'ibv_destroy_cq',
    'ibv_create_qp', 'ibv_destroy_qp', 'ibv_modify_qp', 'ibv_query_qp',
    'ibv_reg_mr', 'ibv_dereg_mr', 'ibv_post_send', 'ibv_post_recv',
    'ibv_poll_cq', 'ibv_req_notify_cq', 'ibv_get_cq_event', 'ibv_ack_cq_event',
    'malloc', 'free', 'memset', 'memcpy', 'printf', 'fprintf', 'sprintf',
    'socket', 'bind', 'listen', 'accept', 'connect', 'send', 'recv', 'close',
    'htonl', 'htons', 'ntohl', 'ntohs', 'inet_pton', 'inet_ntop',
  ];

  const highlightCode = (input: string): string => {
    // 转义 HTML
    let escaped = input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 高亮注释（单行 //）
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="text-slate-500 italic">$1</span>');

    // 高亮多行注释 /* */
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500 italic">$1</span>');

    // 高亮字符串
    escaped = escaped.replace(/(".*?")/g, '<span class="text-amber-400">$1</span>');

    // 高亮字符
    escaped = escaped.replace(/('.*?')/g, '<span class="text-amber-400">$1</span>');

    // 高亮数字
    escaped = escaped.replace(/\b(\d+|0x[0-9a-fA-F]+)\b/g, '<span class="text-orange-400">$1</span>');

    // 高亮预处理指令
    escaped = escaped.replace(/(#\w+)/g, '<span class="text-purple-400">$1</span>');

    // 高亮类型定义
    types.forEach(type => {
      const regex = new RegExp(`\\b(${type})\\b`, 'g');
      escaped = escaped.replace(regex, '<span class="text-cyan-300 font-semibold">$1</span>');
    });

    // 高亮关键字
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      escaped = escaped.replace(regex, '<span class="text-purple-300 font-semibold">$1</span>');
    });

    // 高亮函数调用
    functions.forEach(func => {
      const regex = new RegExp(`\\b(${func})(?=\\()`, 'g');
      escaped = escaped.replace(regex, '<span class="text-yellow-300">$1</span>');
    });

    // 高亮宏定义
    escaped = escaped.replace(/\b([A-Z][A-Z0-9_]+)\b/g, '<span class="text-orange-300">$1</span>');

    return escaped;
  };

  const highlightedCode = highlightCode(code);

  return (
    <code
      className="font-mono text-xs"
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
}
