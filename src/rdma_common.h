/**
 * @file rdma_common.h
 * @brief RDMA核心功能声明 - 资源管理、QP状态转换、通信接口
 *
 * 本头文件定义了RDMA生命周期管理的所有接口和数据结构，包括：
 * - RDMA资源的生命周期（初始化、清理）
 * - QP状态机转移（RESET → INIT → RTR → RTS）
 * - 多QP共享CQ的设计
 * - TCP元数据交换接口
 * - 发送/接收请求投递接口
 * - 完成队列轮询接口
 *
 * @note 设计支持多QP共享单个CQ，以提高资源利用率
 * @note RoCEv2模式：GID索引通常使用 >= 1（0通常是IB模式）
 * @see 实现见 rdma_common.c, rdma_server.c, rdma_client.c
 *
 * @author AI Programming Assistant
 * @date 2024
 */

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
 * 打印GID (Global ID) 的十六进制形式
 *
 * 输出GID的16字节的十六进制值，格式为 xx:xx:xx:xx:...
 *
 * @param[in] gid  指向GID结构的指针，必须非NULL
 *
 * @note 输出到标准输出，不输出换行符
 * @see struct cm_con_data_t 中使用GID进行连接
 */
void print_gid(union ibv_gid *gid);

/**
 * 初始化RDMA资源
 *
 * 执行RDMA初始化的完整步骤：
 * 1. 获取RDMA设备列表
 * 2. 打开指定的RDMA设备
 * 3. 分配Protection Domain (PD)
 * 4. 分配Memory Region (MR)
 * 5. 创建Completion Queue (CQ)
 * 6. 创建多个Queue Pair (QP)
 * 7. 修改QP状态到INIT
 *
 * @param[out] res      RDMA资源结构体指针，必须非NULL
 * @param[in]  dev_name 设备名称字符串（如 "rxe0"，NULL表示使用第一个设备）
 * @param[in]  ib_port  IB端口号（通常为1）
 * @param[in]  gid_idx  GID索引（RoCEv2通常使用 >= 1，0为IB模式）
 * @param[in]  num_qp   创建的QP数量（0表示使用默认值DEFAULT_NUM_QP）
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       res指针必须指向有效的rdma_resources结构
 * @post      res结构包含初始化的RDMA资源，QP处于INIT状态
 *
 * @note      num_qp不能超过MAX_QP (16)
 * @note      此函数内部调用create_qp_list()和modify_qp_list_to_init()
 *
 * @see       cleanup_rdma_resources() 对应的清理函数
 * @see       create_qp_list(), modify_qp_list_to_init()
 */
int init_rdma_resources(struct rdma_resources *res,
                        const char *dev_name,
                        uint8_t ib_port,
                        int gid_idx,
                        uint32_t num_qp);

/**
 * 创建多个Queue Pair (QP)
 *
 * 为res->num_qp中指定数量的QP分配qp_list数组，
 * 并根据QP初始化参数创建每个QP对象。
 *
 * @param[in,out] res  RDMA资源结构体指针，必须非NULL且已执行初始化
 *                     成功后res->qp_list包含指向QP对象的指针数组
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       res->pd、res->cq、res->num_qp已初始化
 * @post      res->qp_list数组分配并初始化，各QP处于RESET状态
 *
 * @note      此函数必须在init_rdma_resources()内部调用
 * @note      QP初始参数：max_send_wr/max_recv_wr=MAX_WR, max_sge=MAX_SGE
 *
 * @see       modify_qp_list_to_init() 转移QP到INIT状态
 */
int create_qp_list(struct rdma_resources *res);

/**
 * 修改多个QP状态：RESET → INIT
 *
 * 将所有QP从RESET状态转移到INIT状态，
 * 设置IB端口、分区密钥(pkey)等初始化属性。
 *
 * @param[in,out] res  RDMA资源结构体指针，必须非NULL
 *                     QP状态转移后更新到INIT
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       所有QP处于RESET状态
 * @post      所有QP转移到INIT状态
 *
 * @note      此函数必须在create_qp_list()之后调用
 *
 * @see       modify_qp_list_to_rtr() 下一步状态转移
 */
int modify_qp_list_to_init(struct rdma_resources *res);

/**
 * 修改多个QP状态：INIT → RTR (Ready to Receive)
 *
 * 配置远端QP信息并转移QP到Ready-To-Receive状态。
 * 此函数必须在接收到远端QP号、LID和GID后调用。
 * 为每个本地QP配置对应的远端连接信息。
 *
 * @param[in,out] res              RDMA资源结构体指针，必须非NULL
 *                                 QP状态转移后更新到RTR
 * @param[in]     remote_con_data  远端连接信息数组，包含num_qp个元素
 *                                 必须非NULL
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       所有QP处于INIT状态
 * @pre       remote_con_data已接收并包含有效的远端连接信息
 * @post      所有QP转移到RTR状态
 *
 * @note      RoCEv2模式下必须设置GRH (Global Routing Header)
 * @note      此函数配置remote_ah, rq_psn, path_mtu等关键属性
 *
 * @see       modify_qp_list_to_rts() 下一步状态转移
 */
int modify_qp_list_to_rtr(struct rdma_resources *res,
                          struct cm_con_data_t *remote_con_data);

/**
 * 修改多个QP状态：RTR → RTS (Ready to Send)
 *
 * 将所有QP从Ready-To-Receive状态转移到Ready-To-Send状态，
 * 使QP能够发送数据到远端。
 *
 * @param[in,out] res  RDMA资源结构体指针，必须非NULL
 *                     QP状态转移后更新到RTS
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       所有QP处于RTR状态
 * @post      所有QP转移到RTS状态
 *
 * @note      此函数配置sq_psn等发送相关属性
 * @note      只有处于RTS状态的QP才能投递发送请求
 *
 * @see       post_send_qp() 投递发送请求
 */
int modify_qp_list_to_rts(struct rdma_resources *res);

/**
 * 修改QP状态：RTR → RTS (Ready to Send)
 *
 * 将单个QP从Ready-To-Receive状态转移到Ready-To-Send状态。
 * 此函数是modify_qp_list_to_rts()的单QP版本。
 *
 * @param[in,out] res  RDMA资源结构体指针，必须非NULL
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       QP处于RTR状态
 * @post      QP转移到RTS状态
 *
 * @deprecated  建议使用modify_qp_list_to_rts()处理多QP
 * @see       modify_qp_list_to_rts()
 */
int modify_qp_to_rts(struct rdma_resources *res);

/**
 * 通过TCP socket交换多QP连接信息
 *
 * 在TCP连接上同步本地和远端QP的连接信息。
 * 首先发送本地连接信息，然后接收远端连接信息。
 *
 * @param[in]  sock              TCP socket文件描述符，必须已连接
 * @param[in]  local_con_data    本地QP连接信息数组，包含local_num_qp个元素
 * @param[in]  local_num_qp      本地QP数量
 * @param[out] remote_con_data   接收远端连接信息的缓冲区，必须足够容纳
 * @param[out] remote_num_qp     接收远端QP数量的指针，必须非NULL
 *
 * @return    成功返回0，失败返回-1
 *
 * @note      发送格式：num_qp (uint32_t) + qp_data[num_qp]
 * @note      接收格式同上
 *
 * @see       修改QP状态前必须调用此函数获取远端QP信息
 */
int sock_sync_data_multi(int sock,
                         struct cm_con_data_t *local_con_data,
                         uint32_t local_num_qp,
                         struct cm_con_data_t *remote_con_data,
                         uint32_t *remote_num_qp);

/**
 * 投递接收请求到指定QP
 *
 * 预先投递接收请求到指定QP的接收队列(RQ)，使RQ能够接收远端发送的数据。
 * 必须在修改QP状态到RTR之前调用此函数。
 *
 * @param[in] res     RDMA资源结构体指针，必须非NULL
 * @param[in] qp_idx  QP索引，必须 < res->num_qp
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       QP已处于RTR或RTS状态
 * @pre       缓冲区已注册到MR中
 *
 * @note      通常在修改QP到RTR之前调用以避免RNR错误
 * @note      使用单个SGE指向缓冲区
 *
 * @see       post_receive_all() 批量投递所有QP
 */
int post_receive_qp(struct rdma_resources *res, uint32_t qp_idx);

/**
 * 投递接收请求到所有QP
 *
 * 批量为所有QP投递接收请求到各自的接收队列(RQ)。
 * 这是post_receive_qp()的批处理版本。
 *
 * @param[in] res  RDMA资源结构体指针，必须非NULL
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       所有QP已处于RTR或RTS状态
 * @pre       缓冲区已注册到MR中
 *
 * @post      所有RQ都预先投递了接收请求
 *
 * @note      此函数内部循环调用post_receive_qp()
 *
 * @see       post_receive_qp() 投递单个QP
 */
int post_receive_all(struct rdma_resources *res);

/**
 * 投递发送请求到指定QP
 *
 * 投递发送请求到指定QP的发送队列(SQ)，将数据发送到远端。
 * 支持多种操作码：IBV_WR_SEND (无RDMA), IBV_WR_RDMA_WRITE 等。
 *
 * @param[in] res     RDMA资源结构体指针，必须非NULL
 * @param[in] qp_idx  QP索引，必须 < res->num_qp
 * @param[in] opcode  操作码 (IBV_WR_SEND, IBV_WR_RDMA_WRITE等)
 *
 * @return    成功返回0，失败返回-1
 *
 * @pre       QP已处于RTS状态
 * @pre       缓冲区已注册到MR中
 *
 * @note      SEND操作：远端必须投递相应的接收请求
 * @note      RDMA WRITE: 需要远端的RKEY和虚拟地址
 *
 * @see       post_receive_qp() 接收端必须先投递接收请求
 */
int post_send_qp(struct rdma_resources *res, uint32_t qp_idx, enum ibv_wr_opcode opcode);

/**
 * 轮询完成队列获取完成事件
 *
 * 阻塞式轮询多QP共享的完成队列(CQ)，等待指定数量的完成事件。
 * 可以获取发送完成和接收完成事件。
 *
 * @param[in]  res                   RDMA资源结构体指针，必须非NULL
 * @param[in]  expected_completions  期望的完成事件数量
 * @param[out] qp_idx                QP索引数组指针，接收每个完成事件对应的QP索引
 *                                   必须非NULL且包含sufficient空间
 *
 * @return    成功返回实际获取的完成事件数量，失败返回-1
 *
 * @note      此函数会阻塞直到获取足够的完成事件或出错
 * @note      多QP场景：一个CQ可能接收来自多个QP的完成事件
 * @note      qp_idx数组使用工作请求ID(WR ID)的低位字节来推断QP索引
 *
 * @see       投递请求后调用此函数等待完成
 */
int poll_completion(struct rdma_resources *res, int expected_completions, int *qp_idx);

/**
 * 清理RDMA资源
 *
 * 释放init_rdma_resources()分配的所有资源，包括：
 * - QP列表及其关联的QP对象
 * - CQ (Completion Queue)
 * - MR (Memory Region)
 * - PD (Protection Domain)
 * - 设备上下文
 * - 设备列表
 *
 * @param[in,out] res  RDMA资源结构体指针，必须非NULL
 *                     清理完成后各指针置为NULL
 *
 * @note      此函数安全处理NULL指针（不会崩溃）
 * @note      必须在程序退出前调用，否则会泄漏资源
 * @note      调用此函数后不能再使用res中的任何资源
 *
 * @see       init_rdma_resources() 对应的初始化函数
 */
void cleanup_rdma_resources(struct rdma_resources *res);

/**
 * 打印QP的运行时状态
 *
 * 查询QP的当前属性和状态信息，并以易读格式打印到标准输出。
 * 用于调试和诊断QP状态转换问题。
 *
 * @param[in] res     RDMA资源结构体指针，必须非NULL
 * @param[in] qp_idx  QP索引，必须 < res->num_qp
 * @param[in] title   状态标题字符串（用于标识打印的上下文，如"RTR State"）
 *                    可为NULL
 *
 * @return    成功返回0，失败返回-1
 *
 * @note      输出包括：QP状态、QP号、修改掩码、当前PSN等关键属性
 * @note      调试函数，可以在关键状态转移点调用
 *
 * @see       rdma_common_debug.c 包含更详细的调试函数
 */
int print_qp_state(struct rdma_resources *res, uint32_t qp_idx, const char *title);

#endif /* RDMA_COMMON_H */
