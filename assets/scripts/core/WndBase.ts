import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

/**
 * Wnd 窗口基类
 * 所有 wnd prefab 的控制器组件应继承此类
 * 
 * 生命周期：
 * 1. onWndOpen(params)  - 窗口被打开时调用（在 onLoad 之后）
 * 2. onWndPause()       - 窗口被新窗口覆盖时调用（入栈）
 * 3. onWndResume()      - 上层窗口关闭、本窗口恢复时调用
 * 4. onWndClose()       - 窗口被关闭/销毁前调用
 */
@ccclass('WndBase')
export class WndBase extends Component {
    /** 窗口名称（由 WndManager 设置） */
    wndName: string = '';

    /** 打开时传入的参数 */
    protected wndParams: Record<string, any> = {};

    /**
     * 窗口打开时调用（子类重写）
     * @param params 打开窗口时传入的参数
     */
    protected onWndOpen(params: Record<string, any>): void {
        // 子类重写
    }

    /**
     * 窗口被新窗口覆盖时调用（子类重写）
     */
    protected onWndPause(): void {
        // 子类重写
    }

    /**
     * 从上层窗口返回、本窗口恢复时调用（子类重写）
     */
    protected onWndResume(): void {
        // 子类重写
    }

    /**
     * 窗口关闭前调用（子类重写）
     */
    protected onWndClose(): void {
        // 子类重写
    }

    /**
     * 关闭自身（便捷方法，供子类或按钮事件调用）
     */
    closeSelf() {
        // 延迟导入避免循环依赖
        const { WndManager } = require('./WndManager');
        WndManager.instance.close();
    }

    /** @internal WndManager 调用，外部不要直接调用 */
    _doOpen(params: Record<string, any>) {
        this.wndParams = params;
        this.onWndOpen(params);
    }

    /** @internal */
    _doPause() {
        this.onWndPause();
    }

    /** @internal */
    _doResume() {
        this.onWndResume();
    }

    /** @internal */
    _doClose() {
        this.onWndClose();
    }
}
