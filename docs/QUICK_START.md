# 🚀 快速开始指南

5分钟快速上手 RoCEv2 项目。

## 前置要求

- Linux操作系统
- GCC编译器
- libibverbs-dev 和 librdmacm-dev 库

## 安装依赖

```bash
# Ubuntu/Debian
sudo apt-get install libibverbs-dev librdmacm-dev

# CentOS/RHEL
sudo yum install libibverbs-devel librdmacm-devel
```

## 编译

```bash
cd /home/long/git/RoCEv2_learn
make clean
make
```

## 运行示例

### 终端1 - 启动服务端

```bash
./build/rdma_server rxe0 18515 1 4
```

### 终端2 - 启动客户端

```bash
./build/rdma_client 127.0.0.1 rxe0 18515 1 4
```

## 验证成功

观察输出中看到：
- ✅ "listening on port"
- ✅ "Client connected from"
- ✅ "QPs transitioned to RTS state"
- ✅ "RDMA data transfer complete!"

## 下一步

- 查看 [学习路径](guides/LEARNING_PATH.md) 深入学习
- 查看 [AI编程指南](guides/AI_PROGRAMMING_GUIDE.md) 开始编程
- 遇到问题？查看 [故障排查](troubleshooting/TROUBLESHOOTING.md)
