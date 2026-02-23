import { _decorator, Component, Sprite, Color, Material, Vec4, UITransform, NodeEventType, assetManager } from 'cc';

const { ccclass, property, menu, requireComponent } = _decorator;

const DEFAULT_MATERIAL_UUID = '51bb81bb-c336-4442-bc0f-0530be76997e';

@ccclass('DropShadow')
@menu('Shaders/DropShadow')
@requireComponent(Sprite)
export class DropShadow extends Component {
    private _materialInstance: Material | null = null;

    @property({ type: Material, tooltip: '自定义材质（留空则使用默认材质）' })
    get customMaterial(): Material | null { return this._customMaterial; }
    set customMaterial(value: Material | null) {
        this._customMaterial = value;
        this._materialInstance = null;
        this.applyMaterial();
    }

    @property({ tooltip: '阴影X偏移 (像素)' })
    get offsetX(): number { return this._offsetX; }
    set offsetX(value: number) { this._offsetX = value; this.updateMaterial(); }

    @property({ tooltip: '阴影Y偏移 (像素)' })
    get offsetY(): number { return this._offsetY; }
    set offsetY(value: number) { this._offsetY = value; this.updateMaterial(); }

    @property({ range: [0, 50, 0.5], slide: true, tooltip: '模糊半径 (像素)' })
    get blur(): number { return this._blur; }
    set blur(value: number) { this._blur = value; this.updateMaterial(); }

    @property({ range: [0, 1, 0.01], slide: true, tooltip: '阴影不透明度' })
    get shadowAlpha(): number { return this._shadowAlpha; }
    set shadowAlpha(value: number) { this._shadowAlpha = value; this.updateMaterial(); }

    @property({ type: Color, tooltip: '阴影颜色' })
    get shadowColor(): Color { return this._shadowColor; }
    set shadowColor(value: Color) { this._shadowColor.set(value); this.updateMaterial(); }

    @property
    private _customMaterial: Material | null = null;
    @property
    private _offsetX: number = 0;
    @property
    private _offsetY: number = 4;
    @property
    private _blur: number = 4;
    @property
    private _shadowAlpha: number = 0.5;
    @property
    private _shadowColor: Color = new Color(0, 0, 0, 255);

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
        const width = transform?.width ?? 100;
        const height = transform?.height ?? 100;

        try {
            material.setProperty('shadowParams', new Vec4(this._offsetX, this._offsetY, this._blur, this._shadowAlpha));
            material.setProperty('shadowColor', this._shadowColor);
            material.setProperty('texSize', new Vec4(width, height, 0, 0));
        } catch (e) {}
    }
}
