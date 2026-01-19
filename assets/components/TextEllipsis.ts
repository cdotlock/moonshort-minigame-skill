import { _decorator, Component, Label, CCInteger, UITransform, Overflow } from 'cc';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

/**
 * 多行文本裁剪组件
 * 当文本超过指定行数时，自动裁剪并添加省略号
 * 
 * 使用方法：
 * 1. 将此组件添加到带有 Label 的节点上
 * 2. 设置 maxLines 为最大显示行数
 * 3. Label 的 Overflow 需设置为 RESIZE_HEIGHT
 * 4. 代码中可通过 setText() 或 text 属性设置文本
 */
@ccclass('TextEllipsis')
@requireComponent(Label)
@executeInEditMode
export class TextEllipsis extends Component {
    @property({
        type: CCInteger,
        min: 1,
        tooltip: '最大显示行数'
    })
    maxLines: number = 2;

    @property({
        tooltip: '省略号字符'
    })
    ellipsis: string = '...';

    @property({
        multiline: true,
        tooltip: '原始文本，超出行数限制会自动裁剪并添加省略号'
    })
    set originalText(value: string) {
        this._originalText = value;
        if (this._label) {
            this.applyEllipsis();
        }
    }
    get originalText(): string {
        return this._originalText;
    }

    private _originalText: string = '';
    private _label: Label | null = null;
    private _uiTransform: UITransform | null = null;
    private _isProcessing: boolean = false;
    private _maxHeight: number = 0;

    /**
     * 获取或设置原始文本
     */
    get text(): string {
        return this._originalText;
    }

    set text(value: string) {
        this._originalText = value;
        this.applyEllipsis();
    }

    onLoad() {
        this._label = this.getComponent(Label);
        this._uiTransform = this.getComponent(UITransform);
    }

    start() {
        // 如果没有设置 originalText，则从 Label 获取
        if (this._label && !this._originalText) {
            this._originalText = this._label.string;
        }
        if (this._originalText) {
            this.applyEllipsis();
        }
    }

    /**
     * 应用省略号裁剪
     */
    applyEllipsis() {
        if (this._isProcessing || !this._label || !this._uiTransform) return;
        this._isProcessing = true;

        // 隐藏文本，避免用户看到处理过程
        this.node.active = false;

        // 确保 Label 是 RESIZE_HEIGHT 模式
        this._label.overflow = Overflow.RESIZE_HEIGHT;

        // 先测量单行实际高度
        this._label.string = '测';
        this._label.updateRenderData(true);
        const singleLineHeight = this._uiTransform.contentSize.height;
        this._maxHeight = singleLineHeight * this.maxLines + 2; // +2 容差

        // 设置原始文本
        this._label.string = this._originalText;
        this._label.updateRenderData(true);

        // 下一帧开始处理
        this.scheduleOnce(() => {
            this.processEllipsis();
            // 处理完成后显示
            this.node.active = true;
            this._isProcessing = false;
        }, 0);
    }

    /**
     * 使用二分查找快速定位裁剪位置
     */
    private processEllipsis() {
        if (!this._label || !this._uiTransform) return;

        // 检查是否需要裁剪
        this._label.updateRenderData(true);
        let currentHeight = this._uiTransform.contentSize.height;

        if (currentHeight <= this._maxHeight) {
            return; // 不需要裁剪
        }

        const text = this._originalText;
        let left = 0;
        let right = text.length;
        let result = '';

        // 二分查找合适的裁剪位置
        while (left < right) {
            const mid = Math.floor((left + right + 1) / 2);
            const testText = text.slice(0, mid) + this.ellipsis;
            
            this._label.string = testText;
            this._label.updateRenderData(true);
            currentHeight = this._uiTransform.contentSize.height;

            if (currentHeight <= this._maxHeight) {
                left = mid;
                result = testText;
            } else {
                right = mid - 1;
            }
        }

        // 设置最终结果
        if (result) {
            this._label.string = result;
        } else {
            // 如果二分查找没有找到合适位置，使用最小文本
            this._label.string = text.charAt(0) + this.ellipsis;
        }
        this._label.updateRenderData(true);
    }

    /**
     * 强制刷新
     */
    refresh() {
        this.applyEllipsis();
    }

    /**
     * 设置新文本并应用省略号
     */
    setText(text: string) {
        this.text = text;
    }
}
