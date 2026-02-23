import { _decorator, Component, Node } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { Navigator } from '../scripts/core/Navigator';
import { WndManager } from '../scripts/core/WndManager';

const { ccclass, property, menu, executionOrder } = _decorator;

/**
 * 认证守卫组件
 * 挂载到 index / game 场景根节点，自动检查登录状态
 * 未登录 → 跳转 login 场景
 * 未激活 → 跳转 login 场景（login 场景内部会切到 inviteCodeWnd）
 */
@ccclass('AuthGuard')
@menu('Components/AuthGuard')
@executionOrder(-1000)
export class AuthGuard extends Component {
    @property({ tooltip: '是否在 onLoad 时检查（默认开启）' })
    checkOnLoad: boolean = true;

    @property({ tooltip: '是否要求账户已激活' })
    requireActivated: boolean = true;

    @property({ type: Node, tooltip: '场景内容节点（未登录时隐藏）' })
    contentNode: Node | null = null;

    @property({ tooltip: '认证通过后自动打开的默认 wnd（可选）' })
    defaultWnd: string = '';

    private isRedirecting: boolean = false;

    onLoad() {
        if (this.contentNode) {
            this.contentNode.active = false;
        }

        if (this.checkOnLoad) {
            this.checkAuth();
        }
    }

    /**
     * 检查认证状态
     */
    async checkAuth(): Promise<boolean> {
        if (this.isRedirecting) return false;

        const gameManager = GameManager.getInstance();
        const authManager = gameManager.getAuth();

        // 1. 本地检查 Token
        if (!authManager.isAuthenticated()) {
            console.log('[AuthGuard] 本地 Token 无效，跳转 login');
            this.redirectToLogin();
            return false;
        }

        // 2. 服务器验证
        try {
            const api = gameManager.getAPI();
            const response = await api.get('/apiv2/auth/me');

            // 3. 检查激活状态（未激活也跳 login，由 login 场景内部处理 inviteCodeWnd）
            if (this.requireActivated && !response.isActivated) {
                console.log('[AuthGuard] 账户未激活，跳转 login');
                this.redirectToLogin();
                return false;
            }
        } catch (error: any) {
            console.log('[AuthGuard] 服务器验证失败:', error?.message || error);
            await authManager.logout();
            this.redirectToLogin();
            return false;
        }

        // 验证通过
        if (this.contentNode) {
            this.contentNode.active = true;
        }
        console.log('[AuthGuard] 认证检查通过');

        // 自动打开默认 wnd
        if (this.defaultWnd && WndManager.instance.stackSize === 0) {
            await WndManager.instance.open(this.defaultWnd);
        }

        return true;
    }

    private redirectToLogin() {
        if (this.isRedirecting) return;
        this.isRedirecting = true;
        Navigator.toScene('login');
    }
}
