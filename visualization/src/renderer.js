/**
 * Canvas 渲染引擎
 * 负责在 Canvas 上绘制 RDMA 通信流程的可视化图形
 */

class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found:', canvasId);
            throw new Error('Canvas not found: ' + canvasId);
        }
        
        this.ctx = null;
        this.initialized = false;
        
        // 配置 - Geek / Cyberpunk 风格 (蓝青色方案)
        this.colors = {
            primary: '#00d4ff',      // 明亮青色
            secondary: '#0088ff',    // 蓝色
            success: '#00d4ff',      // 成功用青色
            warning: '#ffaa00',      // 警告用橙色
            danger: '#ff3366',       // 危险用粉红
            neutral: '#0088ff44',    // 透明蓝
            text: '#00d4ff',         // 文字用青色
            background: '#0a0e27',   // 稍微深一点的背景
        };

        this.fonts = {
            title: 'bold 18px "Courier New", monospace',
            subtitle: 'bold 14px "Courier New", monospace',
            normal: '13px "Courier New", monospace',
            small: '11px "Courier New", monospace',
        };
        
        // 立即初始化一次
        this.initializeCanvas();
        
        // 监听 resize 事件
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initializeCanvas() {
        if (this.ctx) return; // 已初始化
        
        try {
            this.resizeCanvas();
            this.ctx = this.canvas.getContext('2d');
            if (this.ctx) {
                this.initialized = true;
                console.log('✓ Canvas 已初始化，尺寸:', this.canvas.width, 'x', this.canvas.height);
            }
        } catch (e) {
            console.error('Canvas 初始化失败:', e);
        }
    }

    ensureInitialized() {
        if (!this.ctx) {
            this.initializeCanvas();
        }
        return this.ctx !== null;
    }

    resizeCanvas() {
        if (!this.canvas || !this.canvas.parentElement) return;
        
        const rect = this.canvas.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }
    }

    clear() {
        if (!this.ctx) {
            console.warn('Canvas context not initialized');
            return;
        }
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawQPCreationFlow(scenario) {
        if (!this.ensureInitialized()) {
            console.error('Canvas not properly initialized');
            return;
        }
        
        this.clear();
        const steps = scenario.steps;
        const totalSteps = steps.length;
        const currentIndex = scenario.currentStepIndex;

        // 布局参数
        const cols = 2;
        const rows = Math.ceil(totalSteps / cols);
        const cellWidth = (this.canvas.width - 60) / cols;
        const cellHeight = (this.canvas.height - 80) / rows;
        const padding = 30;

        // 绘制标题
        this.drawTitle('Queue Pair 创建流程');

        // 绘制步骤节点
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = padding + col * cellWidth + cellWidth / 2;
            const y = 80 + row * cellHeight + cellHeight / 2;

            // 绘制节点
            this.drawStepNode(x, y, 40, step, i === currentIndex, i < currentIndex);

            // 绘制连接线
            if (i < steps.length - 1) {
                const nextCol = (i + 1) % cols;
                const nextRow = Math.floor((i + 1) / cols);
                const nextX = padding + nextCol * cellWidth + cellWidth / 2;
                const nextY = 80 + nextRow * cellHeight + cellHeight / 2;
                this.drawArrow(x, y + 40, nextX, nextY - 40, step.isCompleted ? this.colors.success : this.colors.neutral);
            }
        }

        // 步骤信息已移到侧边栏，不在Canvas上显示
    }

    drawDataPlaneFlow(scenario) {
        if (!this.ensureInitialized()) {
            console.error('Canvas not properly initialized');
            return;
        }
        
        this.clear();
        const steps = scenario.steps;
        const currentIndex = scenario.currentStepIndex;

        const startX = 50;
        const startY = 100;
        const stepWidth = 180;
        const stepHeight = 120;
        const lineHeight = 40;

        // 绘制标题
        this.drawTitle('RDMA 数据面流程');

        // 绘制时间线
        const y = startY + 80;
        this.ctx.strokeStyle = this.colors.neutral;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(this.canvas.width - startX, y);
        this.ctx.stroke();

        // 绘制步骤
        steps.forEach((step, i) => {
            const x = startX + (i % 4) * stepWidth;
            const rowOffset = Math.floor(i / 4) * stepHeight;

            // 在时间线上放置节点
            const nodeY = y + (i % 2) * 100 - 50;
            const nodeX = startX + 50 + (i * (this.canvas.width - 100) / steps.length);

            this.drawStepNode(nodeX, nodeY, 35, step, i === currentIndex, i < currentIndex);
        });

        // 步骤信息已移到侧边栏，不在Canvas上显示
    }

    drawStepNode(x, y, radius, step, isActive, isCompleted) {
        // 背景圆 - 添加渐变和增强发光
        const gradient = this.ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius);
        
        if (isActive) {
            // 活跃状态：青色渐变+强发光
            gradient.addColorStop(0, '#00e6ff');
            gradient.addColorStop(1, '#00a8d4');
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = this.colors.primary;
            this.ctx.shadowBlur = 30;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        } else if (isCompleted) {
            // 完成状态：渐变绿青
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(1, '#0088cc');
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
            this.ctx.shadowBlur = 15;
        } else {
            // 未开始状态：暗蓝渐变
            gradient.addColorStop(0, '#0055aa');
            gradient.addColorStop(1, '#002255');
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = 'transparent';
        }

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // 内圈光晕（仅活跃节点）
        if (isActive) {
            this.ctx.strokeStyle = 'rgba(0, 230, 255, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius + 5, 0, 2 * Math.PI);
            this.ctx.stroke();
        }

        // 边框
        if (isActive) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 4;
        } else {
            this.ctx.strokeStyle = '#0088ff';
            this.ctx.lineWidth = 3;
        }
        this.ctx.stroke();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';

        // 文字（步骤号）- 增大且改善对比
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const stepNum = step.id.split('-')[1] || '?';
        
        // 添加文字阴影以提高可读性
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillText(stepNum, x + 1, y + 1);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(stepNum, x, y);

        // 步骤名称（在节点下方）
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = this.fonts.small;
        this.ctx.fillText(step.name.substring(0, 12), x, y + radius + 25);
    }

    drawArrow(fromX, fromY, toX, toY, color) {
        const headlen = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // 连线 - 添加阴影和渐变效果
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // 添加发光阴影
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();

        // 关闭阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // 箭头头 - 增强视觉
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.closePath();
        
        // 箭头发光
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        this.ctx.shadowColor = 'transparent';
        this.ctx.fill();
    }

    drawTitle(text) {
        // 添加发光背景和渐变效果
        this.ctx.font = this.fonts.title;
        this.ctx.textAlign = 'left';
        
        // 背景矩形 - 带渐变
        const gradient = this.ctx.createLinearGradient(30, 40, 400, 40);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 136, 255, 0.05)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(20, 35, 400, 40);
        
        // 背景边框
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 35, 400, 40);
        
        // 绘制主文本
        this.ctx.fillStyle = this.colors.text;
        this.ctx.shadowColor = this.colors.primary;
        this.ctx.shadowBlur = 15;
        this.ctx.fillText(text, 30, 60);
        this.ctx.shadowColor = 'transparent';
        
        // 添加装饰线
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(20, 75);
        this.ctx.lineTo(420, 75);
        this.ctx.stroke();
    }

    drawCurrentStepInfo(step, x, y) {
        // 背景框
        const boxWidth = this.canvas.width - 60;
        const boxHeight = 80;

        this.ctx.fillStyle = '#f0f4ff';
        this.ctx.fillRect(x, y, boxWidth, boxHeight);
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, boxWidth, boxHeight);

        // 标题
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = this.fonts.subtitle;
        this.ctx.textAlign = 'left';
        this.ctx.fillText('当前步骤: ' + step.name, x + 15, y + 25);

        // 描述
        this.ctx.font = this.fonts.normal;
        this.ctx.fillStyle = '#666';
        const description = step.description;
        this.wrapText(description, x + 15, y + 50, boxWidth - 30, 15);
    }

    wrapText(text, x, y, maxWidth, lineHeight) {
        const words = text.split('');
        let line = '';
        let lineCount = 0;

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i];
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
                this.ctx.fillText(line, x, y + lineCount * lineHeight);
                line = words[i];
                lineCount++;
                if (lineCount > 2) break;
            } else {
                line = testLine;
            }
        }
        if (line) {
            this.ctx.fillText(line, x, y + lineCount * lineHeight);
        }
    }

    drawWaveAnimation(x, y, progress) {
        // 绘制波形动画，用于表示数据传输
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const amplitude = 20;
        const frequency = 8;
        const width = 100;

        for (let i = 0; i < width; i++) {
            const sine = Math.sin((i + progress * 20) / frequency) * amplitude;
            const px = x + i;
            const py = y + sine;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.stroke();
    }
}
