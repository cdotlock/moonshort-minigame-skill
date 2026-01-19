import { _decorator, Component, UIRenderer, Sprite, Label, Color, CCInteger, clamp, director, Director } from 'cc';

const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

@ccclass('SolidToTransparent')
@menu('Components/SolidToTransparent')
@executeInEditMode(true)
@requireComponent(UIRenderer)
export class SolidToTransparent extends Component {
    private _renderer: UIRenderer | null = null;

    @property({ type: Color, tooltip: '渐变颜色（纯色）' })
    get maskColor(): Color { return this._maskColor; }
    set maskColor(value: Color) { this._maskColor.set(value); this.updateColor(); }

    @property({ range: [0, 1, 0.01], slide: true, tooltip: '渐变起始位置 (0-1)' })
    get gradientStart(): number { return this._gradientStart; }
    set gradientStart(value: number) { this._gradientStart = clamp(value, 0, 1); this.updateColor(); }

    @property({ type: CCInteger, range: [0, 3, 1], tooltip: '渐变方向: 0=上到下, 1=下到上, 2=左到右, 3=右到左' })
    get direction(): number { return this._direction; }
    set direction(value: number) { this._direction = value; this.updateColor(); }

    @property
    private _maskColor: Color = new Color(67, 48, 16, 255);

    @property
    private _gradientStart: number = 0;

    @property
    private _direction: number = 0;

    onLoad() {
        this._renderer = this.node.getComponent(UIRenderer);
        if (!(this._renderer instanceof Sprite || this._renderer instanceof Label)) {
            console.warn('SolidToTransparent 只对 Sprite 或 Label 有效');
            this.destroy();
            return;
        }
        // 启用顶点透明度
        (this._renderer as any)['_useVertexOpacity'] = true;
        this.updateColor();
    }

    onEnable() {
        this.updateColor();
        director.once(Director.EVENT_AFTER_DRAW, this.updateColor, this);
    }

    onDisable() {
        const ur = this._renderer;
        const renderData = (ur as any)?._renderData;
        if (!renderData || !renderData.chunk || !renderData.chunk.vb) return;
        const vb = renderData.chunk.vb;
        const color = ur.color;
        const r = color.r / 255;
        const g = color.g / 255;
        const b = color.b / 255;
        const a = color.a / 255;
        vb[5] = vb[14] = vb[23] = vb[32] = r;
        vb[6] = vb[15] = vb[24] = vb[33] = g;
        vb[7] = vb[16] = vb[25] = vb[34] = b;
        vb[8] = vb[17] = vb[26] = vb[35] = a;
    }

    private updateColor() {
        const ur = this._renderer;
        if (!ur) return;

        const renderData = (ur as any)._renderData;
        if (!renderData || !renderData.chunk || !renderData.chunk.vb) {
            // renderData 可能未初始化，延迟一帧
            this.scheduleOnce(() => this.updateColor(), 0);
            return;
        }

        const vb = renderData.chunk.vb;

        const r = this._maskColor.r / 255;
        const g = this._maskColor.g / 255;
        const b = this._maskColor.b / 255;
        const aBase = this._maskColor.a / 255;

        const alphaLB = this.computeAlpha(0, 0) * aBase;
        const alphaRB = this.computeAlpha(1, 0) * aBase;
        const alphaLT = this.computeAlpha(0, 1) * aBase;
        const alphaRT = this.computeAlpha(1, 1) * aBase;

        // 4 个顶点颜色写入（与 Palette 一致的 vb 索引）
        vb[5] = r;  vb[6] = g;  vb[7] = b;  vb[8] = alphaLB;
        vb[14] = r; vb[15] = g; vb[16] = b; vb[17] = alphaRB;
        vb[23] = r; vb[24] = g; vb[25] = b; vb[26] = alphaLT;
        vb[32] = r; vb[33] = g; vb[34] = b; vb[35] = alphaRT;
    }

    private computeAlpha(uvx: number, uvy: number): number {
        let coord = 0;
        switch (this._direction) {
            case 0: coord = uvy; break;          // 上到下
            case 1: coord = 1 - uvy; break;      // 下到上
            case 2: coord = uvx; break;          // 左到右
            case 3: coord = 1 - uvx; break;      // 右到左
        }
        const range = Math.max(1 - this._gradientStart, 0.0001);
        return clamp((coord - this._gradientStart) / range, 0, 1);
    }
}
