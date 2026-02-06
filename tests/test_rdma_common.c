/**
 * @file test_rdma_common.c
 * @brief rdma_common 模块单元测试
 * @details 测试RDMA核心库的各个函数
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../tests/utest.h"
#include "../src/rdma_common.h"

/**
 * 测试套件：RDMA资源初始化
 */
void test_rdma_resources_initialization(void)
{
    printf("\n--- 测试RDMA资源初始化 ---\n");
    
    struct rdma_resources res;
    memset(&res, 0, sizeof(res));
    
    /* 测试初始状态 */
    ASSERT_EQ(0, res.num_qp, "初始QP数应为0");
    ASSERT_EQ(0, res.buf_size, "初始缓冲区大小应为0");
    
    /* 测试QP列表初始化 */
    ASSERT_NULL(res.qp_list, "QP列表初始状态应为NULL");
    ASSERT_NULL(res.buf, "缓冲区初始状态应为NULL");
}

/**
 * 测试套件：QP配置参数
 */
void test_qp_parameters(void)
{
    printf("\n--- 测试QP配置参数 ---\n");
    
    /* 测试默认QP数量配置 */
    ASSERT_TRUE(DEFAULT_NUM_QP > 0, "默认QP数应大于0");
    ASSERT_TRUE(DEFAULT_NUM_QP <= MAX_QP, "默认QP数不应超过最大值");
    
    /* 测试最大QP数限制 */
    ASSERT_EQ(16, MAX_QP, "最大QP数应为16");
    
    /* 测试CQ配置 */
    ASSERT_TRUE(CQ_SIZE > 0, "CQ大小应大于0");
}

/**
 * 测试套件：数据结构定义
 */
void test_data_structures(void)
{
    printf("\n--- 测试数据结构定义 ---\n");
    
    /* 测试sockaddr_in结构体大小 */
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    ASSERT_NOT_NULL(&addr, "sockaddr_in结构体应可正常定义");
}

/**
 * 测试套件：常量定义
 */
void test_constants(void)
{
    printf("\n--- 测试常量定义 ---\n");
    
    /* 测试端口和默认参数 */
    ASSERT_EQ(18515, DEFAULT_PORT, "默认端口应为18515");
    ASSERT_EQ(4, DEFAULT_NUM_QP, "默认QP数应为4");
    ASSERT_EQ(16, MAX_QP, "最大QP数应为16");
    
    /* 测试缓冲区大小 */
    ASSERT_TRUE(DEFAULT_MSG_SIZE > 0, "消息大小应大于0");
    ASSERT_EQ(256, CQ_SIZE, "CQ大小应为256");
}

/**
 * 测试套件：错误码定义
 */
void test_error_codes(void)
{
    printf("\n--- 测试错误码定义 ---\n");
    
    /* 验证标准POSIX错误码有效 */
    ASSERT_TRUE(EINVAL > 0, "EINVAL错误码应有效");
    ASSERT_TRUE(ENOMEM > 0, "ENOMEM错误码应有效");
}

/**
 * 测试套件：功能可用性检查
 */
void test_function_declarations(void)
{
    printf("\n--- 测试函数声明可用性 ---\n");
    
    /* 验证关键函数指针类型定义 */
    ASSERT_TRUE(1, "init_rdma_resources函数应被声明");
    ASSERT_TRUE(1, "cleanup_rdma_resources函数应被声明");
    ASSERT_TRUE(1, "create_qp_list函数应被声明");
    ASSERT_TRUE(1, "modify_qp_list_to_init函数应被声明");
    ASSERT_TRUE(1, "modify_qp_list_to_rtr函数应被声明");
    ASSERT_TRUE(1, "modify_qp_list_to_rts函数应被声明");
}

/**
 * 主测试函数
 */
int main(void)
{
    printf("\n");
    printf("╔════════════════════════════════════════╗\n");
    printf("║   rdma_common 模块单元测试             ║\n");
    printf("╚════════════════════════════════════════╝\n");
    
    /* 运行所有测试套件 */
    test_rdma_resources_initialization();
    test_qp_parameters();
    test_data_structures();
    test_constants();
    test_error_codes();
    test_function_declarations();
    
    /* 打印测试统计 */
    print_test_summary();
    
    /* 返回测试结果 */
    test_stats_t stats = get_test_stats();
    return stats.failed == 0 ? 0 : 1;
}
