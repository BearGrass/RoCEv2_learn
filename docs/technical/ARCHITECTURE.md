# 🏗️ 项目架构

RoCEv2 RDMA多QP学习项目的整体架构说明。

## 📐 两平面模型

```
┌─────────────────────────────────────────┐
│          应用层 (Application)           │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────┐              ┌──────────┐
│TCP平面  │              │RDMA平面  │
│(控制)   │              │(数据)    │
├─────────┤              ├──────────┤
│端口号   │              │QP对      │
│交换元数据│              │CQ        │
│握手     │              │MR        │
└─────────┘              └──────────┘
```

## 🔄 QP生命周期

```
RESET
  ↓ (create_qp)
INIT
  ↓ (modify_qp_to_init)
INIT
  ↓ (TCP元数据交换)
INIT
  ↓ (modify_qp_to_rtr)
RTR (Ready To Receive)
  ↓ (modify_qp_to_rts)
RTS (Ready To Send)
  ↓ (post_send/receive/poll)
RTS (数据传输中)
  ↓ (cleanup)
销毁
```

## 📦 模块结构

```
RoCEv2_learn/
├── src/
│   ├── rdma_common.h/c    - RDMA核心 (25+个API)
│   ├── rdma_server.c      - 服务端应用
│   └── rdma_client.c      - 客户端应用
├── .ai/
│   ├── _conventions.md    - 编码规范
│   └── modules/           - 模块规范
└── docs/                  - 项目文档
```

## 🔗 模块依赖

```
服务端 (rdma_server.c)
    ↓
通用模块 ← 客户端 (rdma_client.c)
(rdma_common.c)
```

更多细节见 [规范文档](../../.ai/README.md)
