import { _decorator, Component } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { Navigator } from '../scripts/core/Navigator';
import { WndManager } from '../scripts/core/WndManager';

const { ccclass, menu } = _decorator;

/**
 * Login 场景控制器
 * 挂在 login 场景的 Canvas 上，负责初始路由：
 * 
 * - 已登录 + 已激活 → 跳 index
 * - 已登录 + 未激活 → 打开 inviteCodeWnd
 * - 未登录          → 打开 loginWnd
 */
@ccclass('LoginSceneController')
@menu('Components/LoginSceneController')
export class LoginSceneController extends Component {

    async start() {
        const gm = GameManager.getInstance();
        const auth = gm.getAuth();

        if (!auth.isAuthenticated()) {
            // 未登录 → 打开登录窗口
            await WndManager.instance.open('loginWnd');
            return;
        }

        // 已登录，检查激活状态
        try {
            const api = gm.getAPI();
            const me = await api.get('/apiv2/auth/me');

            if (me.isActivated) {
                // 已激活 → 直接跳 index
                Navigator.toScene('index');
            } else {
                // 未激活 → 打开邀请码窗口
                await WndManager.instance.open('inviteCodeWnd');
            }
        } catch (e) {
            // 验证失败 → 清除登录态，打开登录窗口
            await auth.logout();
            await WndManager.instance.open('loginWnd');
        }
    }
}
