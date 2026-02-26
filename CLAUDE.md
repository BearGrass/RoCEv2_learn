# CLAUDE.md

> This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📖 Project Overview

Educational **RoCEv2** (RDMA over Converged Ethernet v2) client/server implementation demonstrating **RC (Reliable Connection)** transport with multi-QP support (1-16 concurrent Queue Pairs). All code includes detailed Chinese comments for learning purposes.

---

## 🚀 Build & Run

### Install Dependencies

```bash
# Ubuntu/Debian
sudo apt-get install libibverbs-dev librdmacm-dev

# CentOS/RHEL
sudo yum install libibverbs-devel librdmacm-devel
```

### Build Commands

```bash
make        # Build both client and server
make rebuild    # Clean and rebuild
make clean      # Remove build artifacts
```

### Run Server

```bash
./build/rdma_server [device_name] [port] [gid_index] [num_qp]
# Example: ./build/rdma_server rxe0 18515 1 4
```

### Run Client

```bash
./build/rdma_client <server_ip> [device_name] [port] [gid_index] [num_qp]
# Example: ./build/rdma_client 10.0.134.5 rxe0 18515 1 4
```

> ⚠️ **Note**: For RoCEv2, GID index is typically **1** (not 0). Default TCP port is 18515, default QP count is 4.

---

## 🏗️ Architecture

### Two-Plane Model

The system uses a **control plane + data plane** separation:

| Plane | Protocol | Purpose | Key Functions |
|:-----:|:--------:|---------|---------------|
| **Control** | TCP socket | Exchange QP metadata (QP#, LID, GID) | `sock_sync_data()`, `sock_sync_data_multi()` |
| **Data** | RDMA | High-speed direct memory transfer | `post_send()`, `post_receive()`, `poll_completion()` |

### Component Structure

```
src/
├── rdma_common.h       # Data structures and API declarations
├── rdma_common.c       # Resource init/cleanup, QP state transitions
├── rdma_common_qp.c    # Multi-QP management functions
├── rdma_common_net.c   # TCP socket communication
├── rdma_common_utils.c # Utility functions
├── rdma_server.c       # Passive RDMA endpoint (listens, receives first)
└── rdma_client.c       # Active RDMA endpoint (connects, sends first)
```

**Key Data Structures:**

| Structure | Description |
|:----------|:------------|
| `struct rdma_resources` | Encapsulates all RDMA objects (device, PD, MR, CQ, QP list) |
| `struct cm_con_data_t` | Packed connection metadata exchanged via TCP |
| `res->qp_list[]` | Multi-QP array for concurrent transfers |
| `res->remote_con_data[]` | Remote QP connection info array |

### RDMA Connection Flow

#### Phase 1: Resource Initialization

`init_rdma_resources()`:

1. Get device list → open device → query port
2. Allocate Protection Domain (PD)
3. Register Memory Region (MR) with local/remote access flags
4. Create Completion Queue (CQ) - shared by all QPs
5. Create Queue Pairs (QP list) with RC transport type

#### Phase 2: QP State Machine

```
RESET ──→ INIT ──→ RTR (Ready to Receive) ──→ RTS (Ready to Send)
         │          │                          │
         │          │                          └─→ Data Transfer
         │          └─→ Configure remote QP info
         └─→ Set port, access flags
```

| Function | Transition | Description |
|:---------|:----------:|:------------|
| `modify_qp_to_init()` | RESET → INIT | Set port, access flags |
| `modify_qp_to_rtr()` | INIT → RTR | Configure remote QP info, AH attributes, GID |
| `modify_qp_to_rts()` | RTR → RTS | Set timeout, retry counts |

#### Phase 3: Out-of-Band Connection Exchange

- Uses TCP socket to exchange `cm_con_data_t[]` between client/server
- Must happen **BEFORE** QP transitions to RTR (need remote QP number, LID, GID)
- `sock_sync_data_multi()` handles bidirectional exchange for all QPs

#### Phase 4: Data Transfer (with synchronization)

```
┌─────────────────────────────────────────────────────────────────┐
│ Server: post_receive_all() → send TCP signal → post_send_qp()   │
│                            ↓                                    │
│ Client: wait TCP signal → post_send_qp() → post_receive_all()   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    poll_completion() both sides
```

### Multi-QP Design

| Feature | Description |
|:--------|:------------|
| **Shared CQ Model** | All QPs share a single Completion Queue (size 256) |
| **wr_id Field** | Used to identify which QP generated the completion |
| **Scalability** | Supports 1-16 concurrent QPs for increased throughput |
| **Default** | 4 QPs when no `num_qp` argument specified |

---

## 🔧 Modifying Code

### Critical Constraints

1. **QP state transitions** must follow exact sequence: `RESET → INIT → RTR → RTS`
2. **Receive WRs** must be posted before remote sends data (prevents RNR errors)
3. **Memory regions** must be registered before use in WRs
4. **`cm_con_data_t` struct** is packed - any changes require both sides to match
5. **All QPs share single CQ** - do not create per-QP CQs
6. **Default buffer size** is 4096 bytes (`DEFAULT_MSG_SIZE`)

### File Size Guidelines

| Constraint | Limit |
|:-----------|:-----:|
| Source files | max 300 lines |
| Functions | max 80 lines |
| Parameters | max 5 (use struct for more) |

---

## 🐛 Debugging

### RDMA Diagnostics

```bash
ibv_devices              # List RDMA devices
ibv_devinfo -d rxe0      # Device details
./scripts/show_gids.sh   # Check GID table (index 1 must be non-zero)
./scripts/diagnose.sh    # Automated diagnosis
```

### Common Issues

| Symptom | Cause | Solution |
|:--------|:------|:---------|
| QP → RTR fails | Wrong GID index | Use index 1+, verify with `show_gids.sh` |
| RNR errors | Receive WR not posted | Check `post_receive` order |
| Timeout | CQ poll timeout | Verify QP state and TCP sync |
| Connection refused | Server not running | Start server first |

### Key Files for Troubleshooting

| File | Description |
|:-----|:------------|
| `docs/troubleshooting/QUICKFIX.md` | 90% of GID issues |
| `docs/troubleshooting/TROUBLESHOOTING.md` | Deep diagnostics |
| `.ai/_conventions.md` | C coding standards |

---

## 📚 Documentation

| Document | Description |
|:---------|:------------|
| `.ai/README.md` | AI Coding Guide - Complete module specifications |
| `.ai/_conventions.md` | C Conventions - Mandatory coding standards |
| `docs/technical/ARCHITECTURE.md` | Architecture - Two-plane model details |
| `docs/technical/QP_STATE_USAGE.md` | QP States - QP lifecycle management |
| `docs/QUICK_START.md` | Quick Start - 5-minute setup guide |

---

## 🎨 Visualization Modules

### React Version (v3.0 - Latest)

Modern React-based visualization with **TypeScript**, **Framer Motion**, and **Tailwind CSS**.

#### Quick Start
```bash
cd visualization-react
npm install
npm run dev
# Open http://localhost:5173
```

#### Build Commands
```bash
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

#### Tech Stack
- **Framework**: React 18 + TypeScript
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Build**: Vite

#### Architecture
```
src/
├── components/
│   ├── layout/        # DemoContainer
│   ├── scene/         # HostNode, NetworkScene, StateDiagram
│   ├── control/       # ControlPanel, PlaybackControls, ProgressBar...
│   └── panel/         # StatePanel, CodeDisplay
├── hooks/
│   ├── useAnimationController.ts   # Animation state machine
│   └── useQPStateMachine.ts        # QP state management
├── data/
│   └── animationSteps.ts           # 14-step configuration
├── types/
│   └── index.ts                    # TypeScript types
└── constants/
    └── colors.ts                   # Color scheme
```

#### Animation Flow (14 Steps)
| Phase | Steps | Description |
|:------|:------|:------------|
| 1. Resource Setup | 1-4 | Open device, Alloc PD, Create CQ, Register MR |
| 2. QP Creation | 5-7 | Host A/B create QP → RESET, Exchange QP info |
| 3. State Transition | 8-13 | RESET→INIT→RTR→RTS (both hosts) |
| 4. Connection Done | 14 | RTS ready for RDMA data transfer |

#### Key Features
- **Play/Pause/Reset**: Full playback control
- **Progress Bar**: Click to jump to any step
- **Speed Control**: 0.5x, 1x, 1.5x, 2x
- **Phase Indicator**: 4 phases with visual feedback
- **State Display**: Real-time QP state for Host A/B
- **Code Display**: Shows RDMA API code for each step

#### Documentation
- `visualization-react/README.md` - Usage guide
- `docs/features/VISUALIZATION_REACT_VERSION.md` - Completion report

### Legacy Canvas Version

**DELETED** - The old Canvas-based visualization has been removed. See `docs/features/` for historical documentation.

---

### Legacy Canvas Version (v2.0)

Interactive visualization module with **clean architecture** and **NVIDIA-style design**.

### Quick Start
```bash
cd visualization
./run.sh
# Open http://localhost:8000/visualization/
```

### Architecture (Refactored)
```
User Input → app.js → scene.js → renderer.js → Canvas
                      ↓
                  ui.js → DOM
```

### Modules
| File | Lines | Responsibility |
|:-----|:------|:---------------|
| `src/models.js` | ~150 | Step configuration data |
| `src/scene.js` | ~120 | Scene state management |
| `src/renderer.js` | ~350 | Pure Canvas rendering |
| `src/ui.js` | ~200 | UI updates & event handling |
| `src/app.js` | ~180 | App coordinator |

### Features
- **QP Creation Flow**: 8-step animated visualization (RESET→INIT→RTR→RTS)
- **Data Plane Flow**: RDMA Write communication demo
- **Code Mapping**: Each step links to source code location
- **Interactive Controls**: Play, pause, step, speed adjustment
- **Pulse Animation**: Active nodes glow and breathe

### Documentation
| Doc | Description |
|:----|:------------|
| `visualization/README.md` | Module usage guide |
| `docs/features/VISUALIZATION_REFACTOR_COMPLETE.md` | Refactoring report |
| `docs/features/VISUALIZATION_REFACTOR_PLAN.md` | Refactoring plan |
| `docs/features/VISUALIZATION_IMPROVEMENTS.md` | Optimization requirements |
