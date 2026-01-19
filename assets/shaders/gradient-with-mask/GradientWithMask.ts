import { _decorator, Component, Sprite, Material, Vec4, assetManager } from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass, property, menu, executeInEditMode, requireComponent } = _decorator;

const DEFAULT_MATERIAL_UUID = '341e0019-691c-4926-b3e3-c6ada2d916b7';

@ccclass('GradientWithMask')
@menu('Shaders/GradientWithMask')
@executeInEditMode(true)
@requireComponent(Sprite)
export class GradientWithMask extends Component {
    private _materialInstance: Material | null = null;

    @property({ type: Material, tooltip: '自定义材质（留空则使用默认材质）' })
    get customMaterial(): Material | null { return this._customMaterial; }
    set customMaterial(value: Material | null) {
        this._customMaterial = value;
        this._materialInstance = null;
        this.applyMaterial();
    }

    @property({ range: [0, 1, 0.01], slide: true, tooltip: '蒙版比例 (展示区域高度 / 蒙版图高度)' })
    get maskRatio(): number { return this._maskRatio; }
    set maskRatio(value: number) { this._maskRatio = value; this.updateMaterial(); }

    @property
    private _customMaterial: Material | null = null;
    @property
    private _maskRatio: number = 0.1;

    onLoad() { this.applyMaterial(); }
    onEnable() { this.applyMaterial(); }

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
        
        if (EDITOR) {
            this.updateMaterial();
        } else {
            this.scheduleOnce(() => this.updateMaterial(), 0);
        }
    }

    private updateMaterial() {
        const material = this._materialInstance;
        if (!material) return;

        try {
            material.setProperty('maskRatio', new Vec4(1.0, this._maskRatio, 0, 0));
        } catch (e) {}
    }
}
