import { _decorator, Component, Enum, NodeEventType } from 'cc';
import { Navigator } from '../scripts/core/Navigator';
import { trackGameExitClick, trackHomeRouterClick } from '../analytics/UiEvents';
const { ccclass, property, menu } = _decorator;

/**
 * 路由模式
 */
enum RouterMode {
    /** 跳转到指定目标 */
    Push = 0,
    /** 返回上一级 */
    Back = 1,
    /** 替换当前（不记录历史） */
    Replace = 2,
}
Enum(RouterMode);

/**
 * 导航类型
 */
enum NavigationType {
    /** 场景跳转（login / index / game） */
    Scene = 0,
    /** 窗口跳转（wnd prefab） */
    Wnd = 1,
}
Enum(NavigationType);

/**
 * 点击跳转组件
 * 使用方式：挂到任意节点，选择导航类型和目标名称，点击触发跳转
 */
@ccclass('ClickRouterTo')
@menu('Components/ClickRouterTo')
export class ClickRouterTo extends Component {
    @property({ type: NavigationType, tooltip: '导航类型：Scene=场景跳转, Wnd=窗口跳转' })
    navigationType: NavigationType = NavigationType.Wnd;

    @property({ type: RouterMode, tooltip: '路由模式：Push=跳转, Back=返回, Replace=替换' })
    mode: RouterMode = RouterMode.Push;

    @property({ tooltip: '目标名称（Back 模式下忽略）。Scene 模式填场景名，Wnd 模式填 wnd 名称', visible() { return (this as ClickRouterTo).mode !== RouterMode.Back; } })
    targetName: string = '';

    @property({ tooltip: '要传递的saveId（可选）', visible() { return (this as ClickRouterTo).mode !== RouterMode.Back; } })
    saveId: number = 0;

    @property({ tooltip: '要传递的novelId（可选）', visible() { return (this as ClickRouterTo).mode !== RouterMode.Back; } })
    novelId: string = '';

    @property({ tooltip: '是否实例到 TopLayer（覆盖所有 UI）', visible() { return (this as ClickRouterTo).navigationType === NavigationType.Wnd && (this as ClickRouterTo).mode !== RouterMode.Back; } })
    topLayer: boolean = false;

    /** @deprecated 兼容旧数据，等同于 targetName */
    @property({ visible: false })
    get sceneName(): string { return this.targetName; }
    set sceneName(v: string) { this.targetName = v; }

    private _loading: boolean = false;

    onEnable() {
        this.node.on(NodeEventType.TOUCH_END, this.onClick, this);
    }

    onDisable() {
        if (this.node && this.node.isValid) {
            this.node.off(NodeEventType.TOUCH_END, this.onClick, this);
        }
    }

    private onClick() {
        if (this._loading) return;

        // 返回模式
        if (this.mode === RouterMode.Back) {
            this._loading = true;
            Navigator.back();
            this._loading = false;
            return;
        }

        const name = this.targetName?.trim();
        if (!name) {
            console.warn('[ClickRouterTo] targetName 为空，无法跳转');
            return;
        }

        // 准备参数
        const params: Record<string, any> = {};
        if (this.saveId > 0) params.saveId = this.saveId;
        if (this.novelId) params.novelId = this.novelId;

        this._loading = true;
        trackHomeRouterClick(name, this.node);

        if (this.navigationType === NavigationType.Scene) {
            // 场景跳转（场景间不堆栈，无需区分 push/replace）
            if (name === 'index') trackGameExitClick();
            Navigator.toScene(name as any, params);
            this._loading = false;
        } else {
            // 窗口跳转
            const options = this.topLayer ? { topLayer: true } : undefined;
            const navigate = this.mode === RouterMode.Replace
                ? Navigator.replace(name, params)
                : Navigator.toWnd(name, params, options);
            navigate.then(() => {
                this._loading = false;
            });
        }
    }
}

export { RouterMode, NavigationType };
