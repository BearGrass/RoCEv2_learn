# Copilot Instructions for RoCEv2_learn

## Project Overview

Educational RoCEv2 (RDMA over Converged Ethernet v2) implementation with RC (Reliable Connection) transport. All code includes detailed Chinese comments. Supports both Soft-RoCE (rxe) and hardware RDMA NICs.

**Key Understanding**: This is a learning project structured as a reference implementation—every step is intentionally documented and sequenced for clarity. Code modifications must respect the precise control flow and QP state machine.

## Architecture Essentials

### The Two-Plane Model

**Data Plane (RDMA)**: Direct memory-to-memory transfers via Queue Pairs (QPs) after connection established  
**Control Plane (TCP)**: Out-of-band metadata exchange via `sock_sync_data()` to bootstrap RDMA  

This separation is critical: RDMA RC requires knowing the remote QP number before RTR transition, so TCP socket setup must complete first.

### Core Components

- [rdma_common.h](src/rdma_common.h): Constants (DEFAULT_MSG_SIZE=4096, DEFAULT_PORT=18515) and struct definitions
  - `struct rdma_resources`: Encapsulates device, PD, MR, CQ, QP
  - `struct cm_con_data_t`: QP metadata exchanged over TCP (qp_num, lid, gid)
- [rdma_common.c](src/rdma_common.c): Shared lifecycle functions (init, state transitions, WR posting)
- [rdma_server.c](src/rdma_server.c): TCP listener → exchange metadata → receive then send data
- [rdma_client.c](src/rdma_client.c): TCP connector → exchange metadata → send then receive data

### QP State Machine (Non-Negotiable Sequence)

```
RESET → INIT → RTR (Ready To Receive) → RTS (Ready To Send)
```

- `modify_qp_to_init()`: RESET→INIT (set port, access flags)
- `modify_qp_to_rtr()`: INIT→RTR (configure remote QP info, AH attributes, **GID for RoCEv2**)
- `modify_qp_to_rts()`: RTR→RTS (set timeout, retry counts)

**Violation impact**: Skipping any transition causes silent failures or "invalid state" errors.

### RoCEv2-Specific Details

- **GID Index**: Must be ≥1 (index 0 is typically IB, not RoCE). Default is 1.
- **Addressing**: `ah_attr.is_global = 1` and GRH (Global Routing Header) required
- **MTU**: Configured via `port_attr.active_mtu`
- **Hop Limit**: Typically 1 for L2 networks

Soft-RoCE devices created via: `sudo rdma link add rxe0 type rxe netdev eth0`

## Build & Execution

```bash
make              # Compile both client and server to build/
make rebuild      # Clean + compile
make clean        # Remove artifacts

# Server (blocks listening on port, prints connection details)
./build/rdma_server [device_name] [port] [gid_idx]
# Default: device=first available, port=18515, gid_idx=1
# Example: ./build/rdma_server rxe0 18515 1

# Client (connects to server at IP, initiates data exchange)
./build/rdma_client <server_ip> [device_name] [port] [gid_idx]
# Example: ./build/rdma_client 10.0.134.5 rxe0 18515 1
```

**Execution Order**: Always start server first—it waits for TCP connection. Client initiates handshake.

## Critical Patterns

### Work Request Ordering

**Receive must precede Send on remote side**:
- `post_receive()` on server → `post_send()` on client
- Failure causes RNR (Receiver Not Ready) errors
- Server posts receive *before* calling `poll_completion()` to avoid race conditions

### Memory Registration

All buffers used in WRs must be registered:
```c
mr = ibv_reg_mr(pd, buf, buf_size, IBV_ACCESS_LOCAL_WRITE | IBV_ACCESS_REMOTE_WRITE);
```
Unregistered buffers silently fail or cause protection errors.

### TCP Metadata Exchange

`cm_con_data_t` is `__attribute__((packed))` and serialized over TCP:
- If struct changes, both client and server must rebuild
- GID is 16 bytes (IPv6-like format)
- Order matters: qp_num → lid → gid

### Synchronization Point

Client waits for server signal before posting send:
```
Server: post_receive() → wait for TCP ack → post_send()
Client: TCP ack received → post_send() → post_receive()
```
This ensures receive WR is ready before data arrives.

## Debugging & Validation

**Device/GID Verification**:
```bash
ibv_devices           # List RDMA devices
ibv_devinfo -d rxe0   # Query device details
show_gids.sh          # Verify GID table entries
```

**Program Output**:
- Both client and server print step-by-step progress to stdout
- Look for "RDMA connect successful" or error lines for quick status
- Check for "QP transitioned to RTS" confirmation

**Typical Failures**:
- "No RDMA devices found" → check Soft-RoCE (`modprobe rdma_rxe`) or hardware NIC
- "Invalid state transition" → QP sequence violated or previous call failed silently
- "Connection timed out" → server not listening on correct port/device
- "RNR" → client sent before server posted receive

## When Modifying Code

1. **Adding RDMA operations**: Respect QP state machine—check transitions before adding new WRs
2. **Changing data flow**: Verify receive/send ordering still satisfies synchronization point
3. **Buffer size changes**: Update DEFAULT_MSG_SIZE in header and recompile both
4. **Adding new fields to metadata**: Update packed struct and ensure serialization matches on both sides
5. **Device logic**: Changes to `init_rdma_resources()` affect both client and server—test separately

## File References for Learning

- [CLAUDE.md](CLAUDE.md): Detailed architecture walkthrough
- [README.md](README.md): Setup, installation, Soft-RoCE configuration
- [Makefile](Makefile): Build rules and compiler flags
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): Common error solutions
