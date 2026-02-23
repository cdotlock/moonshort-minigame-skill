import { _decorator, Node, Label, EditBox, Sprite, Color, UIOpacity, tween, Tween, UITransform } from 'cc';
import { WndBase } from '../core/WndBase';
import { GameManager } from '../core/GameManager';
import { Navigator } from '../core/Navigator';
import { InviteAPI } from '../api/InviteAPI';

const { ccclass, property, menu } = _decorator;

/**
 * inviteCodeWnd 主控制器
 * 6 位邀请码输入 + 激活账户
 *
 * 替代原 InviteCodeController + ActivateComponent
 *
 * UI 结构：
 * - 透明 EditBox 覆盖格子上方，接收输入 & 弹出键盘
 * - 6 个 charBoxes（带 Sprite 背景）各含 charLabel
 * - 动态闪烁光标跟随当前输入位置
 */
@ccclass('InviteCodeWndCtrl')
@menu('WndControl/InviteCodeWndCtrl')
export class InviteCodeWndCtrl extends WndBase {

    @property({ type: EditBox, tooltip: '透明输入框（覆盖在格子上方）' })
    hiddenInput: EditBox | null = null;

    @property({ type: [Label], tooltip: '6 个字符展示 Label（按顺序）' })
    charLabels: Label[] = [];

    @property({ type: [Node], tooltip: '6 个格子背景节点（按顺序）' })
    charBoxes: Node[] = [];

    @property({ type: Label, tooltip: '错误提示 Label' })
    errorLabel: Label | null = null;

    @property({ type: Node, tooltip: '加载中节点（可选）' })
    loadingNode: Node | null = null;

    @property({ tooltip: '空字符占位符' })
    placeholderChar: string = '';

    @property({ tooltip: '错误提示文案' })
    errorMessage: string = 'Invite code error, please try again.';

    @property({ type: Color, tooltip: '当前活跃格子颜色' })
    activeBoxColor: Color = new Color(100, 180, 255, 255);

    @property({ type: Color, tooltip: '已填充格子颜色' })
    filledBoxColor: Color = new Color(255, 255, 255, 255);

    @property({ type: Color, tooltip: '空格子颜色' })
    emptyBoxColor: Color = new Color(255, 255, 255, 100);

    @property({ type: Color, tooltip: '光标颜色' })
    cursorColor: Color = new Color(100, 180, 255, 255);

    private inviteAPI: InviteAPI | null = null;
    private isLoading: boolean = false;
    private lastLength: number = 0;
    private isRedirecting: boolean = false;
    private cursorNode: Node | null = null;
    private isFocused: boolean = false;

    // ==================== 生命周期 ====================

    protected onWndOpen(params: Record<string, any>): void {
        // 初始化 API
        const gm = GameManager.getInstance();
        if (gm) {
            this.inviteAPI = new InviteAPI(gm.getAPI());
        }

        // 绑定输入事件 & 隐藏 EditBox
        if (this.hiddenInput) {
            this.hiddenInput.node.on('text-changed', this.onTextChanged, this);
            this.hiddenInput.node.on('editing-did-ended', this.onEditingEnded, this);
            this.hiddenInput.node.on('editing-did-began', this.onEditingBegan, this);
            this.makeEditBoxInvisible();
        }

        // 初始化显示
        this.updateCharLabels('');
        this.updateBoxHighlight('');
        this.hideError();
        if (this.loadingNode) this.loadingNode.active = false;

        // 延迟创建光标
        this.scheduleOnce(() => this.createCursorNode(), 0);

        // 延迟检查激活状态
        this.scheduleOnce(() => this.checkActivationStatus(), 1);
    }

    protected onWndClose(): void {
        if (this.hiddenInput) {
            this.hiddenInput.node.off('text-changed', this.onTextChanged, this);
            this.hiddenInput.node.off('editing-did-ended', this.onEditingEnded, this);
            this.hiddenInput.node.off('editing-did-began', this.onEditingBegan, this);
        }
        this.stopCursorBlink();
    }

    // ==================== EditBox 隐藏 ====================

    private makeEditBoxInvisible() {
        if (!this.hiddenInput) return;
        const node = this.hiddenInput.node;
        let op = node.getComponent(UIOpacity);
        if (!op) op = node.addComponent(UIOpacity);
        op.opacity = 0;
    }

    // ==================== 光标管理 ====================

    private createCursorNode() {
        if (this.charBoxes.length === 0) return;

        const cursor = new Node('InviteCursor');
        cursor.layer = this.charBoxes[0].layer;

        const ut = cursor.addComponent(UITransform);
        ut.setContentSize(20, 36);

        const label = cursor.addComponent(Label);
        label.string = '|';
        label.fontSize = 30;
        label.lineHeight = 36;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = this.cursorColor;

        cursor.addComponent(UIOpacity);
        cursor.active = false;

        this.charBoxes[0].addChild(cursor);
        this.cursorNode = cursor;
    }

    private showCursorAt(index: number) {
        if (!this.cursorNode || index < 0 || index >= this.charBoxes.length) return;
        const box = this.charBoxes[index];
        if (!box) return;

        if (this.cursorNode.parent !== box) {
            this.cursorNode.removeFromParent();
            box.addChild(this.cursorNode);
        }
        this.cursorNode.setPosition(0, 0, 0);
        this.cursorNode.active = true;
        this.startCursorBlink();
    }

    private hideCursor() {
        this.stopCursorBlink();
        if (this.cursorNode) this.cursorNode.active = false;
    }

    private startCursorBlink() {
        if (!this.cursorNode) return;
        const op = this.cursorNode.getComponent(UIOpacity);
        if (!op) return;

        Tween.stopAllByTarget(op);
        op.opacity = 255;

        tween(op)
            .repeatForever(
                tween<UIOpacity>()
                    .delay(0.5)
                    .call(() => { if (op.isValid) op.opacity = 0; })
                    .delay(0.5)
                    .call(() => { if (op.isValid) op.opacity = 255; })
            )
            .start();
    }

    private stopCursorBlink() {
        if (!this.cursorNode) return;
        const op = this.cursorNode.getComponent(UIOpacity);
        if (op) {
            Tween.stopAllByTarget(op);
            op.opacity = 255;
        }
    }

    // ==================== 格子高亮 ====================

    private updateBoxHighlight(code: string) {
        const activeIdx = this.isFocused ? Math.min(code.length, 5) : -1;

        for (let i = 0; i < this.charBoxes.length; i++) {
            const sprite = this.charBoxes[i]?.getComponent(Sprite);
            if (!sprite) continue;

            if (i < code.length) {
                sprite.color = this.filledBoxColor;
            } else if (i === activeIdx) {
                sprite.color = this.activeBoxColor;
            } else {
                sprite.color = this.emptyBoxColor;
            }
        }
    }

    // ==================== 输入事件 ====================

    private onEditingBegan() {
        this.isFocused = true;
        const code = this.getInviteCode();
        this.updateBoxHighlight(code);
        if (code.length < 6) this.showCursorAt(code.length);
    }

    private onEditingEnded() {
        this.isFocused = false;
        this.hideCursor();
        this.updateBoxHighlight(this.getInviteCode());
    }

    private onTextChanged(editBox: EditBox) {
        let value = editBox.string.replace(/[^A-Za-z0-9]/g, '');
        if (value.length > 6) value = value.slice(0, 6);

        if (editBox.string !== value) { editBox.string = value; return; }

        this.updateCharLabels(value);
        this.updateBoxHighlight(value);
        this.hideError();

        if (this.isFocused) {
            if (value.length < 6) this.showCursorAt(value.length);
            else this.hideCursor();
        }

        // 5→6 自动提交
        if (this.lastLength === 5 && value.length === 6) {
            this.doActivate(value);
        }
        this.lastLength = value.length;
    }

    // ==================== 字符展示 ====================

    private updateCharLabels(code: string) {
        for (let i = 0; i < 6; i++) {
            if (i < this.charLabels.length && this.charLabels[i]?.isValid) {
                this.charLabels[i].string = i < code.length ? code[i] : this.placeholderChar;
            }
        }
    }

    // ==================== 业务逻辑 ====================

    private getInviteCode(): string {
        return this.hiddenInput?.string?.trim() || '';
    }

    /** 手动提交（供按钮 Click Events 调用） */
    handleDone() {
        if (this.isLoading) return;
        const code = this.getInviteCode();
        if (code.length !== 6) { this.showError('Please enter 6 characters.'); return; }
        this.doActivate(code);
    }

    private async checkActivationStatus() {
        if (!this.node?.isValid || this.isRedirecting) return;
        const gm = GameManager.getInstance();
        if (!gm) return;

        try {
            const me = await gm.getAPI().get('/apiv2/auth/me');
            if (!this.node?.isValid || this.isRedirecting) return;

            if (me.isActivated) {
                console.log('[InviteCodeWndCtrl] 已激活，跳转 index');
                this.isRedirecting = true;
                Navigator.toScene('index');
            }
        } catch (_) { /* ignore */ }
    }

    private async doActivate(inviteCode: string) {
        if (this.isLoading || !this.inviteAPI) return;

        this.isLoading = true;
        this.setLoading(true);
        this.hideError();

        try {
            const result = await this.inviteAPI.activateAccount(inviteCode);
            if (!this.node?.isValid) return;

            console.log('[InviteCodeWndCtrl] 激活成功:', result.message);

            // 刷新用户信息
            const gm = GameManager.getInstance();
            if (gm) {
                try { await gm.getAuth().refreshUserInfo(); } catch (_) { /* ignore */ }
            }

            this.isRedirecting = true;
            this.scheduleOnce(() => {
                if (this.node?.isValid) Navigator.toScene('index');
            }, 0.5);
        } catch (error: any) {
            if (!this.node?.isValid || this.isRedirecting) return;

            if (error.message?.includes('已激活')) {
                this.isRedirecting = true;
                Navigator.toScene('index');
                return;
            }
            console.error('[InviteCodeWndCtrl] 激活失败:', error.message);
            this.showError(this.errorMessage);
        } finally {
            this.isLoading = false;
            if (this.node?.isValid) this.setLoading(false);
        }
    }

    // ==================== UI 工具 ====================

    private showError(msg: string) {
        if (this.errorLabel?.isValid) {
            this.errorLabel.string = msg;
            this.errorLabel.node.active = true;
        }
    }

    private hideError() {
        if (this.errorLabel?.isValid) this.errorLabel.node.active = false;
    }

    private setLoading(on: boolean) {
        if (this.loadingNode?.isValid) this.loadingNode.active = on;
        if (this.hiddenInput?.isValid) this.hiddenInput.enabled = !on;
    }

    clearInput() {
        if (this.hiddenInput) this.hiddenInput.string = '';
        this.lastLength = 0;
        this.updateCharLabels('');
        this.updateBoxHighlight('');
        this.hideCursor();
        this.hideError();
    }

    focusInput() {
        if (this.hiddenInput?.isValid) this.hiddenInput.focus();
    }
}
