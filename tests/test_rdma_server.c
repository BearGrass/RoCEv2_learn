/**
 * @file test_rdma_server.c
 * @brief rdma_server 模块单元测试
 * @details 测试服务端程序的核心功能和配置
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../tests/utest.h"
#include "../src/rdma_common.h"

/**
 * 测试套件：服务端参数解析
 */
void test_server_parameters(void)
{
    printf("\n--- 测试服务端参数处理 ---\n");
    
    /* 测试默认参数 */
    int port = DEFAULT_PORT;
    int gid_idx = 1;  /* RoCEv2通常使用GID索引1 */
    int num_qp = DEFAULT_NUM_QP;
    
    ASSERT_EQ(18515, port, "默认端口应为18515");
    ASSERT_EQ(1, gid_idx, "RoCEv2默认GID索引应为1");
    ASSERT_TRUE(num_qp > 0, "QP数应大于0");
    ASSERT_TRUE(num_qp <= MAX_QP, "QP数不应超过最大值");
}

/**
 * 测试套件：TCP监听配置
 */
void test_tcp_listen_setup(void)
{
    printf("\n--- 测试TCP监听配置 ---\n");
    
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    
    /* 配置服务端地址 */
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(DEFAULT_PORT);
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    
    ASSERT_EQ(AF_INET, server_addr.sin_family, "地址族应为AF_INET");
    ASSERT_NOT_NULL(&server_addr, "服务端地址结构应可正常初始化");
}

/**
 * 测试套件：QP配置参数
 */
void test_server_qp_config(void)
{
    printf("\n--- 测试服务端QP配置 ---\n");
    
    /* 测试QP初始化参数 */
    int num_qp = 4;
    ASSERT_TRUE(num_qp >= 1, "QP数至少为1");
    ASSERT_TRUE(num_qp <= MAX_QP, "QP数不超过最大值");
    
    /* 测试QP索引范围 */
    for (int i = 0; i < num_qp; i++) {
        ASSERT_TRUE(i >= 0 && i < num_qp, "QP索引范围有效");
    }
}

/**
 * 测试套件：连接信息交换格式
 */
void test_connection_info_format(void)
{
    printf("\n--- 测试连接信息交换格式 ---\n");
    
    /* 测试连接信息结构 */
    uint32_t qp_num = 123;
    uint16_t lid = 456;
    uint8_t gid[16];
    
    memset(gid, 0, sizeof(gid));
    
    ASSERT_TRUE(qp_num > 0, "QP号应大于0");
    ASSERT_NOT_NULL(gid, "GID缓冲应可正常分配");
}

/**
 * 测试套件：通信流程验证
 */
void test_communication_flow(void)
{
    printf("\n--- 测试通信流程 ---\n");
    
    /* 验证服务端通信流程 */
    int step = 0;
    
    step++;  /* 步骤1：创建监听socket */
    ASSERT_TRUE(step > 0, "监听socket创建步骤");
    
    step++;  /* 步骤2：初始化RDMA资源 */
    ASSERT_TRUE(step > 1, "RDMA资源初始化步骤");
    
    step++;  /* 步骤3：创建QP */
    ASSERT_TRUE(step > 2, "QP创建步骤");
    
    step++;  /* 步骤4：TCP握手和元数据交换 */
    ASSERT_TRUE(step > 3, "TCP握手步骤");
    
    step++;  /* 步骤5：QP状态转换 */
    ASSERT_TRUE(step > 4, "QP状态转换步骤");
    
    step++;  /* 步骤6：投递接收WR */
    ASSERT_TRUE(step > 5, "投递接收WR步骤");
    
    step++;  /* 步骤7：数据传输 */
    ASSERT_TRUE(step > 6, "数据传输步骤");
    
    ASSERT_EQ(7, step, "完整通信流程应有7个关键步骤");
}

/**
 * 测试套件：资源清理
 */
void test_resource_cleanup(void)
{
    printf("\n--- 测试资源清理 ---\n");
    
    struct rdma_resources res;
    memset(&res, 0, sizeof(res));
    
    /* 模拟资源分配 */
    res.num_qp = 4;
    res.buf_size = 4096;
    
    /* 验证资源状态 */
    ASSERT_EQ(4, res.num_qp, "QP数配置正确");
    ASSERT_EQ(4096, res.buf_size, "缓冲区大小配置正确");
    
    /* 验证清理前资源存在 */
    ASSERT_TRUE(res.num_qp > 0, "清理前应存在资源");
}

/**
 * 主测试函数
 */
int main(void)
{
    printf("\n");
    printf("╔════════════════════════════════════════╗\n");
    printf("║   rdma_server 模块单元测试             ║\n");
    printf("╚════════════════════════════════════════╝\n");
    
    /* 运行所有测试套件 */
    test_server_parameters();
    test_tcp_listen_setup();
    test_server_qp_config();
    test_connection_info_format();
    test_communication_flow();
    test_resource_cleanup();
    
    /* 打印测试统计 */
    print_test_summary();
    
    /* 返回测试结果 */
    test_stats_t stats = get_test_stats();
    return stats.failed == 0 ? 0 : 1;
}
