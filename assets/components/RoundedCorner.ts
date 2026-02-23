import { _decorator, CCInteger, director, Director, Enum, NodeEventType, SpriteFrame, UITransform, UIRenderer } from 'cc';
import { JSB } from 'cc/env';

const { ccclass, property, menu } = _decorator;

enum SizeMode { CUSTOM, TRIMMED, RAW }

@ccclass('Corner')
class Corner {
    @property({ displayName: '↙ 左下' })
    leftBottom: boolean = true;
    @property({ displayName: '↘ 右下' })
    rightBottom: boolean = true;
    @property({ displayName: '↖ 左上' })
    leftTop: boolean = true;
    @property({ displayName: '↗ 右上' })
    rightTop: boolean = true;
    visible: boolean[] = null;
}

@ccclass('RoundedCorner')
@menu('Components/RoundedCorner')
export class RoundedCorner extends UIRenderer {
    @property
    private _spriteFrame: SpriteFrame = null;
    @property({ displayName: '纹理/图集帧', type: SpriteFrame })
    private get spriteFrame() { return this._spriteFrame; }
    private set spriteFrame(val) {
        this._spriteFrame = val;
        this.updateSpriteFrame();
        this.updateUv();
        this.markForUpdateRenderData();
    }

    @property
    private _sizeMode: SizeMode = SizeMode.TRIMMED;
    @property({ displayName: '尺寸模式', type: Enum(SizeMode) })
    private get sizeMode() { return this._sizeMode; }
    private set sizeMode(val) {
        this._sizeMode = val;
        this.updateSizeMode();
    }

    @property
    private _segment: number = 5;
    @property({ displayName: '······线段数量', type: CCInteger })
    private get segment() { return this._segment; }
    private set segment(val) {
        this._segment = Math.max(val, 1);
        this.createData();
        this.updateLocal();
        this.updateUv();
        this.updateColor();
        this.markForUpdateRenderData();
    }

    @property
    private _radius: number = 100;
    @property({ displayName: '······圆角半径' })
    private get radius() { return this._radius; }
    private set radius(val) {
        this._radius = Math.max(val, 0);
        this.updateLocal();
        this.updateUv();
        this.markForUpdateRenderData();
    }

    @property
    private _corner: Corner = new Corner();
    @property({ displayName: '······圆角可见性' })
    private get corner() { return this._corner; }
    private set corner(val) {
        this._corner = val;
        this.updateCorner();
        this.createData();
        this.updateLocal();
        this.updateUv();
        this.updateColor();
        this.markForUpdateRenderData();
    }

    private uiTrans: UITransform = null;
    private left: number = 0;
    private bottom: number = 0;
    private locals: number[][] = [];

    __preload(): void {
        super.__preload();
        this._assembler = {
            updateColor: this.updateColor.bind(this),
            updateRenderData: this.updateRenderData.bind(this),
            fillBuffers: this.fillBuffer.bind(this),
        };
        this.uiTrans = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        this._useVertexOpacity = true;
        (this as any).updateMaterial();
        this.updateSpriteFrame();
        this.updateCorner();
        this.updateLocal();
    }

    onEnable(): void {
        super.onEnable();
        this.createData();
        this.updateUv();
        JSB ? director.once(Director.EVENT_AFTER_DRAW, this.updateColor, this) : this.updateColor();
        this.node.on(NodeEventType.SIZE_CHANGED, this.onSizeChanged, this);
        this.node.on(NodeEventType.ANCHOR_CHANGED, this.onAnchorChanged, this);
    }

    onDisable(): void {
        super.onDisable();
        this.node.off(NodeEventType.SIZE_CHANGED, this.onSizeChanged, this);
        this.node.off(NodeEventType.ANCHOR_CHANGED, this.onAnchorChanged, this);
    }

    private onSizeChanged(): void {
        if (!this._spriteFrame) return;
        this.updateLocal();
        this.updateXy();
        let cw = this.uiTrans.width, ch = this.uiTrans.height;
        let size = (this._spriteFrame as any)['_originalSize'], rect = (this._spriteFrame as any)['_rect'];
        switch (this._sizeMode) {
            case SizeMode.TRIMMED: if (cw === rect.width && ch === rect.height) return; break;
            case SizeMode.RAW: if (cw === size.width && ch === size.height) return; break;
        }
        this._sizeMode = SizeMode.CUSTOM;
    }

    private onAnchorChanged(): void {
        this.updateLocal();
        this.updateXy();
    }

    private updateSpriteFrame(): void {
        let spriteFrame = this._spriteFrame;
        if (!spriteFrame) return;
        this._renderData && (this._renderData.textureDirty = true);
        this.updateSizeMode();
    }

    private updateCorner(): void {
        let corner = this._corner;
        corner.visible = [corner.leftBottom, corner.rightBottom, corner.rightTop, corner.leftTop];
    }

    private createData(): void {
        let renderData = this._renderData = this.requestRenderData();
        let vertexTriangle = [4, 2];
        let cornerCnt = 0;
        for (let i = 0, visible = this._corner.visible; i < 4; visible[i++] && ++cornerCnt);
        vertexTriangle = [12 + (this._segment - 1) * cornerCnt, 6 + this._segment * cornerCnt];
        renderData.dataLength = vertexTriangle[0];
        renderData.resize(vertexTriangle[0], 3 * vertexTriangle[1]);
        this.updateIndices();
    }

    updateIndices(): void {
        let renderData = this._renderData;
        let indices = new Uint16Array(renderData.chunk.indexCount);
        const ROUND_IB = [0, 9, 11, 0, 11, 1, 2, 8, 10, 2, 4, 8, 3, 5, 7, 3, 7, 6];
        for (let i = ROUND_IB.length - 1; i > -1; indices[i] = ROUND_IB[i--]);
        for (let i = 0, offset = ROUND_IB.length, id = 36, visible = this._corner.visible; i < 4; ++i) {
            if (!visible[i]) continue;
            let o = 3 * i;
            let a = o + 1;
            let b = id / 3;
            for (let j = 0, len = this._segment - 1; j < len; ++j) {
                indices[offset++] = o;
                indices[offset++] = a;
                indices[offset++] = b;
                a = b++;
                id += 3;
            }
            indices[offset++] = o;
            indices[offset++] = a;
            indices[offset++] = o + 2;
        }
        JSB ? renderData.chunk.setIndexBuffer(indices) : (renderData.indices = indices);
    }

    updateLocal(): void {
        let ut = this.uiTrans, cw = ut.width, ch = ut.height, ax = ut.anchorX, ay = ut.anchorY;
        let l = this.left = -cw * ax, b = this.bottom = -ch * ay, r = cw * (1 - ax), t = ch * (1 - ay);
        let locals = this.locals = [];
        let radius = Math.min(this._radius, Math.min(cw, ch) / 2);
        let lo = l + radius, bo = b + radius, ro = r - radius, to = t - radius;
        let corner = this._corner;
        locals[0] = [lo, corner.leftBottom ? bo : b];
        locals[1] = [l, locals[0][1]];
        locals[2] = [lo, b];
        locals[3] = [ro, corner.rightBottom ? bo : b];
        locals[4] = [ro, b];
        locals[5] = [r, locals[3][1]];
        locals[6] = [ro, corner.rightTop ? to : t];
        locals[7] = [r, locals[6][1]];
        locals[8] = [ro, t];
        locals[9] = [lo, corner.leftTop ? to : t];
        locals[10] = [lo, t];
        locals[11] = [l, locals[9][1]];
        let radian = Math.PI / (this._segment << 1);
        let sin = Math.sin(radian), cos = Math.cos(radian);
        for (let i = 0, offset = 12, visible = corner.visible; i < 4; ++i) {
            if (!visible[i]) continue;
            let id = i * 3;
            let ox = locals[id][0], oy = locals[id][1];
            let deltX = locals[id + 1][0] - ox, deltY = locals[id + 1][1] - oy;
            for (let j = 0, len = this._segment - 1; j < len; ++j) {
                locals[offset] = [ox + deltX * cos - deltY * sin, oy + deltY * cos + deltX * sin];
                deltX = locals[offset][0] - ox;
                deltY = locals[offset][1] - oy;
                ++offset;
            }
        }
    }

    updateXy(): void {
        let renderData = this._renderData, data = renderData.data, locals = this.locals;
        for (let i = locals.length - 1; i > -1; --i) {
            let local = this.locals[i];
            data[i].x = local[0];
            data[i].y = local[1];
        }
        !JSB && (renderData.vertDirty = true);
    }

    updateUv(): void {
        let spriteFrame = this._spriteFrame;
        if (!spriteFrame) return;
        let renderData = this._renderData, vb = renderData.chunk.vb, locals = this.locals;
        let ut = this.uiTrans, cw = ut.width, ch = ut.height, l = this.left, b = this.bottom;
        for (let i = 3, len = vb.length, step = renderData.floatStride, id = 0; i < len; i += step, ++id) {
            let local = locals[id];
            vb[i] = (local[0] - l) / cw;
            vb[i + 1] = (local[1] - b) / ch;
        }
        let uv = spriteFrame.uv;
        if ((spriteFrame as any)['_rotated']) {
            let uvL = uv[0], uvB = uv[1], uvW = uv[4] - uvL, uvH = uv[3] - uvB;
            for (let i = 3, len = vb.length, step = renderData.floatStride; i < len; i += step) {
                let tmp = vb[i];
                vb[i] = uvL + vb[i + 1] * uvW;
                vb[i + 1] = uvB + tmp * uvH;
            }
        } else {
            let uvL = uv[0], uvB = uv[1], uvW = uv[2] - uvL, uvH = uv[5] - uvB;
            for (let i = 3, len = vb.length, step = renderData.floatStride; i < len; i += step) {
                vb[i] = uvL + vb[i] * uvW;
                vb[i + 1] = uvB + vb[i + 1] * uvH;
            }
        }
    }

    updateColor(): void {
        let renderData = this._renderData, vb = renderData.chunk.vb, color = this._color;
        let r = color.r / 255, g = color.g / 255, b = color.b / 255, a = color.a / 255;
        for (let i = 5, len = vb.length, step = renderData.floatStride; i < len; i += step) {
            vb[i] = r;
            vb[i + 1] = g;
            vb[i + 2] = b;
            vb[i + 3] = a;
        }
    }

    updateSizeMode(): void {
        if (!this._spriteFrame) return;
        switch (this._sizeMode) {
            case SizeMode.TRIMMED: this.uiTrans.setContentSize((this._spriteFrame as any)['_rect'].size); break;
            case SizeMode.RAW: this.uiTrans.setContentSize((this._spriteFrame as any)['_originalSize']); break;
        }
    }

    updateRenderData(): void {
        if (!this._renderData || !(this._spriteFrame?.texture)) return;
        this.updateXy();
        this._renderData.updateRenderData(this, this._spriteFrame);
    }

    protected _render(render: any): void {
        render.commitComp(this, this._renderData, this._spriteFrame, this._assembler, null);
    }

    protected _canRender(): boolean {
        return super._canRender() && !!(this._spriteFrame?.texture);
    }

    fillBuffer(): void {
        let renderData = this._renderData;
        if (!renderData) return;
        let chunk = renderData.chunk;
        if (this.node.hasChangedFlags || renderData.vertDirty) {
            let data = renderData.data, vb = renderData.chunk.vb, m = this.node.worldMatrix;
            for (let step = renderData.floatStride, len = vb.length, i = 0, id = 0; i < len; i += step, ++id) {
                let x = data[id].x, y = data[id].y, rhw = m.m03 * x + m.m07 * y + m.m15;
                rhw = rhw ? 1 / rhw : 1;
                vb[i] = (m.m00 * x + m.m04 * y + m.m12) * rhw;
                vb[i + 1] = (m.m01 * x + m.m05 * y + m.m13) * rhw;
            }
            renderData.vertDirty = false;
        }
        let vid = chunk.vertexOffset;
        let meshBuffer = chunk.meshBuffer;
        let iData = meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        let indices = renderData.indices;
        for (let i = 0; i < indices.length; iData[indexOffset++] = vid + indices[i++]);
        meshBuffer.indexOffset += indices.length;
    }
}

declare global {
    module gi {
        class RoundedCorner extends UIRenderer {
            static SizeMode: typeof SizeMode;
            spriteFrame: SpriteFrame;
            sizeMode: SizeMode;
            roundSegment: number;
            roundRadius: number;
            roundCorner: Corner;
        }
    }
}

((globalThis as any).gi ||= {}).RoundedCorner ||= Object.assign(RoundedCorner, { SizeMode: SizeMode });
