import { _decorator, Component, Node, Label, sys } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { Navigator } from '../scripts/core/Navigator';
import { ApiError } from '../scripts/types/api.types';
import { APIConfig } from '../scripts/config/APIConfig';

const { ccclass, property, menu } = _decorator;

/**
 * @deprecated 已迁移到 scripts/wndControl/LoginWndCtrl.ts
 * 快速登录组件（保留供旧 prefab 引用，新功能请使用 LoginWndCtrl）
 */
@ccclass('QuickLoginComponent')
@menu('Components/QuickLoginComponent')
export class QuickLoginComponent extends Component {
    @property({ type: Label, tooltip: '提示文本 Label（可选）' })
    tipLabel: Label | null = null;

    @property({ type: Node, tooltip: '加载中提示节点（可选）' })
    loadingNode: Node | null = null;

    // 以下属性使用默认值，在属性检查器中隐藏
    @property({ visible: false })
    activatedSceneName: string = 'index';

    @property({ visible: false })
    inviteSceneName: string = 'invite';

    @property({ visible: false })
    autoCheckLogin: boolean = true;

    @property({ visible: false })
    bindGoogleToCurrentUser: boolean = false;

    private isLoading: boolean = false;
    private maxRetries: number = 5;

    start() {
        if (this.autoCheckLogin) {
            this.checkLoginStatus();
        }
        // 检查是否从 Google OAuth 回调回来
        if (sys.isBrowser) {
            this.handleOAuthCallback();
        }
    }

    /**
     * 处理 OAuth 回调（从 Google 登录成功后重定向回来）
     */
    private async handleOAuthCallback() {
        const url = new URL(window.location.href);
        // Auth.js 成功登录后会在 session 中存储用户信息
        // 我们需要从后端获取 session 并同步到前端
        const hasSession = url.searchParams.get('session');
        if (hasSession) {
            console.log('[QuickLogin] 检测到 OAuth 回调，同步 session...');
            await this.syncSessionFromBackend();
        }
    }

    /**
     * 从后端换取 JWT Token（OAuth 登录成功后）
     */
    private async syncSessionFromBackend() {
        try {
            const gameManager = GameManager.getInstance();
            if (!gameManager) return;

            // 调用 oauth-token API 换取 JWT Token
            const tokenUrl = `${APIConfig.BASE_URL}/apiv2/auth/oauth-token`;
            console.log('[QuickLogin] 换取 OAuth Token:', tokenUrl);
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                credentials: 'include', // 包含 Auth.js 的 cookie
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json();
            console.log('[QuickLogin] OAuth Token 响应:', result);

            if (result?.success && result?.data?.user) {
                const { user, token, expiresAt } = result.data;
                console.log('[QuickLogin] Google 登录成功:', user.username);
                
                // 保存认证信息
                gameManager.getAuth().setAuth(token, expiresAt, {
                    id: user.id,
                    username: user.username,
                    gems: user.gems,
                    isActivated: user.isActivated,
                    googleEmail: user.googleEmail,
                    inviteCode: user.inviteCode,
                });

                // 跳转场景（统一跳 index，未激活由 AuthGuard 处理）
                console.log('[QuickLogin] 跳转到 index');
                Navigator.toScene('index');
            } else {
                console.warn('[QuickLogin] OAuth Token 换取失败:', result?.error);
            }
        } catch (error) {
            console.error('[QuickLogin] OAuth Token 换取异常:', error);
        }
    }

    /**
     * 检查登录状态和激活状态
     */
    private checkLoginStatus() {
        if (!this.node || !this.node.isValid) return;

        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            console.error('[QuickLoginComponent] GameManager 未初始化');
            return;
        }

        if (gameManager.isLoggedIn()) {
            // 统一跳 index，未激活由 AuthGuard 处理
            console.log('[QuickLoginComponent] 已登录，跳转到 index');
            Navigator.toScene('index');
        }
    }

    /**
     * 快速登录（供 Button Click Events 调用）
     */
    async onLoginClick() {
        if (!this.node || !this.node.isValid || this.isLoading) return;
        await this.doQuickLogin();
    }

    /**
     * 执行快速登录
     */
    private async doQuickLogin() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            this.setTip('系统未初始化');
            return;
        }

        this.setLoadingState(true);
        this.setTip('正在创建账号...');

        try {
            const { username, password } = this.generateTempCredentials();
            console.log('[QuickLoginComponent] 创建账号:', username);

            await this.registerAndLogin(username, password);

            console.log('[QuickLoginComponent] 登录成功');
            this.setTip('登录成功！');

            // 统一跳 index，未激活由 AuthGuard 处理
            console.log('[QuickLoginComponent] 跳转到 index');

            setTimeout(() => {
                if (this.node && this.node.isValid) {
                    Navigator.toScene('index');
                }
            }, 500);

        } catch (error) {
            console.error('[QuickLoginComponent] 登录失败:', error);
            if (this.node && this.node.isValid) {
                this.handleLoginError(error);
            }
        } finally {
            if (this.node && this.node.isValid) {
                this.setLoadingState(false);
            }
        }
    }

    /**
     * 注册并登录
     */
    private async registerAndLogin(username: string, password: string, retryCount: number = 0): Promise<void> {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            throw new Error('GameManager 未初始化');
        }

        const api = gameManager.getAPI();

        try {
            // 注册（不需要邀请码，账户默认未激活）
            await api.post('/apiv2/auth/register', { username, password });
            // 登录
            await gameManager.getAuth().login(username, password);

        } catch (error: any) {
            if (error instanceof ApiError && error.message.includes('用户名已被使用')) {
                if (retryCount < this.maxRetries) {
                    console.log(`[QuickLoginComponent] 用户名冲突，重试 ${retryCount + 1}/${this.maxRetries}`);
                    const { username: newUsername, password: newPassword } = this.generateTempCredentials();
                    return this.registerAndLogin(newUsername, newPassword, retryCount + 1);
                } else {
                    throw new Error('创建账号失败，请稍后重试');
                }
            }
            throw error;
        }
    }

    /**
     * 生成临时账号密码
     */
    private generateTempCredentials(): { username: string; password: string } {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        
        // 生成格式：g + 时间戳后8位 + 随机数3位
        // 例如：g12345678123 (12个字符，符合3-20字符要求)
        const timestampStr = String(timestamp).slice(-8);
        const randomStr = String(random).padStart(3, '0');
        const username = `g${timestampStr}${randomStr}`;
        
        // 生成8位随机密码
        const password = this.generateRandomPassword(8);

        return { username, password };
    }

    /**
     * 生成随机密码
     */
    private generateRandomPassword(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }


    /**
     * 处理登录错误
     */
    private handleLoginError(error: any) {
        if (error instanceof ApiError) {
            this.setTip(error.message);
        } else if (error.message) {
            this.setTip(error.message);
        } else {
            this.setTip('登录失败，请稍后重试');
        }
    }

    /**
     * 设置加载状态
     */
    private setLoadingState(loading: boolean) {
        this.isLoading = loading;

        // 显示/隐藏加载提示
        if (this.loadingNode && this.loadingNode.isValid) {
            this.loadingNode.active = loading;
        }
    }

    /**
     * 设置提示文本
     */
    private setTip(message: string) {
        if (this.tipLabel && this.tipLabel.isValid && this.tipLabel.node && this.tipLabel.node.isValid) {
            this.tipLabel.string = message;
            this.tipLabel.node.active = message.length > 0;
        }
    }

    // ==================== Google 登录相关 ====================

    /**
     * Google 登录（供 Button Click Events 调用）
     * 使用 OAuth 2.0 redirect 方式，跳转到后端进行认证
     */
    onGoogleLoginClick() {
        if (!this.node || !this.node.isValid || this.isLoading) return;

        if (sys.isBrowser) {
            this.doGoogleLoginWeb();
        } else if (sys.isNative) {
            this.doGoogleLoginNative();
        } else {
            this.setTip('当前平台不支持 Google 登录');
        }
    }

    /**
     * Web 端 Google 登录 - OAuth 2.0 redirect 方式
     * 直接跳转到 Google OAuth，跳过 Auth.js 选择页面
     */
    private doGoogleLoginWeb() {
        this.setTip('正在跳转到 Google...');
        
        // 构建回调 URL
        const callbackUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?session=1');
        
        // 直接跳转到 Google OAuth，跳过中间选择页面
        window.location.href = `${APIConfig.BASE_URL}/api/auth/signin/google?callbackUrl=${callbackUrl}`;
    }

    /**
     * 原生平台 Google 登录（需要 JSB 桥接）
     */
    private async doGoogleLoginNative() {
        // TODO: 实现原生 JSB 调用，获取 idToken 后调用 google-mobile provider
        console.warn('[QuickLogin] 原生平台 Google 登录需要配置 JSB');
        this.setTip('原生登录功能开发中');
    }
}
