/**
 * @file utest.h
 * @brief 轻量级单元测试框架
 * @details 提供简单的测试用例定义和执行机制
 */

#ifndef UTEST_H
#define UTEST_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 测试统计 */
typedef struct {
    int total;      /* 总测试数 */
    int passed;     /* 通过数 */
    int failed;     /* 失败数 */
} test_stats_t;

static test_stats_t g_stats = {0, 0, 0};

/**
 * 断言相等（整数）
 * @param expected 期望值
 * @param actual 实际值
 * @param test_name 测试名称
 */
#define ASSERT_EQ(expected, actual, test_name) \
    do { \
        g_stats.total++; \
        if ((expected) == (actual)) { \
            g_stats.passed++; \
            printf("✓ %s\n", test_name); \
        } else { \
            g_stats.failed++; \
            printf("✗ %s (expected %d, got %d)\n", test_name, \
                   (int)(expected), (int)(actual)); \
        } \
    } while (0)

/**
 * 断言相等（指针）
 * @param expected 期望指针
 * @param actual 实际指针
 * @param test_name 测试名称
 */
#define ASSERT_PTR_EQ(expected, actual, test_name) \
    do { \
        g_stats.total++; \
        if ((expected) == (actual)) { \
            g_stats.passed++; \
            printf("✓ %s\n", test_name); \
        } else { \
            g_stats.failed++; \
            printf("✗ %s (expected %p, got %p)\n", test_name, \
                   (expected), (actual)); \
        } \
    } while (0)

/**
 * 断言不为NULL
 * @param ptr 指针
 * @param test_name 测试名称
 */
#define ASSERT_NOT_NULL(ptr, test_name) \
    do { \
        g_stats.total++; \
        if ((ptr) != NULL) { \
            g_stats.passed++; \
            printf("✓ %s\n", test_name); \
        } else { \
            g_stats.failed++; \
            printf("✗ %s (expected non-NULL)\n", test_name); \
        } \
    } while (0)

/**
 * 断言为NULL
 * @param ptr 指针
 * @param test_name 测试名称
 */
#define ASSERT_NULL(ptr, test_name) \
    do { \
        g_stats.total++; \
        if ((ptr) == NULL) { \
            g_stats.passed++; \
            printf("✓ %s\n", test_name); \
        } else { \
            g_stats.failed++; \
            printf("✗ %s (expected NULL, got %p)\n", test_name, (ptr)); \
        } \
    } while (0)

/**
 * 断言真
 * @param condition 条件
 * @param test_name 测试名称
 */
#define ASSERT_TRUE(condition, test_name) \
    do { \
        g_stats.total++; \
        if ((condition)) { \
            g_stats.passed++; \
            printf("✓ %s\n", test_name); \
        } else { \
            g_stats.failed++; \
            printf("✗ %s (condition is false)\n", test_name); \
        } \
    } while (0)

/**
 * 断言假
 * @param condition 条件
 * @param test_name 测试名称
 */
#define ASSERT_FALSE(condition, test_name) \
    do { \
        g_stats.total++; \
        if (!(condition)) { \
            g_stats.passed++; \
            printf("✓ %s\n", test_name); \
        } else { \
            g_stats.failed++; \
            printf("✗ %s (condition is true)\n", test_name); \
        } \
    } while (0)

/**
 * 打印测试统计信息
 */
static inline void print_test_summary(void)
{
    printf("\n");
    printf("========================================\n");
    printf("       测试结果统计\n");
    printf("========================================\n");
    printf("总测试数: %d\n", g_stats.total);
    printf("通过数:   %d\n", g_stats.passed);
    printf("失败数:   %d\n", g_stats.failed);
    printf("========================================\n");
    
    if (g_stats.failed == 0) {
        printf("✓ 所有测试通过！\n");
    } else {
        printf("✗ %d 个测试失败\n", g_stats.failed);
    }
    printf("========================================\n\n");
}

/**
 * 获取测试统计信息
 * @return 测试统计结构体
 */
static inline test_stats_t get_test_stats(void)
{
    return g_stats;
}

#endif /* UTEST_H */
