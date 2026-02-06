# Makefile for unit tests
# 编译单元测试文件，独立于主项目

CC = gcc
CFLAGS = -Wall -Wextra -g -I. -I..
LDFLAGS = -lm

# 源文件目录
SRC_DIR = ..
TEST_DIR = .

# 目标目录
BUILD_DIR = build

# 编译目标
TEST_TARGETS = \
	$(BUILD_DIR)/test_rdma_common \
	$(BUILD_DIR)/test_rdma_server \
	$(BUILD_DIR)/test_rdma_client

# 默认目标
.PHONY: all clean run help test_all

all: $(TEST_TARGETS)

# 编译 test_rdma_common
$(BUILD_DIR)/test_rdma_common: $(TEST_DIR)/test_rdma_common.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)
	@echo "✓ 编译成功: test_rdma_common"

# 编译 test_rdma_server
$(BUILD_DIR)/test_rdma_server: $(TEST_DIR)/test_rdma_server.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)
	@echo "✓ 编译成功: test_rdma_server"

# 编译 test_rdma_client
$(BUILD_DIR)/test_rdma_client: $(TEST_DIR)/test_rdma_client.c
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)
	@echo "✓ 编译成功: test_rdma_client"

# 运行所有测试
test_all: all
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║   开始运行所有单元测试                 ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@for test in $(TEST_TARGETS); do \
		echo "运行: $$test"; \
		$$test; \
		if [ $$? -eq 0 ]; then \
			echo "✓ $$test 通过"; \
		else \
			echo "✗ $$test 失败"; \
			exit 1; \
		fi; \
		echo ""; \
	done
	@echo "╔════════════════════════════════════════╗"
	@echo "║   所有单元测试已完成                   ║"
	@echo "╚════════════════════════════════════════╝"

# 运行单个测试
test_common: $(BUILD_DIR)/test_rdma_common
	./$(BUILD_DIR)/test_rdma_common

test_server: $(BUILD_DIR)/test_rdma_server
	./$(BUILD_DIR)/test_rdma_server

test_client: $(BUILD_DIR)/test_rdma_client
	./$(BUILD_DIR)/test_rdma_client

# 清理编译文件
clean:
	rm -rf $(BUILD_DIR)
	@echo "✓ 清理完成"

# 帮助信息
help:
	@echo "单元测试 Makefile 使用指南"
	@echo ""
	@echo "目标："
	@echo "  make all          - 编译所有单元测试"
	@echo "  make test_all     - 运行所有单元测试"
	@echo "  make test_common  - 运行 rdma_common 单元测试"
	@echo "  make test_server  - 运行 rdma_server 单元测试"
	@echo "  make test_client  - 运行 rdma_client 单元测试"
	@echo "  make clean        - 清理编译文件"
	@echo "  make help         - 显示此帮助信息"
	@echo ""
	@echo "用法示例："
	@echo "  make all          # 编译所有测试"
	@echo "  make test_all     # 运行所有测试"
	@echo "  make test_common  # 只运行通用库测试"
	@echo "  make clean        # 清理临时文件"

# 安装到build目录
install: all
	@mkdir -p ../build
	@cp $(TEST_TARGETS) ../build/ 2>/dev/null || true
	@echo "✓ 测试文件已安装到 ../build"
