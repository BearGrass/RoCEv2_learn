# Makefile for RoCEv2 Learning Project

CC = gcc
CFLAGS = -Wall -Wextra -O2 -g
LDFLAGS = -libverbs -lpthread

SRC_DIR = src
BUILD_DIR = build

# 源文件
COMMON_SRC = $(SRC_DIR)/rdma_common.c $(SRC_DIR)/rdma_common_utils.c $(SRC_DIR)/rdma_common_net.c $(SRC_DIR)/rdma_common_qp.c
SERVER_SRC = $(SRC_DIR)/rdma_server.c
CLIENT_SRC = $(SRC_DIR)/rdma_client.c

# 目标文件
COMMON_OBJ = $(BUILD_DIR)/rdma_common.o $(BUILD_DIR)/rdma_common_utils.o $(BUILD_DIR)/rdma_common_net.o $(BUILD_DIR)/rdma_common_qp.o
SERVER_OBJ = $(BUILD_DIR)/rdma_server.o
CLIENT_OBJ = $(BUILD_DIR)/rdma_client.o

# 可执行文件
SERVER_BIN = $(BUILD_DIR)/rdma_server
CLIENT_BIN = $(BUILD_DIR)/rdma_client

# 默认目标
all: $(BUILD_DIR) $(SERVER_BIN) $(CLIENT_BIN)

# 创建build目录
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# 编译公共对象文件
$(BUILD_DIR)/rdma_common.o: $(SRC_DIR)/rdma_common.c $(SRC_DIR)/rdma_common.h
	$(CC) $(CFLAGS) -c $(SRC_DIR)/rdma_common.c -o $(BUILD_DIR)/rdma_common.o

$(BUILD_DIR)/rdma_common_utils.o: $(SRC_DIR)/rdma_common_utils.c $(SRC_DIR)/rdma_common.h
	$(CC) $(CFLAGS) -c $(SRC_DIR)/rdma_common_utils.c -o $(BUILD_DIR)/rdma_common_utils.o

$(BUILD_DIR)/rdma_common_net.o: $(SRC_DIR)/rdma_common_net.c $(SRC_DIR)/rdma_common.h
	$(CC) $(CFLAGS) -c $(SRC_DIR)/rdma_common_net.c -o $(BUILD_DIR)/rdma_common_net.o

$(BUILD_DIR)/rdma_common_qp.o: $(SRC_DIR)/rdma_common_qp.c $(SRC_DIR)/rdma_common.h
	$(CC) $(CFLAGS) -c $(SRC_DIR)/rdma_common_qp.c -o $(BUILD_DIR)/rdma_common_qp.o

# 编译服务端对象文件
$(SERVER_OBJ): $(SERVER_SRC) $(SRC_DIR)/rdma_common.h
	$(CC) $(CFLAGS) -c $(SERVER_SRC) -o $(SERVER_OBJ)

# 编译客户端对象文件
$(CLIENT_OBJ): $(CLIENT_SRC) $(SRC_DIR)/rdma_common.h
	$(CC) $(CFLAGS) -c $(CLIENT_SRC) -o $(CLIENT_OBJ)

# 链接服务端
$(SERVER_BIN): $(COMMON_OBJ) $(SERVER_OBJ)
	$(CC) $(COMMON_OBJ) $(SERVER_OBJ) -o $(SERVER_BIN) $(LDFLAGS)
	@echo "服务端编译完成: $(SERVER_BIN)"

# 链接客户端
$(CLIENT_BIN): $(COMMON_OBJ) $(CLIENT_OBJ)
	$(CC) $(COMMON_OBJ) $(CLIENT_OBJ) -o $(CLIENT_BIN) $(LDFLAGS)
	@echo "客户端编译完成: $(CLIENT_BIN)"

# 清理
clean:
	rm -rf $(BUILD_DIR)
	@echo "清理完成"

# 重新编译
rebuild: clean all

# 帮助信息
help:
	@echo "RoCEv2学习项目 - Makefile使用说明"
	@echo ""
	@echo "可用目标:"
	@echo "  make          - 编译服务端和客户端程序"
	@echo "  make clean    - 清理编译文件"
	@echo "  make rebuild  - 清理后重新编译"
	@echo "  make help     - 显示此帮助信息"
	@echo ""
	@echo "运行示例:"
	@echo "  服务端: ./build/rdma_server [设备名] [端口] [GID索引]"
	@echo "         ./build/rdma_server rxe0 18515 1"
	@echo ""
	@echo "  客户端: ./build/rdma_client <服务端IP> [设备名] [端口] [GID索引]"
	@echo "         ./build/rdma_client 10.0.134.5 rxe0 18515 1"

.PHONY: all clean rebuild help
