# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Educational RoCEv2 (RDMA over Converged Ethernet v2) client/server implementation demonstrating RC (Reliable Connection) transport. All code includes detailed Chinese comments for learning purposes.

## Build & Run

```bash
# Build (requires libibverbs-dev package installed)
make                    # Build both client and server
make rebuild            # Clean and rebuild
make clean              # Remove build artifacts

# Run server (on machine with RDMA device)
./build/rdma_server [device_name] [port] [gid_index]
# Example: ./build/rdma_server rxe0 18515 1

# Run client (requires server IP as first argument)
./build/rdma_client <server_ip> [device_name] [port] [gid_index]
# Example: ./build/rdma_client 10.0.134.5 rxe0 18515 1
```

**Note**: For RoCEv2, GID index is typically 1 (not 0). Default TCP port is 18515.

## Architecture

### Component Structure

- **rdma_common.h/c**: Core RDMA utilities implementing the full connection lifecycle
  - `struct rdma_resources`: Encapsulates all RDMA objects (device, PD, MR, CQ, QP)
  - `struct cm_con_data_t`: Connection metadata exchanged via TCP (QP number, LID, GID)
- **rdma_server.c**: Server that listens for TCP connections, exchanges QP info, receives then sends data
- **rdma_client.c**: Client that connects via TCP, exchanges QP info, sends then receives data

### RDMA Connection Flow

The programs follow this multi-phase architecture:

**Phase 1: Resource Initialization** (rdma_common.c: `init_rdma_resources()`)
1. Get device list → open device → query port
2. Allocate Protection Domain (PD)
3. Register Memory Region (MR) with local/remote access flags
4. Create Completion Queue (CQ)
5. Create Queue Pair (QP) with RC transport type

**Phase 2: QP State Machine** (critical for RDMA connections)
```
RESET → INIT → RTR (Ready to Receive) → RTS (Ready to Send)
```
- `modify_qp_to_init()`: RESET→INIT (set port, access flags)
- `modify_qp_to_rtr()`: INIT→RTR (configure remote QP info, AH attributes, GID for RoCEv2)
- `modify_qp_to_rts()`: RTR→RTS (set timeout, retry counts)

**Phase 3: Out-of-Band Connection Exchange**
- Uses TCP socket to exchange `cm_con_data_t` between client/server
- Must happen BEFORE QP transitions to RTR (need remote QP number, LID, GID)
- `sock_sync_data()` handles bidirectional exchange

**Phase 4: Data Transfer**
1. `post_receive()`: Pre-post receive WR to RQ (must be done before remote sends)
2. `post_send()`: Post send WR to SQ
3. `poll_completion()`: Poll CQ for work completions (with 5s timeout)

### Key Design Patterns

**Two-Step Connection**: TCP socket for control plane (exchange QP metadata), RDMA for data plane (actual data transfer). This is a common pattern since RDMA RC requires knowing the remote QP number before connection.

**Synchronization Point**: Client waits for server's TCP signal before sending RDMA data, ensuring receive WR is posted first. This prevents RNR (Receiver Not Ready) errors.

**RoCEv2 Specifics**:
- GID index 1+ (index 0 is typically IB, not RoCE)
- `ah_attr.is_global = 1` and GRH (Global Routing Header) configuration required
- `ah_attr.grh.hop_limit = 1` for L2 networks

## Modifying Code

When adding features:
- QP state transitions must follow the exact sequence (RESET→INIT→RTR→RTS)
- Receive WRs must be posted before remote sends data
- Memory regions must be registered before use in WRs
- The `cm_con_data_t` struct is packed and exchanged over TCP - any changes require both sides to match
- Default buffer size is 4096 bytes (DEFAULT_MSG_SIZE)

For debugging RDMA issues:
- Check `ibv_devices` and `ibv_devinfo` for device status
- Use `show_gids` to verify GID index availability
- Programs print detailed step-by-step output for learning
