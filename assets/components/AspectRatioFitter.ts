import { _decorator, Component, Sprite, UITransform, CCInteger } from 'cc';

const { ccclass, property, menu, executeInEditMode } = _decorator;

enum FitMode {
    CONTAIN = 0,
    COVER = 1,
}

@ccclass('AspectRatioFitter')
@menu('UI/AspectRatioFitter')
@executeInEditMode(true)
export class AspectRatioFitter extends Component {
    @property({ type: CCInteger, tooltip: '0: contain(完整显示) | 1: cover(填满容器)' })
    get fitModeValue(): number {
        return this._fitMode;
    }
    set fitModeValue(value: number) {
        this._fitMode = value;
        this.updateSize();
    }

    @property
    private _fitMode: number = FitMode.CONTAIN;

    private originalRatio: number = 1;

    onLoad() {
        this.initRatio();
        this.updateSize();
    }

    start() {
        this.updateSize();
    }

    private initRatio() {
        const sprite = this.getComponent(Sprite);
        if (sprite?.spriteFrame) {
            const size = sprite.spriteFrame.originalSize;
            this.originalRatio = size.width / size.height;
        }
    }

    /**
     * 更新尺寸以保持宽高比
     * 可在父节点尺寸变化时手动调用
     */
    updateSize() {
        const parent = this.node.parent;
        if (!parent) return;

        const parentTransform = parent.getComponent(UITransform);
        if (!parentTransform) return;

        const parentW = parentTransform.width;
        const parentH = parentTransform.height;
        const parentRatio = parentW / parentH;

        const transform = this.getComponent(UITransform);
        if (!transform) return;

        if (this._fitMode === FitMode.CONTAIN) {
            // 完整显示图片，可能有留白
            if (this.originalRatio > parentRatio) {
                transform.width = parentW;
                transform.height = parentW / this.originalRatio;
            } else {
                transform.height = parentH;
                transform.width = parentH * this.originalRatio;
            }
        } else {
            // 填满容器，可能裁剪部分图片
            if (this.originalRatio > parentRatio) {
                transform.height = parentH;
                transform.width = parentH * this.originalRatio;
            } else {
                transform.width = parentW;
                transform.height = parentW / this.originalRatio;
            }
        }
    }

    /**
     * 手动设置原始宽高比（当不使用 Sprite 时）
     */
    setOriginalRatio(ratio: number) {
        this.originalRatio = ratio;
        this.updateSize();
    }
}
