import { _decorator, Component, Node, NodeEventType } from 'cc';
import { Navigator } from '../scripts/core/Navigator';

const { ccclass, property, menu } = _decorator;

/**
 * Header 控制器
 * 挂载到 header 预制体根节点上，统一管理导航按钮
 *
 * 节点结构：
 * header (本脚本挂载于此)
 * └── main
 *      ├── icon-back       → 返回上一级 wnd
 *      ├── icon-setting    → 打开 settingWndName 配置的界面
 *      └── icon-notive     → 打开 notificationWndName 配置的界面
 *
 * 使用方式：
 * 1. 将此脚本挂到 header 根节点
 * 2. 在 Inspector 中配置 settingWndName / notificationWndName
 * 3. 移除子节点上原有的 ClickRouterTo 组件（避免重复触发）
 */
@ccclass('HeaderController')
@menu('Components/HeaderController')
export class HeaderController extends Component {
    @property({ tooltip: 'icon-setting 打开的目标 Wnd 名称（留空则不响应点击）' })
    settingWndName: string = 'settingWnd';

    @property({ tooltip: 'icon-notive 打开的目标 Wnd 名称（留空则不响应点击）' })
    notificationWndName: string = 'notificationsWnd';

    private _iconBack: Node | null = null;
    private _iconSetting: Node | null = null;
    private _iconNotive: Node | null = null;
    private _loading: boolean = false;

    onLoad() {
        const main = this.node.getChildByName('main');
        if (!main) {
            console.warn('[HeaderController] 找不到 main 子节点');
            return;
        }
        this._iconBack = main.getChildByName('icon-back');
        this._iconSetting = main.getChildByName('icon-setting');
        this._iconNotive = main.getChildByName('icon-notive');
    }

    onEnable() {
        this._iconBack?.on(NodeEventType.TOUCH_END, this._onBackClick, this);
        this._iconSetting?.on(NodeEventType.TOUCH_END, this._onSettingClick, this);
        this._iconNotive?.on(NodeEventType.TOUCH_END, this._onNotiveClick, this);
    }

    onDisable() {
        this._iconBack?.off(NodeEventType.TOUCH_END, this._onBackClick, this);
        this._iconSetting?.off(NodeEventType.TOUCH_END, this._onSettingClick, this);
        this._iconNotive?.off(NodeEventType.TOUCH_END, this._onNotiveClick, this);
    }

    private _onBackClick() {
        if (this._loading) return;
        Navigator.back();
    }

    private _onSettingClick() {
        if (this._loading || !this.settingWndName) return;
        this._navigateTo(this.settingWndName);
    }

    private _onNotiveClick() {
        if (this._loading || !this.notificationWndName) return;
        this._navigateTo(this.notificationWndName);
    }

    private _navigateTo(wndName: string) {
        this._loading = true;
        Navigator.toWnd(wndName).then(() => {
            this._loading = false;
        }).catch(() => {
            this._loading = false;
        });
    }
}
