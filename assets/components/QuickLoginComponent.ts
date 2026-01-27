import { _decorator, Component, Node, Button, Label, director } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { ApiError } from '../scripts/types/api.types';

const { ccclass, property, menu } = _decorator;

/**
 * 快速登录组件
 * 直接挂载到任意节点，通过 Button 组件的 Click Events 调用 onLoginClick 方法
 */
@ccclass('QuickLoginComponent')
@menu('Components/QuickLoginComponent')
export class QuickLoginComponent extends Component {
    @property({ type: Label, tooltip: '提示文本 Label（可选）' })
    tipLabel: Label | null = null;

    @property({ type: Node, tooltip: '加载中提示节点（可选）' })
    loadingNode: Node | null = null;

    @property({ tooltip: '登录成功后跳转的场景名称' })
    nextSceneName: string = 'home';

    @property({ tooltip: '是否在启动时自动检查登录状态' })
    autoCheckLogin: boolean = true;

    private isLoading: boolean = false;
    private maxRetries: number = 5; // 最大重试次数

    start() {
        // 检查是否已登录
        if (this.autoCheckLogin) {
            this.checkLoginStatus();
        }
    }

    /**
     * 检查登录状态
     */
    private checkLoginStatus() {
        if (!this.node || !this.node.isValid) {
            return;
        }

        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            console.error('[QuickLoginComponent] GameManager 未初始化');
            return;
        }

        // 如果已登录，直接跳转
        if (gameManager.isLoggedIn()) {
            console.log('[QuickLoginComponent] 已登录，跳转到主场景');
            this.navigateToNextScene();
        }
    }

    /**
     * 快速登录方法（供 Button 的 Click Events 调用）
     * 在 Button 组件的 Click Events 中配置：
     * - Component: QuickLoginComponent
     * - Handler: onLoginClick
     */
    async onLoginClick() {
        if (!this.node || !this.node.isValid) {
            return;
        }

        if (this.isLoading) {
            return;
        }

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
        this.setTip('正在创建临时账号...');

        try {
            // 生成随机账号密码
            const { username, password } = this.generateTempCredentials();
            console.log('[QuickLoginComponent] 尝试创建账号:', username);

            // 调用认证管理器的登录方法（会自动注册）
            await this.registerAndLogin(username, password);

            console.log('[QuickLoginComponent] 快速登录成功');
            this.setTip('登录成功！');

            // 短暂延迟后跳转
            setTimeout(() => {
                if (this.node && this.node.isValid) {
                    this.navigateToNextScene();
                }
            }, 500);

        } catch (error) {
            console.error('[QuickLoginComponent] 快速登录失败:', error);
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
            // 先尝试注册
            const registerResponse = await api.post(
                '/apiv2/auth/register',
                { username, password }
            );

            // 注册成功，保存认证信息
            const authManager = gameManager.getAuth();
            // 直接使用注册返回的 token 和用户信息
            // 注意：我们需要手动调用 AuthManager 的内部方法
            // 为了简化，我们直接调用 login
            await authManager.login(username, password);

        } catch (error: any) {
            // 如果用户名已存在，重新生成并重试
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

    /**
     * 跳转到下一个场景
     */
    private navigateToNextScene() {
        if (this.nextSceneName) {
            director.loadScene(this.nextSceneName);
        } else {
            console.error('[QuickLoginComponent] 未设置下一个场景名称');
        }
    }

}
