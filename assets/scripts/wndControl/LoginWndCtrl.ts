import { _decorator, Node, Label, EditBox, Button, sys } from 'cc';
import { WndBase } from '../core/WndBase';
import { GameManager } from '../core/GameManager';
import { Navigator } from '../core/Navigator';
import { ApiError } from '../types/api.types';
import { APIConfig } from '../config/APIConfig';

const { ccclass, property, menu } = _decorator;

/**
 * loginWnd 主控制器
 * 合并了快速登录 / 用户名密码登录 / Google OAuth 三种登录方式
 *
 * 替代原 QuickLoginComponent + LoginComponent
 */
@ccclass('LoginWndCtrl')
@menu('WndControl/LoginWndCtrl')
export class LoginWndCtrl extends WndBase {

    // ==================== 快速登录 & Google ====================

    @property({ type: Label, tooltip: '快速登录提示文本（可选）' })
    tipLabel: Label | null = null;

    @property({ type: Node, tooltip: '快速登录加载中节点（可选）' })
    quickLoadingNode: Node | null = null;

    // ==================== 用户名密码登录 ====================

    @property({ type: EditBox, tooltip: '用户名输入框（可选）' })
    usernameInput: EditBox | null = null;

    @property({ type: EditBox, tooltip: '密码输入框（可选）' })
    passwordInput: EditBox | null = null;

    @property({ type: Button, tooltip: '密码登录按钮（可选）' })
    loginButton: Button | null = null;

    @property({ type: Label, tooltip: '密码登录错误提示（可选）' })
    errorLabel: Label | null = null;

    @property({ type: Node, tooltip: '密码登录加载中节点（可选）' })
    loginLoadingNode: Node | null = null;

    // ==================== 内部状态 ====================

    private isLoading: boolean = false;
    private maxRetries: number = 5;

    // ==================== 生命周期 ====================

    protected onWndOpen(params: Record<string, any>): void {
        // 绑定密码登录按钮
        if (this.loginButton) {
            this.loginButton.node.on(Button.EventType.CLICK, this.onPasswordLoginClick, this);
        }

        // 初始化 UI
        this.setTip('');
        this.setError('');
        this.setQuickLoading(false);
        this.setLoginLoading(false);

        // 检查登录状态
        this.checkLoginStatus();

        // 检查 OAuth 回调
        if (sys.isBrowser) {
            this.handleOAuthCallback();
        }
    }

    protected onWndClose(): void {
        if (this.loginButton) {
            this.loginButton.node.off(Button.EventType.CLICK, this.onPasswordLoginClick, this);
        }
    }

    // ==================== 状态检查 ====================

    private checkLoginStatus() {
        const gm = GameManager.getInstance();
        if (!gm) return;

        if (gm.isLoggedIn()) {
            console.log('[LoginWndCtrl] 已登录，跳转 index');
            Navigator.toScene('index');
        }
    }

    // ==================== 快速登录 ====================

    /** 快速登录（供按钮 Click Events 调用） */
    async onQuickLoginClick() {
        if (!this.node?.isValid || this.isLoading) return;
        await this.doQuickLogin();
    }

    private async doQuickLogin() {
        const gm = GameManager.getInstance();
        if (!gm) { this.setTip('系统未初始化'); return; }

        this.isLoading = true;
        this.setQuickLoading(true);
        this.setTip('正在创建账号...');

        try {
            const { username, password } = this.generateTempCredentials();
            await this.registerAndLogin(gm, username, password);

            this.setTip('登录成功！');
            this.scheduleOnce(() => {
                if (this.node?.isValid) Navigator.toScene('index');
            }, 0.5);
        } catch (error: any) {
            this.handleQuickLoginError(error);
        } finally {
            this.isLoading = false;
            if (this.node?.isValid) this.setQuickLoading(false);
        }
    }

    private async registerAndLogin(gm: GameManager, username: string, password: string, retry = 0): Promise<void> {
        const api = gm.getAPI();
        try {
            await api.post('/apiv2/auth/register', { username, password });
            await gm.getAuth().login(username, password);
        } catch (error: any) {
            if (error instanceof ApiError && error.message.includes('用户名已被使用') && retry < this.maxRetries) {
                const cred = this.generateTempCredentials();
                return this.registerAndLogin(gm, cred.username, cred.password, retry + 1);
            }
            throw error;
        }
    }

    private generateTempCredentials() {
        const ts = String(Date.now()).slice(-8);
        const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const username = `g${ts}${rand}`;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
        return { username, password };
    }

    private handleQuickLoginError(error: any) {
        const msg = error instanceof ApiError ? error.message : (error.message || '登录失败，请稍后重试');
        this.setTip(msg);
    }

    // ==================== 用户名密码登录 ====================

    /** 密码登录（供按钮 Click Events 调用） */
    async onPasswordLoginClick() {
        if (this.isLoading) return;

        const username = this.usernameInput?.string?.trim() || '';
        const password = this.passwordInput?.string?.trim() || '';

        if (!username || !password) { this.setError('请输入用户名和密码'); return; }
        await this.doPasswordLogin(username, password);
    }

    private async doPasswordLogin(username: string, password: string) {
        const gm = GameManager.getInstance();
        if (!gm) { this.setError('系统未初始化'); return; }

        this.isLoading = true;
        this.setLoginLoading(true);
        this.setError('');

        try {
            await gm.getAuth().login(username, password);
            Navigator.toScene('index');
        } catch (error: any) {
            this.setError(error instanceof ApiError ? error.message : '登录失败，请稍后重试');
        } finally {
            this.isLoading = false;
            if (this.node?.isValid) this.setLoginLoading(false);
        }
    }

    // ==================== Google OAuth ====================

    /** Google 登录（供按钮 Click Events 调用） */
    onGoogleLoginClick() {
        if (!this.node?.isValid || this.isLoading) return;

        if (sys.isBrowser) {
            this.setTip('正在跳转到 Google...');
            const cb = encodeURIComponent(window.location.origin + window.location.pathname + '?session=1');
            window.location.href = `${APIConfig.BASE_URL}/api/auth/signin/google?callbackUrl=${cb}`;
        } else if (sys.isNative) {
            console.warn('[LoginWndCtrl] 原生平台 Google 登录需要配置 JSB');
            this.setTip('原生登录功能开发中');
        } else {
            this.setTip('当前平台不支持 Google 登录');
        }
    }

    private async handleOAuthCallback() {
        const url = new URL(window.location.href);
        if (!url.searchParams.get('session')) return;

        console.log('[LoginWndCtrl] 检测到 OAuth 回调');
        try {
            const gm = GameManager.getInstance();
            if (!gm) return;

            const resp = await fetch(`${APIConfig.BASE_URL}/apiv2/auth/oauth-token`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await resp.json();

            if (result?.success && result?.data?.user) {
                const { user, token, expiresAt } = result.data;
                gm.getAuth().setAuth(token, expiresAt, {
                    id: user.id,
                    username: user.username,
                    gems: user.gems,
                    isActivated: user.isActivated,
                    googleEmail: user.googleEmail,
                    inviteCode: user.inviteCode,
                });
                Navigator.toScene('index');
            } else {
                console.warn('[LoginWndCtrl] OAuth Token 换取失败:', result?.error);
            }
        } catch (e) {
            console.error('[LoginWndCtrl] OAuth Token 异常:', e);
        }
    }

    // ==================== UI 工具 ====================

    private setTip(msg: string) {
        if (this.tipLabel?.isValid) {
            this.tipLabel.string = msg;
            this.tipLabel.node.active = msg.length > 0;
        }
    }

    private setError(msg: string) {
        if (this.errorLabel?.isValid) {
            this.errorLabel.string = msg;
            this.errorLabel.node.active = msg.length > 0;
        }
    }

    private setQuickLoading(on: boolean) {
        if (this.quickLoadingNode?.isValid) this.quickLoadingNode.active = on;
    }

    private setLoginLoading(on: boolean) {
        if (this.loginLoadingNode?.isValid) this.loginLoadingNode.active = on;
        if (this.loginButton?.isValid) this.loginButton.interactable = !on;
        if (this.usernameInput?.isValid) this.usernameInput.enabled = !on;
        if (this.passwordInput?.isValid) this.passwordInput.enabled = !on;
    }
}
