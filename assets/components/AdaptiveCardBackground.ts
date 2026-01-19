import { _decorator, Component, Label, Sprite, SpriteFrame, UITransform, CCFloat, CCInteger } from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

@ccclass('AdaptiveCardBackground')
@menu('UI/AdaptiveCardBackground')
@executeInEditMode(true)
@requireComponent(Sprite)
export class AdaptiveCardBackground extends Component {
    @property({ type: Label, tooltip: '目标Label（留空则自动获取同节点Label）' })
    get targetLabel(): Label | null {
        return this._targetLabel;
    }
    set targetLabel(value: Label | null) {
        this._targetLabel = value;
        this.updateBackground();
    }

    @property({ type: [SpriteFrame], tooltip: '背景图数组：[1行, 2行, 3行]' })
    get bgFrames(): SpriteFrame[] {
        return this._bgFrames;
    }
    set bgFrames(value: SpriteFrame[]) {
        this._bgFrames = value;
        this.updateBackground();
    }

    @property({ type: [CCFloat], tooltip: '对应高度数组：[1行高度, 2行高度, 3行高度]' })
    get heights(): number[] {
        return this._heights;
    }
    set heights(value: number[]) {
        this._heights = value;
        this.updateBackground();
    }

    @property({ type: CCInteger, tooltip: '编辑器手动指定行数（0=自动计算）' })
    get forceLineCount(): number {
        return this._forceLineCount;
    }
    set forceLineCount(value: number) {
        this._forceLineCount = value;
        this.updateBackground();
    }

    @property
    private _forceLineCount: number = 0;

    @property
    private _targetLabel: Label | null = null;

    @property
    private _bgFrames: SpriteFrame[] = [];

    @property
    private _heights: number[] = [60, 90, 120];

    private _sprite: Sprite | null = null;
    private _transform: UITransform | null = null;

    onLoad() {
        this._sprite = this.getComponent(Sprite);
        this._transform = this.getComponent(UITransform);
        this.updateBackground();
    }

    onEnable() {
        this.updateBackground();
    }

    /**
     * 更新背景图和高度
     */
    updateBackground() {
        if (!this._sprite) {
            this._sprite = this.getComponent(Sprite);
        }
        if (!this._transform) {
            this._transform = this.getComponent(UITransform);
        }

        const label = this._targetLabel || this.node.getComponentInChildren(Label);
        if (!label || !this._sprite || !this._transform) return;

        // 编辑器模式下支持手动指定行数
        const lineCount = (EDITOR && this._forceLineCount > 0) 
            ? this._forceLineCount 
            : this.getLineCount(label);
        const index = Math.min(lineCount - 1, 2); // 最多3行，索引0-2

        // 设置背景图
        if (this._bgFrames[index]) {
            this._sprite.spriteFrame = this._bgFrames[index];
        }

        // 设置高度
        if (this._heights[index] !== undefined) {
            this._transform.height = this._heights[index];
        }
    }

    /**
     * 计算Label的行数
     */
    private getLineCount(label: Label): number {
        // 强制更新渲染数据
        try {
            label.updateRenderData(true);
        } catch (e) {
            // 编辑器模式可能抛错，忽略
        }

        // 方法1: 尝试使用私有属性
        const linesWidth = (label as any)._linesWidth;
        if (linesWidth && Array.isArray(linesWidth) && linesWidth.length > 0) {
            return linesWidth.length;
        }

        // 方法2: 通过高度计算
        const labelTransform = label.node.getComponent(UITransform);
        if (!labelTransform) return 1;

        const actualHeight = labelTransform.contentSize.height;
        const lineHeight = label.lineHeight > 0 ? label.lineHeight : label.fontSize;
        
        if (lineHeight <= 0) return 1;
        
        const count = Math.round(actualHeight / lineHeight);
        return Math.max(1, count);
    }

    /**
     * 外部调用：设置文本并更新背景
     */
    setText(text: string) {
        const label = this._targetLabel || this.node.getComponentInChildren(Label);
        if (!label) return;

        label.string = text;

        // 延迟一帧确保Label排版完成
        if (EDITOR) {
            this.updateBackground();
        } else {
            this.scheduleOnce(() => {
                this.updateBackground();
            }, 0);
        }
    }

    /**
     * 获取当前行数
     */
    getCurrentLineCount(): number {
        const label = this._targetLabel || this.node.getComponentInChildren(Label);
        if (!label) return 1;
        return this.getLineCount(label);
    }
}
