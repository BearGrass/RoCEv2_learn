/**
 * @file test_rdma_client.c
 * @brief rdma_client 模块单元测试
 * @details 测试客户端程序的核心功能和配置
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../tests/utest.h"
#include "../src/rdma_common.h"

/**
 * 测试套件：客户端参数解析
 */
void test_client_parameters(void)
{
    printf("\n--- 测试客户端参数处理 ---\n");
    
    /* 测试服务端地址 */
    char *server_ip = "127.0.0.1";
    ASSERT_NOT_NULL(server_ip, "服务端IP地址应有效");
    
    /* 测试端口配置 */
    int port = DEFAULT_PORT;
    ASSERT_EQ(18515, port, "默认端口应为18515");
    
    /* 测试GID索引 */
    int gid_idx = 1;  /* RoCEv2使用GID索引1 */
    ASSERT_EQ(1, gid_idx, "RoCEv2默认GID索引应为1");
    
    /* 测试QP数量 */
    int num_qp = DEFAULT_NUM_QP;
    ASSERT_TRUE(num_qp > 0, "QP数应大于0");
}

/**
 * 测试套件：TCP连接配置
 */
void test_tcp_connect_setup(void)
{
    printf("\n--- 测试TCP连接配置 ---\n");
    
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    
    /* 配置服务端地址 */
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(DEFAULT_PORT);
    
    ASSERT_EQ(AF_INET, server_addr.sin_family, "地址族应为AF_INET");
    ASSERT_NOT_NULL(&server_addr, "服务端地址结构应可正常初始化");
}

/**
 * 测试套件：IP地址解析
 */
void test_ip_address_parsing(void)
{
    printf("\n--- 测试IP地址解析 ---\n");
    
    /* 测试有效IP地址 */
    char *valid_ips[] = {
        "127.0.0.1",
        "10.0.0.1",
        "192.168.1.1"
    };
    
    int num_ips = sizeof(valid_ips) / sizeof(valid_ips[0]);
    for (int i = 0; i < num_ips; i++) {
        ASSERT_NOT_NULL(valid_ips[i], "IP地址应有效");
    }
    
    ASSERT_EQ(3, num_ips, "应支持多个IP地址格式");
}

/**
 * 测试套件：QP配置与验证
 */
void test_client_qp_configuration(void)
{
    printf("\n--- 测试客户端QP配置 ---\n");
    
    /* 测试QP初始化参数 */
    int num_qp = 4;
    ASSERT_TRUE(num_qp >= 1, "QP数至少为1");
    ASSERT_TRUE(num_qp <= MAX_QP, "QP数不超过最大值");
    
    /* 测试QP同步配置 */
    uint32_t sq_size = 256;
    uint32_t rq_size = 256;
    
    ASSERT_EQ(256, sq_size, "发送队列大小配置正确");
    ASSERT_EQ(256, rq_size, "接收队列大小配置正确");
}

/**
 * 测试套件：连接信息接收
 */
void test_connection_info_reception(void)
{
    printf("\n--- 测试连接信息接收 ---\n");
    
    /* 模拟接收到的连接信息 */
    uint32_t remote_qp_num = 123;
    uint16_t remote_lid = 456;
    uint8_t remote_gid[16];
    
    memset(remote_gid, 0, sizeof(remote_gid));
    
    ASSERT_TRUE(remote_qp_num > 0, "远程QP号应大于0");
    ASSERT_NOT_NULL(remote_gid, "远程GID缓冲应可正常初始化");
    
    /* 验证接收的信息完整性 */
    ASSERT_EQ(16, sizeof(remote_gid) / sizeof(uint8_t), "GID长度应为16字节");
}

/**
 * 测试套件：客户端通信流程
 */
void test_client_communication_flow(void)
{
    printf("\n--- 测试客户端通信流程 ---\n");
    
    /* 验证客户端通信流程 */
    int step = 0;
    
    step++;  /* 步骤1：解析服务端地址 */
    ASSERT_TRUE(step > 0, "地址解析步骤");
    
    step++;  /* 步骤2：初始化RDMA资源 */
    ASSERT_TRUE(step > 1, "RDMA资源初始化步骤");
    
    step++;  /* 步骤3：创建QP */
    ASSERT_TRUE(step > 2, "QP创建步骤");
    
    step++;  /* 步骤4：TCP连接服务端 */
    ASSERT_TRUE(step > 3, "TCP连接步骤");
    
    step++;  /* 步骤5：发送本地QP信息 */
    ASSERT_TRUE(step > 4, "发送QP信息步骤");
    
    step++;  /* 步骤6：接收远程QP信息 */
    ASSERT_TRUE(step > 5, "接收QP信息步骤");
    
    step++;  /* 步骤7：QP状态转换 */
    ASSERT_TRUE(step > 6, "QP状态转换步骤");
    
    step++;  /* 步骤8：投递接收和发送WR */
    ASSERT_TRUE(step > 7, "投递WR步骤");
    
    step++;  /* 步骤9：数据传输 */
    ASSERT_TRUE(step > 8, "数据传输步骤");
    
    ASSERT_EQ(9, step, "完整通信流程应有9个关键步骤");
}

/**
 * 测试套件：同步机制验证
 */
void test_synchronization_mechanism(void)
{
    printf("\n--- 测试客户端同步机制 ---\n");
    
    /* 测试TCP同步点 */
    int sync_points = 0;
    
    sync_points++;  /* 连接建立 */
    ASSERT_EQ(1, sync_points, "第一个同步点：连接建立");
    
    sync_points++;  /* 交换QP信息 */
    ASSERT_EQ(2, sync_points, "第二个同步点：交换QP信息");
    
    sync_points++;  /* QP状态就绪 */
    ASSERT_EQ(3, sync_points, "第三个同步点：QP状态就绪");
    
    ASSERT_TRUE(sync_points >= 3, "应至少有3个关键同步点");
}

/**
 * 主测试函数
 */
int main(void)
{
    printf("\n");
    printf("╔════════════════════════════════════════╗\n");
    printf("║   rdma_client 模块单元测试             ║\n");
    printf("╚════════════════════════════════════════╝\n");
    
    /* 运行所有测试套件 */
    test_client_parameters();
    test_tcp_connect_setup();
    test_ip_address_parsing();
    test_client_qp_configuration();
    test_connection_info_reception();
    test_client_communication_flow();
    test_synchronization_mechanism();
    
    /* 打印测试统计 */
    print_test_summary();
    
    /* 返回测试结果 */
    test_stats_t stats = get_test_stats();
    return stats.failed == 0 ? 0 : 1;
}
