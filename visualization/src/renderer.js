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
        
        // 配置 - NVIDIA 深色风格（深灰色背景+橙色高亮）
        this.colors = {
            primary: '#ff8800',      // 橙色
            secondary: '#ffaa00',    // 亮橙色
            success: '#ff8800',      // 成功用橙色
            warning: '#ffaa00',      // 警告用亮橙色
            danger: '#ff4444',       // 危险用红色
            neutral: '#444444',      // 中性灰
            text: '#e0e0e0',         // 文字用浅灰
            textBold: '#ffffff',     // 重要文字用白色
            background: '#0f0f0f',   // 深黑背景
            darkBackground: '#1a1a1a', // 稍浅的背景
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
        
        // 添加网格背景以增强视觉
        this.drawGridBackground();
    }

    drawGridBackground() {
        const gridSize = 50;
        this.ctx.strokeStyle = 'rgba(255, 136, 0, 0.05)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
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

        // 绘制标题
        this.drawTitle('Queue Pair 创建流程');

        // 左右两侧框的位置
        const leftBoxX = 50;
        const leftBoxY = 100;
        const leftBoxWidth = 160;
        const leftBoxHeight = 500;
        
        const rightBoxX = this.canvas.width - 210;
        const rightBoxY = 100;
        const rightBoxWidth = 160;
        const rightBoxHeight = 500;

        // 绘制背景组件框
        this.drawComponentBox('系统内存\n(HOST)', leftBoxX, leftBoxY, leftBoxWidth, leftBoxHeight, this.colors.primary);
        this.drawComponentBox('内核驱动\n(DRV)', rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight, this.colors.primary);

        // 按照与内存/驱动的关系分配步骤位置
        let memorySteps = []; // 与内存相关的步骤索引
        let driverSteps = []; // 与驱动相关的步骤索引
        
        steps.forEach((step, idx) => {
            if (step.interaction) {
                if (step.interaction.type === 'memory') {
                    memorySteps.push(idx);
                } else if (step.interaction.type === 'driver') {
                    driverSteps.push(idx);
                }
            }
        });

        // 绘制步骤节点
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const isActive = i === currentIndex;
            const isCompleted = i < currentIndex;
            
            let x, y;
            const hasMemoryInteraction = step.interaction && step.interaction.type === 'memory';
            const hasDriverInteraction = step.interaction && step.interaction.type === 'driver';
            
            // 根据交互类型确定位置 - 节点放在对应框的旁边
            if (hasMemoryInteraction) {
                // 内存相关步骤放在左侧框的右边（靠近框）
                const memIdx = memorySteps.indexOf(i);
                const memCount = memorySteps.length;
                y = leftBoxY + 80 + (memIdx * (leftBoxHeight - 160) / Math.max(1, memCount - 1));
                x = leftBoxX + leftBoxWidth + 80; // 在框的右边
            } else if (hasDriverInteraction) {
                // 驱动相关步骤放在右侧框的左边（靠近框）
                const drvIdx = driverSteps.indexOf(i);
                const drvCount = driverSteps.length;
                y = rightBoxY + 80 + (drvIdx * (rightBoxHeight - 160) / Math.max(1, drvCount - 1));
                x = rightBoxX - 80; // 在框的左边
            }

            // 绘制节点
            this.drawStepNode(x, y, 32, step, isActive, isCompleted);

            // 仅在活跃步骤时绘制交互
            if (isActive && step.interaction) {
                if (hasMemoryInteraction) {
                    // 绘制虚线框表示资源（在内存框内部）
                    const resourceBoxX = leftBoxX + 15;
                    const resourceBoxY = leftBoxY + leftBoxHeight - 80;
                    this.drawResourceBox(resourceBoxX, resourceBoxY, leftBoxWidth - 30, 60, '资源容器', this.colors.secondary);
                    // 绘制连接线从节点到资源框
                    this.drawConnectorLine(x - 35, y, x - 80, resourceBoxY + 30, this.colors.secondary);
                } else if (hasDriverInteraction) {
                    // 绘制数据交换箭头
                    this.drawDataExchange(x - 70, y, x - 150, y, step.interaction.direction);
                    // 绘制连接线到驱动框
                    this.drawConnectorLine(x - 35, y, rightBoxX, y, this.colors.secondary);
                }
            }
        }

        // 绘制流程连接线 - 按步骤顺序连接
        for (let i = 0; i < steps.length - 1; i++) {
            const step = steps[i];
            const nextStep = steps[i + 1];
            
            let x1, y1, x2, y2;
            
            const hasMemoryInteraction = step.interaction && step.interaction.type === 'memory';
            const hasDriverInteraction = step.interaction && step.interaction.type === 'driver';
            const nextHasMemoryInteraction = nextStep.interaction && nextStep.interaction.type === 'memory';
            const nextHasDriverInteraction = nextStep.interaction && nextStep.interaction.type === 'driver';
            
            // 获取当前步骤位置
            if (hasMemoryInteraction) {
                const memIdx = memorySteps.indexOf(i);
                const memCount = memorySteps.length;
                y1 = leftBoxY + 80 + (memIdx * (leftBoxHeight - 160) / Math.max(1, memCount - 1));
                x1 = leftBoxX + leftBoxWidth + 80;
            } else if (hasDriverInteraction) {
                const drvIdx = driverSteps.indexOf(i);
                const drvCount = driverSteps.length;
                y1 = rightBoxY + 80 + (drvIdx * (rightBoxHeight - 160) / Math.max(1, drvCount - 1));
                x1 = rightBoxX - 80;
            }
            
            // 获取下一步骤位置
            if (nextHasMemoryInteraction) {
                const memIdx = memorySteps.indexOf(i + 1);
                const memCount = memorySteps.length;
                y2 = leftBoxY + 80 + (memIdx * (leftBoxHeight - 160) / Math.max(1, memCount - 1));
                x2 = leftBoxX + leftBoxWidth + 80;
            } else if (nextHasDriverInteraction) {
                const drvIdx = driverSteps.indexOf(i + 1);
                const drvCount = driverSteps.length;
                y2 = rightBoxY + 80 + (drvIdx * (rightBoxHeight - 160) / Math.max(1, drvCount - 1));
                x2 = rightBoxX - 80;
            }
            
            this.drawArrow(x1, y1 + 38, x2, y2 - 38, step.isCompleted ? this.colors.success : this.colors.neutral);
        }

        // 在底部显示流程说明
        this.drawFlowExplanation('QP创建流程：依次分配保护域、创建完成队列、注册内存、创建QP、转换QP状态（INIT→RTR→RTS）', 0.95);
    }

    drawConnectorLine(fromX, fromY, toX, toY, color) {
        // 绘制连接线
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 2]);
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawResourceBox(x, y, width, height, label, color) {
        // 绘制虚线资源容器框
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
        
        // 标签
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 10px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x + width / 2, y + height / 2);
    }

    drawDataExchange(fromX, fromY, toX, toY, direction) {
        // 绘制数据往返箭头 - 竖向布局
        const offsetY = 12;
        
        // 上方箭头（请求）
        this.ctx.strokeStyle = this.colors.secondary;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY - offsetY);
        this.ctx.lineTo(toX, fromY - offsetY);
        this.ctx.stroke();
        
        // 右箭头头
        this.ctx.fillStyle = this.colors.secondary;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, fromY - offsetY);
        this.ctx.lineTo(toX - 8, fromY - offsetY - 6);
        this.ctx.lineTo(toX - 8, fromY - offsetY + 6);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 下方箭头（响应）
        this.ctx.strokeStyle = this.colors.secondary;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, fromY + offsetY);
        this.ctx.lineTo(fromX, fromY + offsetY);
        this.ctx.stroke();
        
        // 左箭头头
        this.ctx.fillStyle = this.colors.secondary;
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY + offsetY);
        this.ctx.lineTo(fromX + 8, fromY + offsetY - 6);
        this.ctx.lineTo(fromX + 8, fromY + offsetY + 6);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawDirectionLabel(x, y, text, color) {
        // 绘制方向标签 - 改进文字清晰度
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 12px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 添加阴影改进清晰度
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 2;
        
        this.ctx.fillText(text, x, y);
        
        // 关闭阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    drawDataPlaneFlow(scenario) {
        if (!this.ensureInitialized()) {
            console.error('Canvas not properly initialized');
            return;
        }
        
        this.clear();
        const steps = scenario.steps;
        const currentIndex = scenario.currentStepIndex;

        // 绘制标题
        this.drawTitle('RDMA 数据面流程');

        // 绘制 Client 和 Server 框
        const boxWidth = 120;
        const boxHeight = this.canvas.height - 150;
        const clientX = 40;
        const serverX = this.canvas.width - clientX - boxWidth;
        
        this.drawComponentBox('CLIENT', clientX, 100, boxWidth, boxHeight, this.colors.primary);
        this.drawComponentBox('SERVER', serverX, 100, boxWidth, boxHeight, this.colors.primary);

        // 中间时间线
        const timelineY = this.canvas.height / 2;
        const timelineStartX = clientX + boxWidth + 30;
        const timelineEndX = serverX - 30;

        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(timelineStartX, timelineY);
        this.ctx.lineTo(timelineEndX, timelineY);
        this.ctx.stroke();

        // 绘制步骤和交互箭头
        const stepSpacing = (timelineEndX - timelineStartX) / steps.length;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepX = timelineStartX + (i + 0.5) * stepSpacing;
            const isActive = i === currentIndex;
            const isCompleted = i < currentIndex;

            // 步骤节点在时间线上
            this.drawStepNode(stepX, timelineY, 30, step, isActive, isCompleted);

            // 仅在活跃步骤时绘制交互箭头 - 优化画面清晰度
            if (step.interaction && isActive) {
                const role = step.interaction.role;
                const msgType = step.interaction.type; // 'control', 'data', 'ack'
                
                // 根据消息类型选择颜色 - 改进为NVIDIA风格
                let color = this.colors.primary; // control: 橙色
                if (msgType === 'data') color = this.colors.secondary; // data: 亮橙色
                if (msgType === 'ack') color = this.colors.warning; // ack: 警告色

                // 根据角色（client/server）和消息类型生成标签
                let label = msgType.toUpperCase();
                
                if (role === 'client') {
                    // Client 发送数据到 Server
                    const arrowY = timelineY - 40;
                    this.drawDataFlowArrow(clientX + boxWidth + 20, arrowY, serverX - 20, arrowY, color, label);
                } else if (role === 'server') {
                    // Server 响应回 Client
                    const arrowY = timelineY + 40;
                    this.drawDataFlowArrow(serverX - 20, arrowY, clientX + boxWidth + 20, arrowY, color, label);
                }
            }
        }

        // 步骤信息已移到侧边栏，不在Canvas上显示
        // 在底部显示流程说明
        this.drawFlowExplanation('数据面流程：客户端准备并发送RDMA Write请求，网卡直接写入远端内存，服务器接收并确认完成', 0.95);
    }

    drawFlowExplanation(text, yPercent) {
        const y = this.canvas.height * yPercent;
        const boxHeight = 40;
        const padding = 20;
        const boxY = y - boxHeight / 2;

        // 背景框 - 改进颜色
        this.ctx.fillStyle = this.colors.darkBackground;
        this.ctx.fillRect(20, boxY, this.canvas.width - 40, boxHeight);
        
        // 边框
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, boxY, this.canvas.width - 40, boxHeight);

        // 文字 - 改进清晰度
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '13px "Courier New", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        // 添加阴影改进文字清晰度
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 3;
        
        this.ctx.fillText('ℹ ' + text, padding + 20, y);
        
        // 关闭阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    drawStepNode(x, y, radius, step, isActive, isCompleted) {
        // 背景圆 - 改进颜色方案（NVIDIA风格）
        const gradient = this.ctx.createRadialGradient(x - radius/3, y - radius/3, 0, x, y, radius);
        
        if (isActive) {
            // 活跃状态：橙色+强发光
            gradient.addColorStop(0, '#ffaa00');
            gradient.addColorStop(1, '#ff8800');
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = this.colors.primary;
            this.ctx.shadowBlur = 25;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        } else if (isCompleted) {
            // 完成状态：渐变橙色
            gradient.addColorStop(0, '#ff8800');
            gradient.addColorStop(1, '#dd6600');
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = 'rgba(255, 136, 0, 0.4)';
            this.ctx.shadowBlur = 12;
        } else {
            // 未开始状态：暗灰渐变
            gradient.addColorStop(0, '#444444');
            gradient.addColorStop(1, '#222222');
            this.ctx.fillStyle = gradient;
            this.ctx.shadowColor = 'transparent';
        }

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // 内圈光晕（仅活跃节点）
        if (isActive) {
            this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius + 5, 0, 2 * Math.PI);
            this.ctx.stroke();
        }

        // 边框
        if (isActive) {
            this.ctx.strokeStyle = this.colors.textBold;
            this.ctx.lineWidth = 4;
        } else {
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 2;
        }
        this.ctx.stroke();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';

        // 文字（步骤号）- 增大且改善对比
        this.ctx.fillStyle = this.colors.textBold;
        this.ctx.font = 'bold 24px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const stepNum = step.id.split('-')[1] || '?';
        
        // 添加文字阴影以提高可读性
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillText(stepNum, x + 1, y + 1);
        this.ctx.fillStyle = this.colors.textBold;
        this.ctx.fillText(stepNum, x, y);

        // 步骤名称（在节点下方）
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px "Courier New", monospace';
        
        // 添加阴影改进清晰度
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 2;
        
        this.ctx.fillText(step.name.substring(0, 12), x, y + radius + 25);
        
        // 关闭阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    drawArrow(fromX, fromY, toX, toY, color) {
        const headlen = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // 连线 - 改进样式
        this.ctx.strokeStyle = color || this.colors.primary;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // 添加发光阴影
        this.ctx.shadowColor = color || this.colors.primary;
        this.ctx.shadowBlur = 8;
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();

        // 关闭阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // 箭头头 - 增强视觉
        this.ctx.fillStyle = color || this.colors.primary;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.closePath();
        
        // 箭头发光
        this.ctx.shadowColor = color || this.colors.primary;
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
        this.ctx.shadowColor = 'transparent';
        this.ctx.fill();
    }

    drawTitle(text) {
        // 改进的标题样式
        this.ctx.font = this.fonts.title;
        this.ctx.textAlign = 'left';
        
        // 背景矩形 - 改进颜色
        const gradient = this.ctx.createLinearGradient(30, 40, 400, 40);
        gradient.addColorStop(0, 'rgba(255, 136, 0, 0.12)');
        gradient.addColorStop(1, 'rgba(255, 136, 0, 0.04)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(20, 35, 400, 40);
        
        // 背景边框
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, 35, 400, 40);
        
        // 绘制主文本 - 改进清晰度
        this.ctx.fillStyle = this.colors.textBold;
        this.ctx.shadowColor = this.colors.primary;
        this.ctx.shadowBlur = 10;
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

    // 绘制组件框（系统、内存、client、server等）
    drawComponentBox(label, x, y, width, height, color) {
        // 背景 - 改进颜色
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, this.colors.darkBackground);
        gradient.addColorStop(1, 'rgba(15, 15, 15, 0.9)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, width, height);

        // 边框 - 使用橙色
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // 标签 - 改进文字清晰度和大小
        this.ctx.fillStyle = this.colors.textBold;
        this.ctx.font = 'bold 16px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // 添加文字阴影以提高清晰度
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        this.ctx.fillText(label, x + width / 2, y + 15);
        
        // 关闭阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    // 绘制交互箭头（用于显示组件间的交互）
    drawInteractionArrow(fromX, fromY, toX, toY, color, type) {
        const headlen = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // 虚线
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // 箭头
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.closePath();
        this.ctx.fill();

        // 标签
        if (type) {
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 11px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2 - 8;
            
            // 添加阴影改进清晰度
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 2;
            
            this.ctx.fillText(type, midX, midY);
            
            // 关闭阴影
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }

    // 绘制数据流箭头（用于client-server交互）
    drawDataFlowArrow(fromX, fromY, toX, toY, color, label) {
        const headlen = 12;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        // 曲线
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 10;

        const controlX = (fromX + toX) / 2;
        const controlY = (fromY + toY) / 2 + 30;

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.quadraticCurveTo(controlX, controlY, toX, toY);
        this.ctx.stroke();
        this.ctx.shadowColor = 'transparent';

        // 箭头头
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.closePath();
        this.ctx.fill();

        // 标签背景盒子和文字
        if (label) {
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            // 标签背景 - 改进颜色
            this.ctx.fillStyle = this.colors.darkBackground;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            const boxWidth = label.length * 8 + 12;
            const boxHeight = 22;
            this.ctx.fillRect(midX - boxWidth/2, midY - 11, boxWidth, boxHeight);
            this.ctx.strokeRect(midX - boxWidth/2, midY - 11, boxWidth, boxHeight);
            
            // 文字 - 改进清晰度
            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 13px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // 添加阴影改进清晰度
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 2;
            
            this.ctx.fillText(label, midX, midY);
            
            // 关闭阴影
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }
}
