import { _decorator, Component, Node, Sprite, SpriteFrame, Label, instantiate, Prefab, Color } from 'cc';

const { ccclass, property, menu } = _decorator;

/**
 * 掷骰子控制器
 * 
 * 节点结构：
 * DiceRoot
 * ├── OptionRoot - 放置选中的选项
 * ├── DiceSprite - 骰子图片
 * ├── ResultLabel - 点数显示（投骰后显示）
 * ├── ClickToRollLabel - 提示文本（投骰后隐藏）
 * ├── RollingNode - 滚动时显示节点（避免布局混乱）
 * ├── SuccessNode - 成功节点
 * └── FailNode - 失败节点
 */
@ccclass('DiceRollController')
@menu('Components/DiceRollController')
export class DiceRollController extends Component {
    @property({ type: Node, tooltip: '选项容器节点' })
    optionRoot: Node | null = null;

    @property({ type: Prefab, tooltip: '选项预制体（与 B 卡选项相同）' })
    optionPrefab: Prefab | null = null;

    @property({ type: Sprite, tooltip: '骰子图片 Sprite' })
    diceSprite: Sprite | null = null;

    @property({ type: [SpriteFrame], tooltip: '骰子图片列表（按顺序切换）' })
    diceFrames: SpriteFrame[] = [];

    @property({ type: Label, tooltip: '点数显示 Label' })
    resultLabel: Label | null = null;

    @property({ type: Label, tooltip: 'Click to Roll 提示 Label' })
    clickToRollLabel: Label | null = null;

    @property({ type: Node, tooltip: '滚动时显示节点' })
    rollingNode: Node | null = null;

    @property({ type: Node, tooltip: '成功节点' })
    successNode: Node | null = null;

    @property({ type: Node, tooltip: '失败节点' })
    failNode: Node | null = null;

    private isRolling: boolean = false;
    private rollResult: { success: boolean; value: number } | null = null;

    onLoad() {
        // 初始隐藏
        this.hideAllElements();

        // 绑定点击事件
        this.node.on(Node.EventType.TOUCH_END, this.onDiceClick, this);
    }

    onDestroy() {
        // 清理事件（检查节点是否有效）
        if (this.node && this.node.isValid) {
            this.node.off(Node.EventType.TOUCH_END, this.onDiceClick, this);
        }
        
        // 清空引用
        this.rollResult = null;
        this.optionRoot = null;
        this.optionPrefab = null;
        this.diceSprite = null;
        this.diceFrames = [];
        this.resultLabel = null;
        this.clickToRollLabel = null;
        this.rollingNode = null;
        this.successNode = null;
        this.failNode = null;
    }

    /**
     * 初始隐藏所有元素
     */
    private hideAllElements() {
        if (this.resultLabel) this.resultLabel.node.active = false;
        if (this.rollingNode) this.rollingNode.active = false;
        if (this.successNode) this.successNode.active = false;
        if (this.failNode) this.failNode.active = false;
    }

    /**
     * 显示掷骰子界面
     * @param optionText 选中的选项文本
     * @param rollResult 投骰结果（成功/失败和点数）
     */
    showDiceRoll(optionText: string, rollResult: { success: boolean; value: number }) {
        console.log('[DiceRoll] 显示掷骰子界面，选项:', optionText, '结果:', rollResult);

        this.rollResult = rollResult;

        // 显示节点
        this.node.active = true;

        // 重置状态
        this.isRolling = false;
        this.hideAllElements();

        // 显示选中的选项
        this.showSelectedOption(optionText);

        // 显示初始骰子图片
        if (this.diceSprite && this.diceFrames.length > 0) {
            this.diceSprite.spriteFrame = this.diceFrames[0];
        }

        // 显示 Click to Roll 提示
        if (this.clickToRollLabel) {
            this.clickToRollLabel.node.active = true;
        }
    }

    /**
     * 显示选中的选项
     */
    private showSelectedOption(optionText: string) {
        if (!this.optionRoot || !this.optionPrefab) {
            return;
        }

        // 清空容器
        this.optionRoot.removeAllChildren();

        // 创建选项节点
        const optionNode = instantiate(this.optionPrefab);
        
        // 设置文本
        const label = optionNode.getComponentInChildren(Label);
        if (label) {
            label.string = optionText;
        }

        this.optionRoot.addChild(optionNode);
    }

    /**
     * 点击掷骰子
     */
    private async onDiceClick() {
        if (this.isRolling) {
            return;
        }

        console.log('[DiceRoll] 开始投骰子');
        this.isRolling = true;

        // 隐藏 Click to Roll 提示
        if (this.clickToRollLabel) {
            this.clickToRollLabel.node.active = false;
        }

        // 显示滚动节点
        if (this.rollingNode) {
            this.rollingNode.active = true;
        }

        // 播放骰子动画
        await this.playDiceAnimation();

        // 显示结果
        this.showResult();

        // 2 秒后触发完成事件
        this.scheduleOnce(() => {
            this.onDiceCompleted();
        }, 2);
    }

    /**
     * 播放骰子动画
     */
    private async playDiceAnimation(): Promise<void> {
        if (!this.diceSprite || this.diceFrames.length === 0) {
            console.warn('[DiceRoll] 骰子图片或帧列表未配置');
            return;
        }

        console.log('[DiceRoll] 开始播放骰子动画，共', this.diceFrames.length, '帧');

        // 使用循环方式切换帧，避免递归调用 scheduleOnce
        for (let i = 0; i < this.diceFrames.length; i++) {
            console.log('[DiceRoll] 切换到第', i + 1, '帧');
            this.diceSprite.spriteFrame = this.diceFrames[i];
            
            // 等待 0.1 秒
            await this.wait(100);
        }

        console.log('[DiceRoll] 骰子动画播放完成');
    }

    /**
     * 显示结果
     */
    private showResult() {
        if (!this.rollResult) {
            return;
        }

        // 隐藏滚动节点
        if (this.rollingNode) {
            this.rollingNode.active = false;
        }

        // 显示点数
        if (this.resultLabel) {
            this.resultLabel.node.active = true;
            this.resultLabel.string = this.rollResult.value.toString();
            
            // 设置颜色：成功白色，失败 #FF5476
            if (this.rollResult.success) {
                this.resultLabel.color = Color.WHITE;
            } else {
                this.resultLabel.color = new Color().fromHEX('#FF5476');
            }
        }

        // 显示成功/失败节点
        if (this.rollResult.success) {
            if (this.successNode) {
                this.successNode.active = true;
            }
        } else {
            if (this.failNode) {
                this.failNode.active = true;
            }
        }

        console.log('[DiceRoll] 投骰结果:', this.rollResult.success ? '成功' : '失败', '点数:', this.rollResult.value);
    }

    /**
     * 掷骰完成
     */
    private onDiceCompleted() {
        console.log('[DiceRoll] 掷骰完成，触发事件');
        
        // 触发完成事件
        this.node.emit('dice-completed', this.rollResult);
        
        // 隐藏节点
        this.node.active = false;
    }

    /**
     * 等待
     */
    private wait(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.scheduleOnce(() => resolve(), ms / 1000);
        });
    }
}
