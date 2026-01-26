import { _decorator, Component, Label, Node } from 'cc';
import { trackHomeCopyInvite, trackHomeInviteOpen } from '../analytics/UiEvents';
const { ccclass, property, menu } = _decorator;

@ccclass('RenderInviteFriend')
@menu('Components/RenderInviteFriend')
export class RenderInviteFriend extends Component {
    @property({ tooltip: '已邀请数量' })
    inviteNum: number = 0;

    @property({ tooltip: '最大邀请数量' })
    inviteMax: number = 5;

    @property({ tooltip: '邀请码（用于埋点，可为空）' })
    inviteCode: string = '';

    @property({ type: Node, tooltip: '显示剩余次数的 Label 节点' })
    remainingLabelNode: Node | null = null;

    private _label: Label | null = null;

    onLoad() {
        if (this.remainingLabelNode) {
            this._label = this.remainingLabelNode.getComponent(Label);
        }
    }

    /**
     * 打开面板
     */
    open() {
        this.node.active = true;
        this.updateRemainingText();
        trackHomeInviteOpen();
    }

    /**
     * 关闭面板
     */
    close() {
        this.node.active = false;
    }

    /**
     * 复制邀请码（预留）
     */
    copyCode() {
        // TODO: 实现复制邀请码逻辑
        const remaining = this.getRemaining();
        trackHomeCopyInvite({
            invite_code: this.inviteCode || undefined,
            remaining,
        });
    }

    /**
     * 分享邀请码（预留）
     */
    shareCode() {
        // TODO: 实现分享邀请码逻辑
    }

    /**
     * 获取数据（预留）
     */
    fetchData() {
        // TODO: 实现获取邀请数据逻辑
    }

    /**
     * 更新剩余次数文案
     */
    private updateRemainingText() {
        if (!this._label) return;
        const remaining = this.getRemaining();
        this._label.string = `Remaining: ${remaining}/${this.inviteMax}`;
    }

    private getRemaining() {
        return Math.max(0, this.inviteMax - this.inviteNum);
    }
}
