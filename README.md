# Raspberry Pi System Monitor / 树莓派系统监控

A real-time system monitoring dashboard for Raspberry Pi 5, featuring a clean Apple-style design with dark/light mode support.

一个实时系统监控面板，专为树莓派 5 设计，采用苹果风格设计，支持深色/浅色模式。

## ✨ Features / 功能特点

- 📊 Real-time system monitoring / 实时系统监控
- 🎨 Clean Apple-style UI design / 清爽的苹果风格界面
- 🌓 Dark/Light mode support / 支持深色/浅色模式
- 📱 Responsive layout / 响应式布局
- 🔄 HTTP polling updates / HTTP 轮询更新

### 📈 Monitored Metrics / 监控指标

- 💻 CPU Usage / CPU 使用率
- 🧠 Memory Usage / 内存使用率
- 💾 Disk Usage / 磁盘使用率
- 🌡️ CPU Temperature / CPU 温度
- 💨 Fan Speed / 风扇转速
- 🌐 Network Traffic / 网络流量
  - 📥 Total RX/TX / 总接收/发送
  - ⚡ Real-time Speed / 实时速率
- 🔌 Network Interfaces / 网络接口
- 📂 Disk Mounts / 磁盘挂载点
- ⏱️ System Uptime / 系统运行时间

## 📋 Requirements / 系统要求

- 🖥️ Raspberry Pi 5 / 树莓派 5
- 🐧 Raspberry Pi OS / 树莓派操作系统
- 🦫 Go 1.16 or higher / Go 1.16 或更高版本
- 🌐 Nginx / Nginx 服务器

## 🚀 Installation / 安装步骤

1. 📥 Clone the repository / 克隆仓库
```bash
git clone https://github.com/yourusername/raspberry-pi-monitor.git
cd raspberry-pi-monitor
```

2. 📦 Install dependencies / 安装依赖
```bash
go mod tidy
```

3. 🔨 Build the application / 构建应用
```bash
go build
```

4. ⚙️ Configure Nginx / 配置 Nginx
```bash
# 复制 Nginx 配置文件
sudo cp nginx.conf /etc/nginx/conf.d/monitor.conf

# 创建网站目录
sudo mkdir -p /var/www/monitor

# 复制前端文件到网站目录
sudo cp -r web/* /var/www/monitor/

# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx 服务
sudo systemctl restart nginx
```

5. 🚀 Start the service / 启动服务
```bash
# 启动后端服务
./raspbpi-resource

# 或者使用 systemd 服务（推荐）
sudo cp raspbpi-resource.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable raspbpi-resource
sudo systemctl start raspbpi-resource
```

## ⚙️ Configuration / 配置说明

### 🔌 Port Configuration / 端口配置

- 🔧 Backend API: 7000 / 后端 API：7000
- 🌐 Web Interface: 80 / Web 界面：80

### 🌐 Nginx Configuration / Nginx 配置

The default configuration includes:
默认配置包括：

- 🔄 Reverse proxy for API / API 反向代理
- 📁 Static file serving / 静态文件服务
- 📂 Root directory: /var/www/monitor / 网站根目录：/var/www/monitor

## 💻 Usage / 使用说明

1. 🌐 Access the dashboard / 访问监控面板
   - 🏠 Local: http://localhost / 本地访问：http://localhost
   - 🌍 Network: http://[raspberry-pi-ip] / 网络访问：http://[树莓派IP]

2. 📊 View system metrics / 查看系统指标
   - 🔄 All metrics update in real-time / 所有指标实时更新
   - ⏱️ Data updates every second / 数据每秒更新一次
   - 🌓 Automatic theme switching based on system preference / 根据系统偏好自动切换主题

## 👨‍💻 Development / 开发说明

### 📁 Project Structure / 项目结构

```
.
├── 📄 main.go                # Backend server / 后端服务器
├── 📁 web/                  # Frontend files / 前端文件
│   ├── 📄 index.html        # Main page / 主页面
│   ├── 📄 style.css         # Styles / 样式
│   └── 📄 script.js         # Frontend logic / 前端逻辑
├── 📄 nginx.conf            # Nginx configuration / Nginx 配置
├── 📄 raspbpi-resource.service  # Systemd service file / Systemd 服务文件
└── 📄 README.md             # This file / 本文件
```

### 📦 Dependencies / 依赖项

- 🔧 Backend / 后端
  - github.com/gin-gonic/gin
  - github.com/shirou/gopsutil/v3

- 🎨 Frontend / 前端
  - Chart.js (via CDN)

## 🛠️ Service Management / 服务管理

### 📊 Check Service Status / 检查服务状态
```bash
# 检查后端服务状态
sudo systemctl status raspbpi-resource

# 检查 Nginx 状态
sudo systemctl status nginx
```

### 📝 View Logs / 查看日志
```bash
# 查看后端服务日志
sudo journalctl -u raspbpi-resource

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

## 🤝 Contributing / 贡献指南

1. 🍴 Fork the repository / 复刻仓库
2. 🌿 Create your feature branch / 创建特性分支
3. 💾 Commit your changes / 提交更改
4. 📤 Push to the branch / 推送到分支
5. 📬 Create a Pull Request / 创建拉取请求

## 📄 License / 许可证

This project is licensed under the MIT License - see the LICENSE file for details.

本项目采用 MIT 许可证 - 详见 LICENSE 文件。

## 🙏 Acknowledgments / 致谢

- [gopsutil](https://github.com/shirou/gopsutil) for system metrics collection
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [Gin](https://gin-gonic.com/) for the web framework

## 📮 Contact / 联系方式

If you have any questions or suggestions, please feel free to open an issue.

如有任何问题或建议，欢迎提交 issue。