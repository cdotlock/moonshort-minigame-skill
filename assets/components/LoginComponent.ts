import { _decorator, Component, Node, EditBox, Label, Button } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { Navigator } from '../scripts/core/Navigator';
import { ApiError } from '../scripts/types/api.types';

const { ccclass, property, menu } = _decorator;

/**
 * @deprecated 已迁移到 scripts/wndControl/LoginWndCtrl.ts
 * 用户名密码登录组件（保留供旧 prefab 引用，新功能请使用 LoginWndCtrl）
 */
@ccclass('LoginComponent')
@menu('Components/LoginComponent')
export class LoginComponent extends Component {
    @property({ type: EditBox, tooltip: '用户名输入框' })
    usernameInput: EditBox | null = null;

    @property({ type: EditBox, tooltip: '密码输入框' })
    passwordInput: EditBox | null = null;

    @property({ type: Button, tooltip: '登录按钮' })
    loginButton: Button | null = null;

    @property({ type: Label, tooltip: '错误提示文本' })
    errorLabel: Label | null = null;

    @property({ type: Node, tooltip: '加载中提示节点' })
    loadingNode: Node | null = null;

    @property({ tooltip: '登录成功后跳转的场景' })
    nextSceneName: string = 'index';

    private isLoading: boolean = false;

    onLoad() {
        // 绑定登录按钮点击事件
        if (this.loginButton) {
            this.loginButton.node.on(Button.EventType.CLICK, this.onLoginButtonClick, this);
        }

        // 初始化 UI 状态
        this.setLoadingState(false);
        this.setError('');

        // 检查是否已登录
        this.checkLoginStatus();
    }

    /**
     * 检查登录状态
     */
    private checkLoginStatus() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            console.error('[LoginComponent] GameManager 未初始化');
            return;
        }

        // 如果已登录，直接跳转到下一个场景
        if (gameManager.isLoggedIn()) {
            console.log('[LoginComponent] 已登录，跳转到主场景');
            this.navigateToNextScene();
        }
    }

    /**
     * 登录按钮点击事件
     */
    private async onLoginButtonClick() {
        if (this.isLoading) {
            return;
        }

        // 获取输入
        const username = this.usernameInput?.string?.trim() || '';
        const password = this.passwordInput?.string?.trim() || '';

        // 验证输入
        if (!username || !password) {
            this.setError('请输入用户名和密码');
            return;
        }

        // 开始登录
        await this.doLogin(username, password);
    }

    /**
     * 执行登录
     */
    private async doLogin(username: string, password: string) {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            this.setError('系统未初始化');
            return;
        }

        this.setLoadingState(true);
        this.setError('');

        try {
            // 调用认证管理器登录
            const authManager = gameManager.getAuth();
            await authManager.login(username, password);

            console.log('[LoginComponent] 登录成功');
            
            // 登录成功，跳转到下一个场景
            this.navigateToNextScene();

        } catch (error) {
            console.error('[LoginComponent] 登录失败:', error);
            
            // 显示错误信息
            if (error instanceof ApiError) {
                this.setError(error.message);
            } else {
                this.setError('登录失败，请稍后重试');
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 设置加载状态
     */
    private setLoadingState(loading: boolean) {
        this.isLoading = loading;

        // 显示/隐藏加载提示
        if (this.loadingNode) {
            this.loadingNode.active = loading;
        }

        // 禁用/启用登录按钮
        if (this.loginButton) {
            this.loginButton.interactable = !loading;
        }

        // 禁用/启用输入框
        if (this.usernameInput) {
            this.usernameInput.enabled = !loading;
        }
        if (this.passwordInput) {
            this.passwordInput.enabled = !loading;
        }
    }

    /**
     * 设置错误提示
     */
    private setError(message: string) {
        if (this.errorLabel) {
            this.errorLabel.string = message;
            this.errorLabel.node.active = message.length > 0;
        }
    }

    /**
     * 跳转到下一个场景
     */
    private navigateToNextScene() {
        Navigator.toScene(this.nextSceneName as any || 'index');
    }

    onDestroy() {
        // 移除事件监听
        if (this.loginButton) {
            this.loginButton.node.off(Button.EventType.CLICK, this.onLoginButtonClick, this);
        }
    }
}
