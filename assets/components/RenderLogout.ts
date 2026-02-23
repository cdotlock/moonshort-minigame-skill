import { _decorator, Component } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { Navigator } from '../scripts/core/Navigator';
import { APIConfig } from '../scripts/config/APIConfig';

const { ccclass, menu } = _decorator;

@ccclass('RenderLogout')
@menu('Components/RenderLogout')
export class RenderLogout extends Component {
    /**
     * 打开面板
     */
    open() {
        this.node.active = true;
    }

    /**
     * 关闭面板
     */
    close() {
        this.node.active = false;
    }

    /**
     * 登出（供 Button Click Events 调用）
     */
    async logout() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            console.error('[RenderLogout] GameManager 未初始化');
            return;
        }

        try {
            // 1. 调用后端登出 API（清除服务端 session）
            const api = gameManager.getAPI();
            await api.post(APIConfig.ENDPOINTS.AUTH.LOGOUT);
            console.log('[RenderLogout] 后端登出成功');
        } catch (error) {
            // 后端登出失败不阻止本地登出
            console.warn('[RenderLogout] 后端登出失败:', error);
        }

        // 2. 清除本地认证信息和 Auth.js cookies
        await gameManager.getAuth().logout();
        console.log('[RenderLogout] 登出完成');

        // 3. 跳转到登录场景
        Navigator.toScene('login');
    }
}
