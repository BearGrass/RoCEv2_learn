#!/bin/bash

# 简单的GID显示工具
# 用于替代系统的show_gids命令

echo "显示所有RDMA设备的GID表"
echo ""

# 遍历所有RDMA设备
for DEVICE in /sys/class/infiniband/*; do
    if [ -d "$DEVICE" ]; then
        DEV_NAME=$(basename "$DEVICE")
        echo "=========================================="
        echo "设备: $DEV_NAME"
        echo "=========================================="

        # 遍历所有端口
        for PORT in "$DEVICE"/ports/*; do
            if [ -d "$PORT" ]; then
                PORT_NUM=$(basename "$PORT")
                echo ""
                echo "端口 $PORT_NUM:"
                printf "  %-6s  %-10s  %-50s  %s\n" "INDEX" "TYPE" "GID" "IPv4"
                printf "  %-6s  %-10s  %-50s  %s\n" "-----" "----" "---" "----"

                # 遍历所有GID
                for i in {0..15}; do
                    GID_FILE="$PORT/gids/$i"
                    GID_TYPE_FILE="$PORT/gid_attrs/types/$i"

                    if [ -f "$GID_FILE" ]; then
                        GID=$(cat "$GID_FILE" 2>/dev/null)
                        GID_TYPE=$(cat "$GID_TYPE_FILE" 2>/dev/null || echo "unknown")

                        if [ -n "$GID" ] && [ "$GID" != "0000:0000:0000:0000:0000:0000:0000:0000" ]; then
                            # 提取IPv4地址（如果是RoCEv2 GID）
                            if [[ "$GID" =~ ffff:([0-9a-f]{2})([0-9a-f]{2}):([0-9a-f]{2})([0-9a-f]{2})$ ]]; then
                                IP1=$((16#${BASH_REMATCH[1]}))
                                IP2=$((16#${BASH_REMATCH[2]}))
                                IP3=$((16#${BASH_REMATCH[3]}))
                                IP4=$((16#${BASH_REMATCH[4]}))
                                printf "  %-6s  %-10s  %-50s  %d.%d.%d.%d\n" "$i" "$GID_TYPE" "$GID" "$IP1" "$IP2" "$IP3" "$IP4"
                            else
                                printf "  %-6s  %-10s  %-50s  %s\n" "$i" "$GID_TYPE" "$GID" "-"
                            fi
                        fi
                    fi
                done
            fi
        done
        echo ""
    fi
done
