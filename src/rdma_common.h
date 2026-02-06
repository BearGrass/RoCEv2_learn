#ifndef RDMA_COMMON_H
#define RDMA_COMMON_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdint.h>
#include <errno.h>
#include <sys/time.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <infiniband/verbs.h>

/* 默认配置参数 */
#define DEFAULT_PORT 18515
#define DEFAULT_MSG_SIZE 4096
#define DEFAULT_NUM_QP 4  /* 默认QP数量 */
#define MAX_QP 16  /* 最大QP数量 */
#define MAX_WR 16  /* 最大Work Request数量 */
#define MAX_SGE 1  /* 每个WR的Scatter-Gather Element数量 */
#define CQ_SIZE 256 /* Completion Queue大小 (扩大以支持多QP) */

/**
 * RDMA资源结构体
 * 包含RDMA通信所需的所有核心资源
 * 支持多QP模式
 */
struct rdma_resources {
    /* 设备相关 */
    struct ibv_device **dev_list;      /* RDMA设备列表 */
    struct ibv_device *ib_dev;         /* 选择的IB设备 */
    struct ibv_context *context;       /* 设备上下文 */
    struct ibv_pd *pd;                 /* Protection Domain (保护域) */

    /* 通信相关 */
    struct ibv_mr *mr;                 /* Memory Region (内存区域) */
    struct ibv_cq *cq;                 /* Completion Queue (完成队列，多QP共享) */
    struct ibv_qp **qp_list;           /* Queue Pair数组 */
    uint32_t num_qp;                   /* QP数量 */

    /* 端口信息 */
    struct ibv_port_attr port_attr;    /* 端口属性 */
    uint8_t ib_port;                   /* IB端口号 */
    int gid_idx;                       /* GID索引 */

    /* 缓冲区 */
    char *buf;                         /* 数据缓冲区 */
    uint32_t buf_size;                 /* 缓冲区大小 */
};

/**
 * 连接信息结构体
 * 用于在客户端和服务端之间交换QP连接所需的信息
 * 支持多QP模式
 */
struct cm_con_data_t {
    uint32_t qp_num;                   /* QP号 */
    uint16_t lid;                      /* Local ID */
    uint8_t gid[16];                   /* GID (全局ID) */
} __attribute__((packed));

/**
 * 多QP连接信息结构体
 * 包含所有QP的连接信息
 */
struct cm_con_data_multi_t {
    uint32_t num_qp;                   /* QP数量 */
    struct cm_con_data_t qp_data[MAX_QP];  /* 多个QP的连接信息 */
} __attribute__((packed));

/* 函数声明 */

/**
 * 打印GID (Global ID)
 */
void print_gid(union ibv_gid *gid);

/**
 * 初始化RDMA资源
 * @param res: RDMA资源结构体指针
 * @param dev_name: 设备名称 (如 "rxe0")
 * @param ib_port: IB端口号
 * @param gid_idx: GID索引
 * @param num_qp: 创建的QP数量
 * @return: 成功返回0，失败返回-1
 */
int init_rdma_resources(struct rdma_resources *res,
                        const char *dev_name,
                        uint8_t ib_port,
                        int gid_idx,
                        uint32_t num_qp);

/**
 * 创建多个QP (Queue Pair)
 * @param res: RDMA资源结构体指针
 * @return: 成功返回0，失败返回-1
 */
int create_qp_list(struct rdma_resources *res);

/**
 * 修改多个QP状态: RESET -> INIT
 * @param res: RDMA资源结构体指针
 * @return: 成功返回0，失败返回-1
 */
int modify_qp_list_to_init(struct rdma_resources *res);

/**
 * 修改多个QP状态: INIT -> RTR (Ready to Receive)
 * @param res: RDMA资源结构体指针
 * @param remote_con_data: 远端连接信息数组
 * @return: 成功返回0，失败返回-1
 */
int modify_qp_list_to_rtr(struct rdma_resources *res,
                          struct cm_con_data_t *remote_con_data);

/**
 * 修改多个QP状态: RTR -> RTS (Ready to Send)
 * @param res: RDMA资源结构体指针
 * @return: 成功返回0，失败返回-1
 */
int modify_qp_list_to_rts(struct rdma_resources *res);

/**
 * 修改QP状态: RTR -> RTS (Ready to Send)
 * @param res: RDMA资源结构体指针
 * @return: 成功返回0，失败返回-1
 */
int modify_qp_to_rts(struct rdma_resources *res);

/**
 * 修改QP状态: RTR -> RTS (Ready to Send)
 * @param res: RDMA资源结构体指针
 * @return: 成功返回0，失败返回-1
 */
int modify_qp_to_rts(struct rdma_resources *res);

/**
 * 通过TCP socket交换多QP连接信息
 * @param sock: TCP socket文件描述符
 * @param local_con_data: 本地连接信息数组
 * @param local_num_qp: 本地QP数量
 * @param remote_con_data: 远端连接信息数组
 * @param remote_num_qp: 远端QP数量指针
 * @return: 成功返回0，失败返回-1
 */
int sock_sync_data_multi(int sock,
                         struct cm_con_data_t *local_con_data,
                         uint32_t local_num_qp,
                         struct cm_con_data_t *remote_con_data,
                         uint32_t *remote_num_qp);

/**
 * Post Receive Request 到指定QP
 * 预先投递接收请求到RQ (Receive Queue)
 * @param res: RDMA资源结构体指针
 * @param qp_idx: QP索引
 * @return: 成功返回0，失败返回-1
 */
int post_receive_qp(struct rdma_resources *res, uint32_t qp_idx);

/**
 * Post Receive Request 到所有QP
 * 预先投递接收请求到所有RQ
 * @param res: RDMA资源结构体指针
 * @return: 成功返回0，失败返回-1
 */
int post_receive_all(struct rdma_resources *res);

/**
 * Post Send Request 到指定QP
 * 投递发送请求到SQ (Send Queue)
 * @param res: RDMA资源结构体指针
 * @param qp_idx: QP索引
 * @param opcode: 操作码 (如 IBV_WR_SEND)
 * @return: 成功返回0，失败返回-1
 */
int post_send_qp(struct rdma_resources *res, uint32_t qp_idx, enum ibv_wr_opcode opcode);

/**
 * Poll Completion Queue
 * 轮询完成队列获取完成事件
 * @param res: RDMA资源结构体指针
 * @param expected_completions: 期望的完成数量
 * @param qp_idx: 如果非负，返回完成事件对应的QP索引指针；如果为负，返回完成数量
 * @return: 成功返回0，失败返回-1
 */
int poll_completion(struct rdma_resources *res, int expected_completions, int *qp_idx);

/**
 * 清理RDMA资源
 * @param res: RDMA资源结构体指针
 */
void cleanup_rdma_resources(struct rdma_resources *res);

/**
 * 打印QP的运行时状态
 * 查询并打印QP的当前属性和状态信息
 * @param res: RDMA资源结构体指针
 * @param qp_idx: QP索引
 * @param title: 状态标题（可选，用于标识打印的上下文）
 * @return: 成功返回0，失败返回-1
 */
int print_qp_state(struct rdma_resources *res, uint32_t qp_idx, const char *title);

#endif /* RDMA_COMMON_H */
