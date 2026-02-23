import { _decorator, Component, Sprite, SpriteFrame, Material, Vec4, UITransform, NodeEventType, assetManager } from 'cc';

const { ccclass, property, menu, requireComponent } = _decorator;

const DEFAULT_MATERIAL_UUID = '4e46cdd5-32a3-42d7-9bac-849cbd316fe4';

@ccclass('ShadowWithMask')
@menu('Shaders/ShadowWithMask')
@requireComponent(Sprite)
export class ShadowWithMask extends Component {
    private _materialInstance: Material | null = null;

    @property({ type: Material, tooltip: '自定义材质（留空则使用默认材质）' })
    get customMaterial(): Material | null { return this._customMaterial; }
    set customMaterial(value: Material | null) {
        this._customMaterial = value;
        this._materialInstance = null;
        this.applyMaterial();
    }

    @property({ range: [0, 20, 0.5], slide: true, tooltip: '模糊强度 (sigma)' })
    get blur(): number { return this._blur; }
    set blur(value: number) { this._blur = value; this.updateMaterial(); }

    @property({ type: SpriteFrame, tooltip: '蒙版图' })
    get maskFrame(): SpriteFrame | null { return this._maskFrame; }
    set maskFrame(value: SpriteFrame | null) { this._maskFrame = value; this.updateMaterial(); }

    @property
    private _customMaterial: Material | null = null;
    @property
    private _blur: number = 4;
    @property
    private _maskFrame: SpriteFrame | null = null;

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
        const width = transform?.width ?? 393;
        const height = transform?.height ?? 737;

        try {
            material.setProperty('blurParams', new Vec4(this._blur, width, height, 0));
            
            if (this._maskFrame && this._maskFrame.texture) {
                material.setProperty('maskTexture', this._maskFrame.texture);
            }
        } catch (e) {}
    }
}
