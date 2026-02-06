#!/bin/bash
# RDMA 可视化应用启动脚本

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIS_DIR="$PROJECT_ROOT/visualization"

echo "================================================"
echo "RDMA RoCEv2 可视化应用启动"
echo "================================================"
echo ""

# 检查Python
if command -v python3 &> /dev/null; then
    echo "✓ 检测到 Python 3"
    echo "  启动 HTTP 服务器: http://localhost:8000"
    echo ""
    echo "提示:"
    echo "  - 在浏览器中打开: http://localhost:8000/visualization/"
    echo "  - 按 Ctrl+C 停止服务器"
    echo ""
    cd "$PROJECT_ROOT"
    python3 -m http.server 8000
elif command -v node &> /dev/null; then
    echo "✓ 检测到 Node.js"
    if ! command -v http-server &> /dev/null; then
        echo "  安装 http-server..."
        npm install -g http-server
    fi
    echo "  启动 HTTP 服务器: http://localhost:8000"
    echo ""
    echo "提示:"
    echo "  - 在浏览器中打开: http://localhost:8000/visualization/"
    echo "  - 按 Ctrl+C 停止服务器"
    echo ""
    cd "$PROJECT_ROOT"
    http-server -p 8000
else
    echo "✗ 未找到 Python 3 或 Node.js"
    echo ""
    echo "请安装以下之一:"
    echo "  - Python 3: https://www.python.org/downloads/"
    echo "  - Node.js: https://nodejs.org/"
    echo ""
    echo "或直接在浏览器中打开: $VIS_DIR/index.html"
    exit 1
fi
