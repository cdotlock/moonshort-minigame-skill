import { _decorator, Component, Node, Label, EditBox } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { Navigator } from '../scripts/core/Navigator';
import { InviteAPI } from '../scripts/api/InviteAPI';

const { ccclass, property, menu } = _decorator;

/**
 * @deprecated 已迁移到 scripts/wndControl/InviteCodeWndCtrl.ts
 * 账户激活组件（保留供旧 prefab 引用，新功能请使用 InviteCodeWndCtrl）
 */
@ccclass('ActivateComponent')
@menu('Components/ActivateComponent')
export class ActivateComponent extends Component {
    @property({ type: EditBox, tooltip: '邀请码输入框' })
    inviteCodeInput: EditBox | null = null;

    @property({ type: Label, tooltip: '状态提示 Label' })
    statusLabel: Label | null = null;

    @property({ type: Node, tooltip: '加载中提示节点' })
    loadingNode: Node | null = null;

    @property({ tooltip: '激活成功后跳转的场景' })
    nextSceneName: string = 'home';

    @property({ tooltip: '未登录时跳转的场景' })
    loginSceneName: string = 'login';

    @property({ tooltip: '是否在启动时自动检查状态' })
    autoCheck: boolean = true;

    private inviteAPI: InviteAPI | null = null;
    private isLoading: boolean = false;

    start() {
        // 初始化 API
        const gameManager = GameManager.getInstance();
        if (gameManager) {
            this.inviteAPI = new InviteAPI(gameManager.getAPI());
        }

        // 设置输入框监听
        if (this.inviteCodeInput) {
            this.inviteCodeInput.node.on('text-changed', this.onInputChanged, this);
        }

        // 隐藏加载提示
        if (this.loadingNode) {
            this.loadingNode.active = false;
        }

        // 自动检查
        if (this.autoCheck) {
            this.checkStatus();
        }
    }

    onDestroy() {
        if (this.inviteCodeInput) {
            this.inviteCodeInput.node.off('text-changed', this.onInputChanged, this);
        }
    }

    /**
     * 检查登录和激活状态
     */
    private async checkStatus() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;

        // 检查是否已登录
        if (!gameManager.isLoggedIn()) {
            console.log('[ActivateComponent] 未登录，跳转到登录页');
            Navigator.toScene('login');
            return;
        }

        // 获取用户信息检查激活状态
        try {
            const userInfo = gameManager.getAuth().getUserInfo();
            if (userInfo?.isActivated) {
                console.log('[ActivateComponent] 已激活，跳转到主页');
                Navigator.toScene('index');
            }
        } catch (error) {
            console.error('[ActivateComponent] 获取用户信息失败:', error);
        }
    }

    /**
     * 输入变化处理
     */
    private onInputChanged(editBox: EditBox) {
        // 转大写并限制为字母数字，最多6位
        let value = editBox.string.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 6) {
            value = value.slice(0, 6);
        }
        if (editBox.string !== value) {
            editBox.string = value;
        }

        // 清除错误提示
        this.setStatus('');
    }

    /**
     * 获取输入的邀请码
     */
    private getInviteCode(): string {
        return this.inviteCodeInput?.string?.trim().toUpperCase() || '';
    }

    /**
     * 激活按钮点击（供 Button Click Events 调用）
     */
    async onActivateClick() {
        if (!this.node || !this.node.isValid || this.isLoading) return;

        const inviteCode = this.getInviteCode();

        // 验证长度
        if (inviteCode.length !== 6) {
            this.setStatus('请输入6位邀请码');
            return;
        }

        await this.doActivate(inviteCode);
    }

    /**
     * 执行激活
     */
    private async doActivate(inviteCode: string) {
        if (!this.inviteAPI) {
            this.setStatus('系统未初始化');
            return;
        }

        this.setLoading(true);
        this.setStatus('激活中...');

        try {
            const result = await this.inviteAPI.activateAccount(inviteCode);

            if (!this.node || !this.node.isValid) return;

            console.log('[ActivateComponent] 激活成功:', result.message);
            this.setStatus('激活成功！');

            // 更新本地存储的用户信息
            const gameManager = GameManager.getInstance();
            if (gameManager) {
                // 刷新用户信息
                try {
                    await gameManager.getAuth().refreshUserInfo();
                } catch (e) {
                    // 忽略刷新失败
                }
            }

            // 跳转到主页
            setTimeout(() => {
                if (this.node && this.node.isValid) {
                    Navigator.toScene('index');
                }
            }, 500);

        } catch (error: any) {
            if (!this.node || !this.node.isValid) return;

            const message = error.message || '激活失败，请稍后重试';
            console.error('[ActivateComponent] 激活失败:', message);
            this.setStatus(message);
        } finally {
            if (this.node && this.node.isValid) {
                this.setLoading(false);
            }
        }
    }

    /**
     * 设置状态提示
     */
    private setStatus(message: string) {
        if (this.statusLabel && this.statusLabel.isValid) {
            this.statusLabel.string = message;
            this.statusLabel.node.active = message.length > 0;
        }
    }

    /**
     * 设置加载状态
     */
    private setLoading(loading: boolean) {
        this.isLoading = loading;
        if (this.loadingNode && this.loadingNode.isValid) {
            this.loadingNode.active = loading;
        }
        if (this.inviteCodeInput && this.inviteCodeInput.isValid) {
            this.inviteCodeInput.enabled = !loading;
        }
    }
}
