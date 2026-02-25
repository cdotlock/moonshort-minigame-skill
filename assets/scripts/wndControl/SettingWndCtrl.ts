import { _decorator, Node } from 'cc';
import { WndBase } from '../core/WndBase';
import { GameManager } from '../core/GameManager';
import { Navigator } from '../core/Navigator';
import { APIConfig } from '../config/APIConfig';

const { ccclass, property, menu } = _decorator;

/**
 * settingWnd 控制器
 * 管理设置界面生命周期、登出确认面板
 *
 * 替代原 RenderLogout 的 open / close / logout 功能
 * 在 Inspector 中将 LogoutRoot 节点拖到 logoutRoot 属性
 */
@ccclass('SettingWndCtrl')
@menu('WndControl/SettingWndCtrl')
export class SettingWndCtrl extends WndBase {

    @property({ type: Node, tooltip: '登出确认面板根节点（LogoutRoot）' })
    logoutRoot: Node | null = null;

    // ==================== 生命周期 ====================

    protected onWndOpen(params: Record<string, any>): void {
        // 初始化时隐藏登出确认面板
        if (this.logoutRoot) this.logoutRoot.active = false;
    }

    // ==================== 登出面板 ====================

    /**
     * 打开登出确认面板（供 RenderSettingItem 的 ClickEvents 调用）
     */
    open() {
        if (this.logoutRoot) this.logoutRoot.active = true;
    }

    /**
     * 关闭登出确认面板（供 Button Click Events 调用）
     */
    close() {
        if (this.logoutRoot) this.logoutRoot.active = false;
    }

    /**
     * 执行登出（供 Button Click Events 调用）
     */
    async logout() {
        const gm = GameManager.getInstance();
        if (!gm) {
            console.error('[SettingWndCtrl] GameManager 未初始化');
            return;
        }

        try {
            const api = gm.getAPI();
            await api.post(APIConfig.ENDPOINTS.AUTH.LOGOUT);
            console.log('[SettingWndCtrl] 后端登出成功');
        } catch (error) {
            console.warn('[SettingWndCtrl] 后端登出失败:', error);
        }

        await gm.getAuth().logout();
        console.log('[SettingWndCtrl] 登出完成');
        Navigator.toScene('login');
    }
}
