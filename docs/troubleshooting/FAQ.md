# ❓ 常见问题 (FAQ)

快速查找常见问题的答案。

## 编译相关

**Q: 编译失败，提示找不到 libibverbs**

A: 需要安装 RDMA 开发库
```bash
# Ubuntu
sudo apt-get install libibverbs-dev librdmacm-dev

# CentOS
sudo yum install libibverbs-devel librdmacm-devel
```

**Q: 编译有警告，可以忽略吗？**

A: 大多数警告可以忽略，但遵循编码规范可以避免。

## 运行相关

**Q: 启动服务端报错 "bind failed"**

A: 端口被占用，尝试使用不同端口
```bash
./build/rdma_server rxe0 19999 1 4
./build/rdma_client 127.0.0.1 rxe0 19999 1 4
```

**Q: 启动客户端报错 "Connection refused"**

A: 服务端未启动或地址不对

## RDMA相关

**Q: 什么是RoCEv2？**

A: RDMA over Converged Ethernet v2，在以太网上实现RDMA

**Q: GID索引为什么要用1而不是0？**

A: 索引0通常是IB模式，RoCEv2使用索引1+

**Q: 什么是RNR错误？**

A: Receiver Not Ready，接收端还没准备好接收。解决方案是先投递接收WR。

## 多QP相关

**Q: 单QP和多QP有什么区别？**

A: 多QP支持并发传输多条消息，性能更高。

**Q: 最多支持多少个QP？**

A: 默认配置最多16个QP（MAX_QP定义）

详细问题排查见 [故障排查](TROUBLESHOOTING.md)
