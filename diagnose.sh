#!/bin/bash

# RDMA配置诊断脚本
# 用于排查QP状态转换失败的问题

echo "=========================================="
echo "  RoCEv2 配置诊断工具"
echo "=========================================="

# 检查RDMA设备
echo ""
echo "1. 检查RDMA设备:"
echo "----------------------------------------"
if ! command -v ibv_devices &> /dev/null; then
    echo "错误: 未找到ibv_devices命令，请安装libibverbs-dev"
    exit 1
fi

ibv_devices
if [ $? -ne 0 ]; then
    echo "错误: 未找到RDMA设备"
    echo "请运行: sudo rdma link add rxe0 type rxe netdev <你的网卡名>"
    exit 1
fi

# 获取设备名
DEVICE=$(ibv_devices | grep -v "device" | awk '{print $1}' | head -n 1)
if [ -z "$DEVICE" ]; then
    echo "错误: 无法获取设备名"
    exit 1
fi

echo "找到设备: $DEVICE"

# 详细设备信息
echo ""
echo "2. 设备详细信息:"
echo "----------------------------------------"
ibv_devinfo -d "$DEVICE" -v | head -n 30

# GID表
echo ""
echo "3. GID表 (重要!):"
echo "----------------------------------------"
if command -v show_gids &> /dev/null; then
    show_gids
else
    echo "show_gids命令不可用，手动查询GID:"
    for i in {0..5}; do
        GID=$(cat /sys/class/infiniband/$DEVICE/ports/1/gids/$i 2>/dev/null)
        if [ $? -eq 0 ] && [ "$GID" != "0000:0000:0000:0000:0000:0000:0000:0000" ]; then
            echo "  GID[$i]: $GID"
        fi
    done
fi

# 端口状态
echo ""
echo "4. 端口状态:"
echo "----------------------------------------"
PORT_STATE=$(cat /sys/class/infiniband/$DEVICE/ports/1/state 2>/dev/null)
PORT_RATE=$(cat /sys/class/infiniband/$DEVICE/ports/1/rate 2>/dev/null)
echo "  状态: $PORT_STATE"
echo "  速率: $PORT_RATE"

if [ "$PORT_STATE" != "4: ACTIVE" ]; then
    echo "警告: 端口未激活！"
fi

# 检查网卡
echo ""
echo "5. 关联的网络接口:"
echo "----------------------------------------"
if [ -e "/sys/class/infiniband/$DEVICE/parent" ]; then
    NETDEV=$(basename $(readlink /sys/class/infiniband/$DEVICE/parent) 2>/dev/null)
    echo "  网卡: $NETDEV"

    # 检查网卡IP
    IP_ADDR=$(ip addr show $NETDEV 2>/dev/null | grep "inet " | awk '{print $2}')
    if [ -n "$IP_ADDR" ]; then
        echo "  IP地址: $IP_ADDR"
    else
        echo "  警告: 网卡未配置IP地址"
    fi

    # 检查网卡状态
    NETDEV_STATE=$(ip link show $NETDEV 2>/dev/null | grep "state" | awk '{print $9}')
    echo "  网卡状态: $NETDEV_STATE"
fi

# 建议
echo ""
echo "=========================================="
echo "  诊断建议"
echo "=========================================="
echo ""
echo "常见问题及解决方案:"
echo ""
echo "1. GID索引错误"
echo "   - 确保客户端和服务端使用相同的GID索引"
echo "   - RoCEv2通常使用GID索引1（不是0）"
echo "   - 运行程序时指定正确的GID索引，例如："
echo "     ./build/rdma_server $DEVICE 18515 1"
echo ""
echo "2. 端口未激活"
echo "   - 检查关联的网卡是否UP: ip link set <网卡名> up"
echo "   - 检查网卡是否配置了IP地址"
echo ""
echo "3. GID未配置"
echo "   - 对于RXE设备，确保正确绑定了网卡："
echo "     sudo rdma link add rxe0 type rxe netdev <网卡名>"
echo ""
echo "4. 测试连接"
echo "   - 使用官方工具测试: ibv_rc_pingpong -d $DEVICE -g 1"
echo "   - 在两台机器上分别运行服务端和客户端"
echo ""
echo "=========================================="
