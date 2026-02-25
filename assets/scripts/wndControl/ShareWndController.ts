import { _decorator, Label, Node } from 'cc';
import { trackHomeCopyInvite, trackHomeInviteOpen } from '../../analytics/UiEvents';
import { GameManager } from '../core/GameManager';
import { NativeBridge } from '../core/NativeBridge';
import { WndBase } from '../core/WndBase';
import { Toast } from '../ui/Toast';

const { ccclass, property, menu } = _decorator;

/**
 * shareWnd 控制器
 * 显示用户邀请码、剩余次数，支持复制
 * closeSelf() 继承自 WndBase，可直接拖到按钮事件上关闭本界面
 */
@ccclass('ShareWndController')
@menu('WndControl/ShareWndController')
export class ShareWndController extends WndBase {
    @property({ type: Label, tooltip: '显示邀请码的 Label' })
    inviteCodeLabel: Label | null = null;

    @property({ type: Node, tooltip: '显示剩余次数的 Label 节点' })
    remainingLabelNode: Node | null = null;

    private _inviteCode: string = '';
    private _remaining: number = 0;
    private _limit: number = 5;
    private _remainingLabel: Label | null = null;

    onLoad() {
        if (this.remainingLabelNode) {
            this._remainingLabel = this.remainingLabelNode.getComponent(Label);
        }
    }

    protected onWndOpen(params: Record<string, any>): void {
        // 仅在 shareWnd 上执行邀请码逻辑，
        // 避免被其他 wnd（如 notificationsWnd / overviewWnd）误触发
        if (this.wndName !== 'shareWnd') return;
        this.fetchData();
        trackHomeInviteOpen();
    }

    /**
     * 获取邀请码数据
     */
    async fetchData() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;

        try {
            const api = gameManager.getAPI();
            const response = await api.get('/apiv2/auth/invite');

            if (!this.node || !this.node.isValid) return;

            this._inviteCode = response.inviteCode || '';
            this._remaining = response.remaining || 0;
            this._limit = response.limit || 5;

            this.updateUI();
        } catch (error: any) {
            console.error('[ShareWndController] 获取邀请码信息失败:', error);
        }
    }

    /**
     * 复制邀请码（可拖到按钮事件）
     */
    async copyCode() {
        if (!this._inviteCode) {
            return;
        }

        const success = await NativeBridge.copyToClipboard(this._inviteCode);

        if (success) {
            Toast.show('Copied!');
        }

        trackHomeCopyInvite({
            invite_code: this._inviteCode,
            remaining: this._remaining,
        });
    }

    /**
     * 更新 UI
     */
    private updateUI() {
        if (this.inviteCodeLabel && this.inviteCodeLabel.isValid) {
            this.inviteCodeLabel.string = this._inviteCode;
        }

        if (this._remainingLabel && this._remainingLabel.isValid) {
            this._remainingLabel.string = `Remaining: ${this._remaining}/${this._limit}`;
        }
    }
}
