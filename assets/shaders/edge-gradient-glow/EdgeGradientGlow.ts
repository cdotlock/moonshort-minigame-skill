import { _decorator, Component, Sprite, Color, Material, Vec4, UITransform, NodeEventType, assetManager } from 'cc';

const { ccclass, property, menu, requireComponent } = _decorator;

const DEFAULT_MATERIAL_UUID = 'ee97ff99-60d5-4564-84c2-c5880de022fd';

@ccclass('EdgeGradientGlow')
@menu('Shaders/EdgeGradientGlow')
@requireComponent(Sprite)
export class EdgeGradientGlow extends Component {
    private _materialInstance: Material | null = null;

    @property({ type: Material, tooltip: '自定义材质（留空则使用默认材质）' })
    get customMaterial(): Material | null { return this._customMaterial; }
    set customMaterial(value: Material | null) {
        this._customMaterial = value;
        this._materialInstance = null;
        this.applyMaterial();
    }

    @property({ type: Color, tooltip: '发光颜色' })
    get glowColor(): Color { return this._glowColor; }
    set glowColor(value: Color) { this._glowColor.set(value); this.updateMaterial(); }

    @property({ range: [1, 100, 1], slide: true, tooltip: '模糊强度 (stdDeviation)' })
    get blurRadius(): number { return this._blurRadius; }
    set blurRadius(value: number) { this._blurRadius = value; this.updateMaterial(); }

    @property
    private _customMaterial: Material | null = null;
    @property
    private _glowColor: Color = new Color(67, 48, 16, 255);
    @property
    private _blurRadius: number = 50;

    onLoad() {
        this.applyMaterial();
        this.node.on(NodeEventType.SIZE_CHANGED, this.updateMaterial, this);
    }

    onEnable() { this.applyMaterial(); }

    onDisable() {
        this.node.off(NodeEventType.SIZE_CHANGED, this.updateMaterial, this);
    }

    private applyMaterial() {
        const sprite = this.getComponent(Sprite);
        if (!sprite) return;

        const sourceMaterial = this._customMaterial;
        if (sourceMaterial) {
            this.cloneAndApply(sprite, sourceMaterial);
        } else {
            assetManager.loadAny({ uuid: DEFAULT_MATERIAL_UUID }, (err, material: Material) => {
                if (err || !material) return;
                this.cloneAndApply(sprite, material);
            });
        }
    }

    private cloneAndApply(sprite: Sprite, sourceMaterial: Material) {
        if (!this._materialInstance) {
            this._materialInstance = new Material();
            this._materialInstance.initialize({
                effectAsset: sourceMaterial.effectAsset,
                technique: sourceMaterial.technique,
                defines: sourceMaterial.passes[0]?.defines,
            });
        }
        sprite.customMaterial = this._materialInstance;
        
        this.scheduleOnce(() => this.updateMaterial(), 0);
    }

    private updateMaterial() {
        const material = this._materialInstance;
        if (!material) return;

        const transform = this.getComponent(UITransform);
        const width = transform?.width ?? 256;
        const height = transform?.height ?? 256;

        try {
            material.setProperty('glowColor', this._glowColor);
            material.setProperty('params', new Vec4(width, height, this._blurRadius, 0));
        } catch (e) {}
    }
}
