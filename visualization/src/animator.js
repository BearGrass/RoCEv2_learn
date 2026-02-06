/**
 * 动画和播放控制引擎
 * 处理步骤动画、自动播放、速度控制
 */

class Animator {
    constructor(renderer) {
        this.renderer = renderer;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentScenario = null;
        this.animationFrameId = null;
        this.stepStartTime = 0;
        this.playbackSpeed = 1.0;
        this.callbacks = {
            onStepChange: null,
            onScenarioComplete: null,
            onUpdate: null,
        };
    }

    setScenario(scenario) {
        this.currentScenario = scenario;
        this.stop();
        this.render();
    }

    play() {
        console.log('Animator.play() called');
        if (!this.currentScenario) {
            console.warn('No scenario loaded');
            return;
        }
        
        this.isPlaying = true;
        this.isPaused = false;
        this.stepStartTime = Date.now();
        console.log('Starting animation');
        this.animate();
    }

    pause() {
        this.isPaused = true;
        this.isPlaying = false;
    }

    resume() {
        this.isPaused = false;
        this.isPlaying = true;
        this.stepStartTime = Date.now();
        this.animate();
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    reset() {
        this.stop();
        if (this.currentScenario) {
            this.currentScenario.reset();
            this.render();
            if (this.callbacks.onStepChange) {
                this.callbacks.onStepChange(null, 0, this.currentScenario.steps.length);
            }
        }
    }

    nextStep() {
        if (!this.currentScenario) return;
        
        this.stop();
        const step = this.currentScenario.nextStep();
        
        if (step) {
            this.updateStepState();
            if (this.callbacks.onStepChange) {
                this.callbacks.onStepChange(
                    step,
                    this.currentScenario.currentStepIndex,
                    this.currentScenario.steps.length
                );
            }
        } else {
            // 场景完成
            if (this.callbacks.onScenarioComplete) {
                this.callbacks.onScenarioComplete();
            }
        }
        this.render();
    }

    prevStep() {
        if (!this.currentScenario) return;
        
        this.stop();
        const step = this.currentScenario.prevStep();
        
        if (step) {
            // 回退时，需要恢复完成状态
            if (this.currentScenario.currentStepIndex < this.currentScenario.steps.length - 1) {
                this.currentScenario.steps[this.currentScenario.currentStepIndex + 1].isCompleted = false;
            }
            
            if (this.callbacks.onStepChange) {
                this.callbacks.onStepChange(
                    step,
                    this.currentScenario.currentStepIndex,
                    this.currentScenario.steps.length
                );
            }
        }
        this.render();
    }

    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
    }

    animate() {
        if (!this.isPlaying || !this.currentScenario) {
            console.warn('animate() returned early - isPlaying:', this.isPlaying, 'hasScenario:', !!this.currentScenario);
            return;
        }

        if (this.isPaused) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
            return;
        }

        const currentStep = this.currentScenario.getCurrentStep();
        const elapsed = Date.now() - this.stepStartTime;
        const duration = currentStep.duration / this.playbackSpeed;
        const progress = Math.min(elapsed / duration, 1);

        // 更新渲染
        this.render(progress);

        if (progress === 1) {
            // 当前步骤完成，移动到下一步
            currentStep.isCompleted = true;
            currentStep.isActive = false;

            if (this.callbacks.onStepChange) {
                this.callbacks.onStepChange(
                    currentStep,
                    this.currentScenario.currentStepIndex,
                    this.currentScenario.steps.length
                );
            }

            if (this.currentScenario.isComplete()) {
                this.isPlaying = false;
                if (this.callbacks.onScenarioComplete) {
                    this.callbacks.onScenarioComplete();
                }
            } else {
                // 继续下一步
                this.currentScenario.nextStep();
                this.stepStartTime = Date.now();
            }
        } else {
            currentStep.isActive = true;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    updateStepState() {
        const currentStep = this.currentScenario.getCurrentStep();
        currentStep.isActive = true;
    }

    render(progress = 0) {
        if (!this.currentScenario) return;

        // 根据场景类型选择渲染方法
        if (this.currentScenario.id === 'qp-creation') {
            this.renderer.drawQPCreationFlow(this.currentScenario);
        } else if (this.currentScenario.id === 'data-plane') {
            this.renderer.drawDataPlaneFlow(this.currentScenario);
        }

        // 绘制进度动画
        if (progress > 0 && progress < 1) {
            this.drawProgressAnimation(progress);
        }

        if (this.callbacks.onUpdate) {
            this.callbacks.onUpdate(progress);
        }
    }

    drawProgressAnimation(progress) {
        // 可以在这里添加额外的动画效果
        // 例如脉冲效果、进度指示等
    }

    on(eventName, callback) {
        if (this.callbacks.hasOwnProperty(eventName)) {
            this.callbacks[eventName] = callback;
        }
    }
}
