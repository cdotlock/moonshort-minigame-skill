import { _decorator, Component, director, Node } from 'cc';
import { GameManager } from '../scripts/core/GameManager';

const { ccclass, property, menu, executionOrder } = _decorator;

/**
 * 认证守卫组件
 * 挂载到需要登录的场景上，自动检查登录状态
 * 如果未登录或认证失效，跳转到登录页
 */
@ccclass('AuthGuard')
@menu('Components/AuthGuard')
@executionOrder(-1000) // 最先执行
export class AuthGuard extends Component {
    @property({ tooltip: '登录页场景名称' })
    loginSceneName: string = 'login';

    @property({ tooltip: '是否在 onLoad 时检查（默认开启）' })
    checkOnLoad: boolean = true;

    @property({ tooltip: '是否验证服务器端 Token 有效性' })
    validateWithServer: boolean = true;

    @property({ type: Node, tooltip: '场景内容节点（未登录时隐藏）' })
    contentNode: Node | null = null;

    private isRedirecting: boolean = false;

    onLoad() {
        // 先隐藏内容，防止闪烁
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
        if (this.isRedirecting) {
            return false;
        }

        const gameManager = GameManager.getInstance();
        const authManager = gameManager.getAuth();

        // 1. 本地检查：是否有有效的 Token
        if (!authManager.isAuthenticated()) {
            console.log('[AuthGuard] 本地 Token 无效或已过期，跳转登录页');
            this.redirectToLogin();
            return false;
        }

        // 2. 服务器验证（可选）
        if (this.validateWithServer) {
            try {
                // 调用 /apiv2/auth/me 验证 Token
                const api = gameManager.getAPI();
                await api.get('/apiv2/auth/me');
                console.log('[AuthGuard] 服务器验证通过');
                
                // 验证通过，显示内容
                if (this.contentNode) {
                    this.contentNode.active = true;
                }
                return true;
            } catch (error: any) {
                console.log('[AuthGuard] 服务器验证失败:', error?.message || error);
                
                // 认证失败，清除本地状态并跳转
                authManager.logout();
                this.redirectToLogin();
                return false;
            }
        }

        // 不需要服务器验证，直接显示内容
        if (this.contentNode) {
            this.contentNode.active = true;
        }
        console.log('[AuthGuard] 认证检查通过');
        return true;
    }

    /**
     * 跳转到登录页
     */
    private redirectToLogin() {
        if (this.isRedirecting) {
            return;
        }
        
        this.isRedirecting = true;
        console.log('[AuthGuard] 跳转到登录页:', this.loginSceneName);
        director.loadScene(this.loginSceneName);
    }
}
