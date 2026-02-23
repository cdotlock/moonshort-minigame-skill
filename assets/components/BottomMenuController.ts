import { _decorator, Component, Node, Toggle } from 'cc';
import { Navigator } from '../scripts/core/Navigator';
import { WndManager } from '../scripts/core/WndManager';

const { ccclass, property, menu } = _decorator;

/**
 * BottomMenu 控制器
 * 挂载到 bottomMenu 预制体根节点上，管理底部 Tab 切换导航
 *
 * 节点结构：
 * bottomMenu (本脚本挂载于此)
 * └── main
 *      ├── bg
 *      └── toggleContainer (ToggleContainer)
 *           ├── btn-1 (Toggle) → 对应 btn1WndName
 *           │    ├── default-icon
 *           │    └── selected
 *           └── btn-2 (Toggle) → 对应 btn2WndName
 *                ├── default-icon
 *                └── selected
 *
 * 使用方式：
 * 1. 将此脚本挂到 bottomMenu 根节点
 * 2. 在 Inspector 中配置 btn1WndName / btn2WndName
 * 3. 脚本会在初始化时根据当前 Wnd 自动选中对应的 Tab
 * 4. 点击 Tab 时使用 replace 导航（同层级切换，不增加栈深度）
 */
@ccclass('BottomMenuController')
@menu('Components/BottomMenuController')
export class BottomMenuController extends Component {
    @property({ tooltip: 'btn-1 对应的 Wnd 名称' })
    btn1WndName: string = '';

    @property({ tooltip: 'btn-2 对应的 Wnd 名称' })
    btn2WndName: string = '';

    private _toggle1: Toggle | null = null;
    private _toggle2: Toggle | null = null;
    private _syncing: boolean = false;

    onLoad() {
        const main = this.node.getChildByName('main');
        if (!main) {
            console.warn('[BottomMenuController] 找不到 main 子节点');
            return;
        }

        const container = main.getChildByName('toggleContainer');
        if (!container) {
            console.warn('[BottomMenuController] 找不到 toggleContainer 子节点');
            return;
        }

        const btn1 = container.getChildByName('btn-1');
        const btn2 = container.getChildByName('btn-2');
        this._toggle1 = btn1?.getComponent(Toggle) || null;
        this._toggle2 = btn2?.getComponent(Toggle) || null;
    }

    start() {
        // 根据当前 Wnd 名称同步选中状态
        this._syncSelectedState();
    }

    onEnable() {
        this._toggle1?.node.on('toggle', this._onToggle1, this);
        this._toggle2?.node.on('toggle', this._onToggle2, this);
    }

    onDisable() {
        this._toggle1?.node.off('toggle', this._onToggle1, this);
        this._toggle2?.node.off('toggle', this._onToggle2, this);
    }

    /**
     * 根据当前 Wnd 名称自动选中对应的 Tab
     */
    private _syncSelectedState() {
        const currentWnd = WndManager.instance.currentWndName;
        this._syncing = true;

        if (currentWnd === this.btn1WndName) {
            if (this._toggle1) this._toggle1.isChecked = true;
        } else if (currentWnd === this.btn2WndName) {
            if (this._toggle2) this._toggle2.isChecked = true;
        }

        this._syncing = false;
    }

    private _onToggle1(toggle: Toggle) {
        if (this._syncing || !toggle.isChecked) return;
        this._navigateToTab(this.btn1WndName);
    }

    private _onToggle2(toggle: Toggle) {
        if (this._syncing || !toggle.isChecked) return;
        this._navigateToTab(this.btn2WndName);
    }

    /**
     * Tab 切换使用 replace，不增加 wnd 栈深度
     * 如果目标就是当前 Wnd，则不重复导航
     */
    private _navigateToTab(wndName: string) {
        if (!wndName) return;

        const currentWnd = WndManager.instance.currentWndName;
        if (currentWnd === wndName) return; // 已在当前 Tab，不重复导航

        Navigator.replace(wndName);
    }
}
