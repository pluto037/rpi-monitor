// 全局配置
const API_ENDPOINT = '/api/stats'; // API 端点
const UPDATE_INTERVAL = 1000; // 1秒更新一次

// 添加状态标志
let isUpdating = false;
let lastUpdateTime = null;

// 图表配置
const chartConfig = {
    type: 'doughnut',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        }
    }
};

// 创建图表
const createChart = (ctx, label, color) => {
    return new Chart(ctx, {
        ...chartConfig,
        data: {
            labels: [label, ''],
            datasets: [{
                data: [0, 100],
                backgroundColor: [color, 'rgba(0, 0, 0, 0.1)'],
                borderColor: 'transparent',
                borderWidth: 0
            }]
        }
    });
};

// 创建温度图表
const createTempChart = (ctx) => {
    return new Chart(ctx, {
        ...chartConfig,
        data: {
            labels: ['温度', ''],
            datasets: [{
                data: [0, 100],
                backgroundColor: [
                    (ctx) => {
                        const value = ctx.dataset.data[0];
                        if (value >= 80) return '#ff3b30';
                        if (value >= 70) return '#ff9500';
                        return '#34c759';
                    },
                    'rgba(0, 0, 0, 0.1)'
                ],
                borderColor: 'transparent',
                borderWidth: 0
            }]
        }
    });
};

// 创建风扇图表
const createFanChart = (ctx) => {
    return new Chart(ctx, {
        ...chartConfig,
        data: {
            labels: ['转速', ''],
            datasets: [{
                data: [0, 100],
                backgroundColor: [
                    (ctx) => {
                        const value = ctx.dataset.data[0];
                        if (value >= 3000) return '#ff3b30';
                        if (value >= 2000) return '#ff9500';
                        return '#34c759';
                    },
                    'rgba(0, 0, 0, 0.1)'
                ],
                borderColor: 'transparent',
                borderWidth: 0
            }]
        }
    });
};

// DOM 元素获取
const elements = {
    cpuValue: document.getElementById('cpuValue'),
    ramValue: document.getElementById('ramValue'),
    diskValue: document.getElementById('diskValue'),
    tempValue: document.getElementById('tempValue'),
    netRxValue: document.getElementById('netRxValue'),
    netTxValue: document.getElementById('netTxValue'),
    netRxSpeed: document.getElementById('netRxSpeed'),
    netTxSpeed: document.getElementById('netTxSpeed'),
    uptime: document.querySelector('#uptime .value'),
    lastUpdated: document.getElementById('lastUpdated'),
    fanValue: document.getElementById('fanValue'),
    networkIPs: document.getElementById('networkIPs'),
    diskMounts: document.getElementById('diskMounts'),
};

// 检查所有必需的元素是否存在
Object.entries(elements).forEach(([key, element]) => {
    if (!element) {
        console.error(`未找到元素: ${key}`);
    }
});

// 初始化图表
const charts = {
    cpu: createChart(document.getElementById('cpuChart').getContext('2d'), 'CPU', '#0a84ff'),
    ram: createChart(document.getElementById('ramChart').getContext('2d'), '内存', '#5856d6'),
    disk: createChart(document.getElementById('diskChart').getContext('2d'), '硬盘', '#ff9500'),
    temp: createTempChart(document.getElementById('tempChart').getContext('2d')),
    fan: createFanChart(document.getElementById('fanChart').getContext('2d'))
};

// 工具函数：格式化字节
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 更新图表
const updateChart = (chart, value, maxValue = 100) => {
    const percentage = Math.min((value / maxValue) * 100, 100);
    chart.data.datasets[0].data = [percentage, 100 - percentage];
    chart.update('none');
};

// 更新UI的函数
const updateUI = (data) => {
    console.log('开始更新UI，数据:', data);

    // 更新数字和图表
    if (elements.cpuValue) {
        elements.cpuValue.textContent = `${data.cpu_usage_percent.toFixed(1)}%`;
        updateChart(charts.cpu, data.cpu_usage_percent);
    }

    if (elements.ramValue) {
        elements.ramValue.textContent = `${data.ram_usage_percent.toFixed(1)}%`;
        updateChart(charts.ram, data.ram_usage_percent);
    }

    if (elements.diskValue) {
        elements.diskValue.textContent = `${data.disk_usage_percent.toFixed(1)}%`;
        updateChart(charts.disk, data.disk_usage_percent);
    }

    if (elements.tempValue) {
        elements.tempValue.textContent = data.cpu_temp_celsius.toFixed(1);
        updateChart(charts.temp, data.cpu_temp_celsius, 100);
    }

    if (elements.fanValue) {
        elements.fanValue.textContent = data.fan_rpm;
        updateChart(charts.fan, data.fan_rpm, 5000);
    }

    if (elements.netRxValue) elements.netRxValue.textContent = formatBytes(data.net_rx_bytes);
    if (elements.netTxValue) elements.netTxValue.textContent = formatBytes(data.net_tx_bytes);
    
    // 更新网络速率
    if (elements.netRxSpeed) {
        const rxSpeed = data.net_rx_speed.toFixed(2);
        elements.netRxSpeed.textContent = `${rxSpeed} MB/s`;
    }
    if (elements.netTxSpeed) {
        const txSpeed = data.net_tx_speed.toFixed(2);
        elements.netTxSpeed.textContent = `${txSpeed} MB/s`;
    }

    if (elements.uptime) elements.uptime.textContent = data.uptime;
    if (elements.lastUpdated) elements.lastUpdated.textContent = new Date(data.last_updated).toLocaleString();

    // 更新网络接口信息
    if (elements.networkIPs) {
        elements.networkIPs.innerHTML = '';
        for (const [interface, ip] of Object.entries(data.network_ips)) {
            const div = document.createElement('div');
            div.className = 'network-ip-item';
            div.innerHTML = `
                <div class="interface">${interface}</div>
                <div class="ip">${ip}</div>
            `;
            elements.networkIPs.appendChild(div);
        }
    }

    // 更新磁盘挂载点信息
    if (elements.diskMounts) {
        elements.diskMounts.innerHTML = '';
        const validMounts = data.disk_mounts.filter(mount => mount.total_gb > 0);
        validMounts.forEach(mount => {
            const div = document.createElement('div');
            div.className = 'disk-mount-item';
            div.innerHTML = `
                <div class="mountpoint">${mount.mountpoint}</div>
                <div class="disk-stats">
                    <span>总容量: ${mount.total_gb.toFixed(1)} GB</span>
                    <span class="used-percent">使用率: ${mount.used_percent.toFixed(1)}%</span>
                </div>
            `;
            elements.diskMounts.appendChild(div);
        });
    }
};

// 从API获取数据
const fetchData = async () => {
    if (isUpdating) {
        console.log('上一次更新还未完成，跳过本次更新');
        return;
    }

    try {
        console.log('开始获取数据...');
        isUpdating = true;

        const response = await fetch(API_ENDPOINT, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('获取到数据:', data);

        if (!data || typeof data !== 'object') {
            throw new Error('返回的数据格式无效');
        }

        const requiredFields = ['cpu_usage_percent', 'ram_usage_percent', 'disk_usage_percent', 
                              'cpu_temp_celsius', 'net_rx_bytes', 'net_tx_bytes', 'uptime', 
                              'last_updated', 'fan_rpm', 'network_ips', 'disk_mounts'];
        
        const missingFields = requiredFields.filter(field => !(field in data));
        if (missingFields.length > 0) {
            throw new Error(`数据缺少必要字段: ${missingFields.join(', ')}`);
        }

        updateUI(data);
        lastUpdateTime = new Date();
        console.log('数据更新成功，时间:', lastUpdateTime.toLocaleString());

    } catch (error) {
        console.error('获取数据失败:', error);
        const errorMessage = `数据更新失败: ${error.message}`;
        if (elements.lastUpdated) {
            elements.lastUpdated.textContent = errorMessage;
        }
    } finally {
        isUpdating = false;
    }
};

// 监听主题变化
const handleThemeChange = (e) => {
    const isDark = e.matches;
    document.documentElement.style.setProperty('--chart-bg', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化...');
    
    // 监听主题变化
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addListener(handleThemeChange);
    handleThemeChange(darkModeMediaQuery);
    
    // 立即执行一次
    fetchData().catch(error => {
        console.error('初始数据获取失败:', error);
    });

    // 设置定时器
    const timerId = setInterval(() => {
        const now = new Date();
        if (lastUpdateTime && (now - lastUpdateTime) < UPDATE_INTERVAL) {
            console.log('距离上次更新时间不足，跳过本次更新');
            return;
        }
        fetchData();
    }, UPDATE_INTERVAL);

    // 添加页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('页面变为可见，立即更新数据');
            fetchData();
        }
    });

    // 添加错误处理
    window.addEventListener('error', (event) => {
        console.error('页面发生错误:', event.error);
    });
});
