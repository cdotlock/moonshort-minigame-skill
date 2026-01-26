import { _decorator, Component, Enum, NodeEventType } from 'cc';
import { SceneHistory } from './SceneHistory';
import { trackHomeRouterClick } from '../analytics/UiEvents';
const { ccclass, property, menu } = _decorator;

/**
 * 路由模式
 */
enum RouterMode {
    /** 跳转到指定场景 */
    Push = 0,
    /** 返回上一个场景 */
    Back = 1,
    /** 替换当前场景（不记录历史） */
    Replace = 2,
}
Enum(RouterMode);

/**
 * 点击跳转场景组件
 * 使用方式：挂到任意节点，填写 sceneName，点击触发场景跳转
 */
@ccclass('ClickRouterTo')
@menu('Components/ClickRouterTo')
export class ClickRouterTo extends Component {
    @property({ type: RouterMode, tooltip: '路由模式：Push=跳转, Back=返回, Replace=替换' })
    mode: RouterMode = RouterMode.Push;

    @property({ tooltip: '目标场景名称（Back 模式下忽略）', visible() { return (this as ClickRouterTo).mode !== RouterMode.Back; } })
    sceneName: string = '';

    private _loading: boolean = false;

    onEnable() {
        this.node.on(NodeEventType.TOUCH_END, this.onClick, this);
    }

    onDisable() {
        this.node.off(NodeEventType.TOUCH_END, this.onClick, this);
    }

    private onClick() {
        if (this._loading) return;

        if (this.mode === RouterMode.Back) {
            this._loading = true;
            const success = SceneHistory.back();
            if (!success) this._loading = false;
            return;
        }

        const name = this.sceneName?.trim();
        if (!name) {
            console.warn('[ClickRouterTo] sceneName 为空，无法跳转');
            return;
        }

        this._loading = true;
        trackHomeRouterClick(name, this.node);
        if (this.mode === RouterMode.Replace) {
            SceneHistory.replace(name, () => {
                this._loading = false;
            });
        } else {
            SceneHistory.push(name, () => {
                this._loading = false;
            });
        }
    }
}

export { RouterMode };
