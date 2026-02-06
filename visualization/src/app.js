/**
 * 应用主程序
 * 整合所有组件，处理用户交互
 */

class RDMAVisualizationApp {
    constructor() {
        this.renderer = new Renderer('visualization-canvas');
        this.animator = new Animator(this.renderer);
        this.currentScenarioId = 'qp-creation';
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupAnimatorCallbacks();
        
        // 初始化第一个场景
        this.loadScenario('qp-creation');
    }

    initializeElements() {
        // 场景选择按钮
        this.scenarioBtns = document.querySelectorAll('.scenario-btn');
        
        // 控制按钮
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.btnReset = document.getElementById('btn-reset');
        this.btnPrevStep = document.getElementById('btn-prev-step');
        this.btnNextStep = document.getElementById('btn-next-step');
        
        // 速度控制
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');
        
        // 进度显示
        this.progressFill = document.getElementById('progress-fill');
        this.stepCounter = document.getElementById('step-counter');
        
        // 信息面板
        this.stepInfo = document.getElementById('step-info');
        this.codeMapping = document.getElementById('code-mapping');
    }

    setupEventListeners() {
        // 场景选择
        this.scenarioBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.scenarioBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadScenario(e.target.dataset.scenario);
            });
        });

        // 控制按钮
        this.btnPlay.addEventListener('click', () => this.play());
        this.btnPause.addEventListener('click', () => this.pause());
        this.btnReset.addEventListener('click', () => this.reset());
        this.btnPrevStep.addEventListener('click', () => this.prevStep());
        this.btnNextStep.addEventListener('click', () => this.nextStep());

        // 速度控制
        this.speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.animator.setPlaybackSpeed(speed);
            this.speedValue.textContent = speed.toFixed(1) + 'x';
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.animator.isPlaying) {
                        this.pause();
                    } else {
                        this.play();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextStep();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevStep();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.reset();
                    break;
            }
        });
    }

    setupAnimatorCallbacks() {
        this.animator.on('onStepChange', (step, currentIndex, totalSteps) => {
            this.updateUI(step, currentIndex, totalSteps);
        });

        this.animator.on('onScenarioComplete', () => {
            this.onScenarioComplete();
        });

        this.animator.on('onUpdate', (progress) => {
            this.updateProgressBar(progress);
        });
    }

    loadScenario(scenarioId) {
        this.currentScenarioId = scenarioId;
        const scenario = getScenario(scenarioId);
        
        if (scenario) {
            this.animator.setScenario(scenario);
            this.updateUI(scenario.getCurrentStep(), 0, scenario.steps.length);
        }
    }

    play() {
        this.animator.play();
        this.updateButtonStates();
    }

    pause() {
        this.animator.pause();
        this.updateButtonStates();
    }

    reset() {
        this.animator.reset();
        this.updateButtonStates();
    }

    nextStep() {
        this.animator.nextStep();
        this.updateButtonStates();
    }

    prevStep() {
        this.animator.prevStep();
        this.updateButtonStates();
    }

    updateUI(step, currentIndex, totalSteps) {
        if (!step) {
            this.stepInfo.innerHTML = '<p>选择场景开始</p>';
            this.codeMapping.innerHTML = '<p>对应源代码位置将显示在此</p>';
            return;
        }

        // 更新步骤信息
        let infoHTML = `
            <strong>${step.name}</strong>
            <p style="margin-top: 8px; color: #666;">${step.description}</p>
            <p style="margin-top: 8px; font-size: 12px; color: #999;">
                步骤 ${currentIndex + 1} / ${totalSteps}
            </p>
        `;
        this.stepInfo.innerHTML = infoHTML;

        // 更新代码映射
        if (step.codeMapping) {
            const mapping = step.codeMapping;
            let codeHTML = `
                <p><strong>${mapping.file}</strong></p>
                <p style="margin-top: 4px; color: #666; font-family: 'Courier New', monospace; font-size: 11px;">
                    行 ${mapping.startLine}-${mapping.endLine}
                </p>
                <p style="margin-top: 8px; color: #666; font-family: 'Courier New', monospace; font-size: 11px; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                    ${mapping.snippet}
                </p>
            `;
            this.codeMapping.innerHTML = codeHTML;
        }

        // 更新计数器
        this.stepCounter.textContent = `${currentIndex + 1}/${totalSteps}`;
    }

    updateProgressBar(progress) {
        const scenario = this.animator.currentScenario;
        if (!scenario) return;

        const totalSteps = scenario.steps.length;
        const currentIndex = scenario.currentStepIndex;
        const overallProgress = ((currentIndex + progress) / totalSteps) * 100;
        
        this.progressFill.style.width = overallProgress + '%';
    }

    updateButtonStates() {
        const isPlaying = this.animator.isPlaying;
        const isPaused = this.animator.isPaused;
        const scenario = this.animator.currentScenario;
        
        if (!scenario) {
            this.btnPlay.disabled = true;
            this.btnPause.disabled = true;
            this.btnNextStep.disabled = true;
            this.btnPrevStep.disabled = true;
            return;
        }

        this.btnPlay.disabled = isPlaying;
        this.btnPause.disabled = !isPlaying;
        this.btnNextStep.disabled = isPlaying || scenario.currentStepIndex >= scenario.steps.length - 1;
        this.btnPrevStep.disabled = isPlaying || scenario.currentStepIndex === 0;
    }

    onScenarioComplete() {
        console.log('Scenario complete:', this.currentScenarioId);
        this.updateButtonStates();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RDMAVisualizationApp();
    console.log('RDMA Visualization App initialized');
});
