package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// SystemStats 定义了我们需要返回的系统信息结构体
type SystemStats struct {
	CPUUsage    float64           `json:"cpu_usage_percent"`
	RAMUsage    float64           `json:"ram_usage_percent"`
	DiskUsage   float64           `json:"disk_usage_percent"`
	CPUTemp     float64           `json:"cpu_temp_celsius"`
	NetRxBytes  uint64            `json:"net_rx_bytes"`
	NetTxBytes  uint64            `json:"net_tx_bytes"`
	NetRxSpeed  float64           `json:"net_rx_speed"` // 新增：接收速率 (MB/s)
	NetTxSpeed  float64           `json:"net_tx_speed"` // 新增：发送速率 (MB/s)
	Uptime      string            `json:"uptime"`
	LastUpdated string            `json:"last_updated"`
	FanRPM      int               `json:"fan_rpm"`
	NetworkIPs  map[string]string `json:"network_ips"`
	DiskMounts  []DiskMountInfo   `json:"disk_mounts"`
}

type DiskMountInfo struct {
	Mountpoint  string  `json:"mountpoint"`
	TotalGB     float64 `json:"total_gb"`
	UsedPercent float64 `json:"used_percent"`
}

var (
	// 全局变量，用于存储最新的系统状态
	latestStats SystemStats
	// 互斥锁，用于在并发读写 latestStats 时保证数据安全
	statsMutex sync.RWMutex
	// 用于计算网络速率的变量
	lastNetRxBytes uint64
	lastNetTxBytes uint64
	lastUpdateTime time.Time
)

// getCPUTemperature 读取树莓派的CPU温度
// 对于树莓派，温度信息通常在 /sys/class/thermal/thermal_zone0/temp 文件中
func getCPUTemperature() (float64, error) {
	data, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp")
	if err != nil {
		return 0, err
	}
	// 文件中的值是毫摄氏度，需要除以1000
	temp, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
	if err != nil {
		return 0, err
	}
	return temp / 1000.0, nil
}

func getFanRPM() (int, error) {
	matches, err := filepath.Glob("/sys/class/hwmon/hwmon*/fan1_input")
	if err != nil || len(matches) == 0 {
		return 0, fmt.Errorf("fan1_input not found")
	}
	data, err := os.ReadFile(matches[0])
	if err != nil {
		return 0, err
	}
	rpm, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		return 0, err
	}
	return rpm, nil
}

// updateStats 是一个核心函数，用于收集所有系统信息
func updateStats() {
	now := time.Now()
	timeDiff := now.Sub(lastUpdateTime).Seconds()
	if timeDiff < 0.1 { // 防止时间差过小
		timeDiff = 0.1
	}

	// CPU 使用率 (1秒内)
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err != nil {
		log.Printf("Error getting CPU usage: %v", err)
		cpuPercent = []float64{0.0}
	}

	// 内存使用率
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		log.Printf("Error getting memory usage: %v", err)
		vmStat = &mem.VirtualMemoryStat{UsedPercent: 0.0}
	}

	// 磁盘使用率 (根目录 "/")
	diskStat, err := disk.Usage("/")
	if err != nil {
		log.Printf("Error getting disk usage: %v", err)
		diskStat = &disk.UsageStat{UsedPercent: 0.0}
	}

	// CPU 温度
	cpuTemp, err := getCPUTemperature()
	if err != nil {
		log.Printf("Error getting CPU temperature: %v", err)
		cpuTemp = 0.0
	}

	// 网络流量 (总计)
	netIO, err := net.IOCounters(false)
	var rxBytes, txBytes uint64
	var rxSpeed, txSpeed float64
	if err != nil || len(netIO) == 0 {
		log.Printf("Error getting network IO: %v", err)
	} else {
		rxBytes = netIO[0].BytesRecv
		txBytes = netIO[0].BytesSent

		// 计算网络速率 (MB/s)
		if lastUpdateTime.IsZero() {
			rxSpeed = 0
			txSpeed = 0
		} else {
			rxSpeed = float64(rxBytes-lastNetRxBytes) / timeDiff / (1024 * 1024) // 转换为 MB/s
			txSpeed = float64(txBytes-lastNetTxBytes) / timeDiff / (1024 * 1024) // 转换为 MB/s
		}
		lastNetRxBytes = rxBytes
		lastNetTxBytes = txBytes
	}

	// 系统运行时间
	uptimeSec, err := host.Uptime()
	var uptimeStr string
	if err != nil {
		log.Printf("Error getting uptime: %v", err)
		uptimeStr = "N/A"
	} else {
		uptimeDuration := time.Duration(uptimeSec) * time.Second
		uptimeStr = uptimeDuration.String()
	}

	// 风扇转速
	fanRPM, err := getFanRPM()
	if err != nil {
		log.Printf("Error getting fan RPM: %v", err)
		fanRPM = 0
	}

	// 每个网络接口的 IP 地址
	netInfo, err := net.Interfaces()
	ipMap := make(map[string]string)
	if err == nil {
		for _, ni := range netInfo {
			for _, addr := range ni.Addrs {
				if strings.Contains(addr.Addr, ".") {
					ipMap[ni.Name] = strings.Split(addr.Addr, "/")[0]
					break
				}
			}
		}
	} else {
		log.Printf("Error getting network interfaces: %v", err)
	}

	// 所有挂载点的磁盘使用
	partitions, err := disk.Partitions(true)
	var diskMounts []DiskMountInfo
	if err == nil {
		for _, p := range partitions {
			usage, err := disk.Usage(p.Mountpoint)
			if err == nil {
				diskMounts = append(diskMounts, DiskMountInfo{
					Mountpoint:  p.Mountpoint,
					TotalGB:     float64(usage.Total) / (1024 * 1024 * 1024),
					UsedPercent: usage.UsedPercent,
				})
			}
		}
	} else {
		log.Printf("Error getting disk partitions: %v", err)
	}

	// 使用写锁来更新全局变量
	statsMutex.Lock()
	defer statsMutex.Unlock()

	latestStats = SystemStats{
		CPUUsage:    cpuPercent[0],
		RAMUsage:    vmStat.UsedPercent,
		DiskUsage:   diskStat.UsedPercent,
		CPUTemp:     cpuTemp,
		NetRxBytes:  rxBytes,
		NetTxBytes:  txBytes,
		NetRxSpeed:  rxSpeed,
		NetTxSpeed:  txSpeed,
		Uptime:      uptimeStr,
		LastUpdated: now.Format(time.RFC3339),
		FanRPM:      fanRPM,
		NetworkIPs:  ipMap,
		DiskMounts:  diskMounts,
	}

	lastUpdateTime = now
	log.Println("System stats updated successfully.")
}

// startStatsUpdater 启动一个goroutine，定时更新系统状态
func startStatsUpdater() {
	// 立即执行一次，避免程序启动时无数据
	go updateStats()

	// 创建一个定时器，每秒执行一次更新
	ticker := time.NewTicker(time.Second)
	go func() {
		for range ticker.C {
			updateStats()
		}
	}()
}

// getStatsHandler 是 Gin 的请求处理函数
func getStatsHandler(c *gin.Context) {
	// 使用读锁来安全地读取数据
	statsMutex.RLock()
	defer statsMutex.RUnlock()

	c.JSON(http.StatusOK, latestStats)
}

func main() {
	log.Println("Starting Raspberry Pi Stats API...")

	// 启动后台统计任务
	startStatsUpdater()

	// 设置 Gin 为发布模式
	gin.SetMode(gin.ReleaseMode)

	// 创建 Gin 路由器
	router := gin.Default()

	// 定义 API 路由
	router.GET("/stats", getStatsHandler)

	log.Println("API server is running at http://localhost:7000")
	// 启动 HTTP 服务器，监听 7000 端口
	if err := router.Run(":7000"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
