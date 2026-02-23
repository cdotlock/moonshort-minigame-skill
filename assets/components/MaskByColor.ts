import { _decorator, Component, Sprite, SpriteFrame, CCFloat, Material } from 'cc';

const { ccclass, property, menu } = _decorator;

@ccclass('MaskByColor')
@menu('UI/MaskByColor')
export class MaskByColor extends Component {
    @property({ type: SpriteFrame, tooltip: '黑色蒙版图（黑色区域将显示底图）' })
    get maskFrame(): SpriteFrame | null {
        return this._maskFrame;
    }
    set maskFrame(value: SpriteFrame | null) {
        this._maskFrame = value;
        this.updateMaterial();
    }

    @property({ type: CCFloat, range: [0, 1, 0.01], slide: true, tooltip: '黑色判定阈值，值越大判定越宽松' })
    get threshold(): number {
        return this._threshold;
    }
    set threshold(value: number) {
        this._threshold = value;
        this.updateMaterial();
    }

    @property
    private _maskFrame: SpriteFrame | null = null;

    @property
    private _threshold: number = 0.5;

    onLoad() {
        this.updateMaterial();
    }

    onEnable() {
        this.updateMaterial();
    }

    private updateMaterial() {
        const sprite = this.getComponent(Sprite);
        if (!sprite || !sprite.customMaterial) return;

        const material = sprite.getMaterialInstance(0);
        if (!material) return;
        
        if (this._maskFrame && this._maskFrame.texture) {
            material.setProperty('maskTexture', this._maskFrame.texture);
        }
        material.setProperty('threshold', this._threshold);
    }

    /**
     * 运行时动态设置蒙版
     */
    setMask(maskFrame: SpriteFrame, threshold?: number) {
        this._maskFrame = maskFrame;
        if (threshold !== undefined) {
            this._threshold = threshold;
        }
        this.updateMaterial();
    }
}
