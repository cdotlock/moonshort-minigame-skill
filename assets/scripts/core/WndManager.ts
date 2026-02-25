import { _decorator, Component, AssetManager, Canvas, director, Director, game, assetManager, instantiate, Layers, Node, Prefab, UITransform, Widget } from 'cc';
import { SceneParams } from './SceneParams';
import { WndBase } from './WndBase';

const { ccclass } = _decorator;

/**
 * Wnd 打开选项
 */
export interface WndOpenOptions {
    /** 将 wnd 实例化到 TopLayer（覆盖所有 UI，不隐藏下层 wnd） */
    topLayer?: boolean;
}

/**
 * Wnd 栋条目
 */
interface WndEntry {
    name: string;
    node: Node;
    wndBase: WndBase | null;
    topLayer?: boolean;
}

/**
 * Wnd 窗口管理器
 * 作为 addPersistRootNode 跨场景常驻，管理 wnd prefab 的栈式导航
 *
 * 场景结构：
 * Scene
 * ├── WndManager  (addPersistRootNode，跨场景常驻)
 * ├── Canvas
 * │   ├── Camera
 * │   └── WndRoot  ← wnd 实例挂载于此（Camera 之后，渲染在最上层）
 *
 * 使用前提：wnd prefab 放在 assets/resources/wnd/ 下
 *
 * 使用示例：
 * ```typescript
 * await WndManager.instance.open('homeWnd');
 * await WndManager.instance.open('overviewWnd', { novelId: '123' });
 * WndManager.instance.back();
 * await WndManager.instance.replace('settingWnd');
 * ```
 */
@ccclass('WndManager')
export class WndManager extends Component {
    /** 栈变化事件名 */
    static readonly EVENT_STACK_CHANGED = 'wnd-stack-changed';

    /** 静态回调列表，用于通知栈变化 */
    private static _stackChangeCallbacks: (() => void)[] = [];

    static addStackChangeListener(fn: () => void) {
        if (!this._stackChangeCallbacks.includes(fn)) {
            this._stackChangeCallbacks.push(fn);
        }
    }

    static removeStackChangeListener(fn: () => void) {
        const idx = this._stackChangeCallbacks.indexOf(fn);
        if (idx >= 0) this._stackChangeCallbacks.splice(idx, 1);
    }

    private static _instance: WndManager | null = null;

    /** prefab 缓存 */
    private _prefabCache: Map<string, Prefab> = new Map();

    /** wnd 栈 */
    private _stack: WndEntry[] = [];

    /** WndRoot 容器节点（Canvas 内，Camera 之后） */
    private _wndRoot: Node | null = null;

    /** 加载锁 */
    private _loading: boolean = false;

    /** bundle 名称（对应 assets/profab/wnd 目录配置的 Asset Bundle） */
    private _bundleName: string = 'wnd';

    /** 缓存的 bundle 引用 */
    private _bundle: AssetManager.Bundle | null = null;

    static get instance(): WndManager {
        if (!this._instance) {
            this._createInstance();
        }
        return this._instance!;
    }

    /** 创建常驻节点并挂载组件 */
    private static _createInstance() {
        const node = new Node('WndManager');
        node.layer = Layers.Enum.UI_2D;
        const mgr = node.addComponent(WndManager);
        director.getScene()?.addChild(node);
        game.addPersistRootNode(node);
        this._instance = mgr;
    }

    onLoad() {
        if (WndManager._instance && WndManager._instance !== this) {
            this.node.destroy();
            return;
        }
        WndManager._instance = this;
        // 注入关闭回调给 WndBase（避免循环依赖）
        WndBase._setCloseFn(() => this.close());
        director.on(Director.EVENT_BEFORE_SCENE_LOADING, this._onBeforeSceneLoading, this);
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this._onAfterSceneLaunch, this);
    }

    onDestroy() {
        if (WndManager._instance === this) {
            WndManager._instance = null;
        }
        director.off(Director.EVENT_BEFORE_SCENE_LOADING, this._onBeforeSceneLoading, this);
        director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this._onAfterSceneLaunch, this);
    }

    // ==================== 公开 API ====================

    /**
     * 打开一个 wnd（入栈），上一个 wnd 隐藏并暂停
     * @param options.topLayer  将 wnd 实例化到 TopLayer（覆盖所有 UI，下层 wnd 保持可见）
     */
    async open(wndName: string, params: Record<string, any> = {}, options?: WndOpenOptions): Promise<Node | null> {
        if (this._loading) {
            console.warn('[WndManager] 正在加载中，忽略 open:', wndName);
            return null;
        }

        this._loading = true;
        const useTopLayer = options?.topLayer === true;

        try {
            const root = useTopLayer ? this._getTopLayer() : this._getWndRoot();
            if (!root) {
                console.error(`[WndManager] 找不到 ${useTopLayer ? 'TopLayer' : 'WndRoot'}`);
                return null;
            }

            const prefab = await this._loadPrefab(wndName);
            if (!prefab) {
                console.error('[WndManager] 加载 prefab 失败:', wndName);
                return null;
            }

            // 暂停栈顶
            const topEntry = this._getTop();
            if (topEntry) {
                topEntry.wndBase?._doPause();
                // topLayer 模式下不隐藏下层 wnd（透过蒙版可见）
                if (!useTopLayer) {
                    topEntry.node.active = false;
                }
            }

            // 将 wnd 参数写入 SceneParams，
            // 以便子组件在 onLoad 阶段（addChild 触发）即可通过 SceneParams.get() 读取
            if (params && Object.keys(params).length > 0) {
                SceneParams.set(params);
            }

            // 实例化
            const node = instantiate(prefab);
            node.name = wndName;
            root.addChild(node);

            const wndBase = node.getComponent(WndBase) || node.getComponentInChildren(WndBase);
            if (wndBase) wndBase.wndName = wndName;

            // 入栈
            this._stack.push({ name: wndName, node, wndBase, topLayer: useTopLayer });
            wndBase?._doOpen(params);

            console.log(`[WndManager] open: ${wndName}${useTopLayer ? ' (TopLayer)' : ''}, 栈深度: ${this._stack.length}`);
            this._emitStackChanged();
            return node;
        } finally {
            this._loading = false;
        }
    }

    /**
     * 替换栈顶 wnd（不增加栈深度）
     */
    async replace(wndName: string, params: Record<string, any> = {}): Promise<Node | null> {
        if (this._loading) {
            console.warn('[WndManager] 正在加载中，忽略 replace:', wndName);
            return null;
        }
        this._destroyTop(false);
        return this.open(wndName, params);
    }

    /**
     * 清空整个栈并打开新 wnd（用于 Tab 切换）
     * 注意：强制执行，不受 _loading 限制
     */
    async replaceAll(wndName: string, params: Record<string, any> = {}): Promise<Node | null> {
        // Tab 切换必须强制执行，重置 _loading
        this._loading = false;

        // 销毁所有现有 wnd
        for (let i = this._stack.length - 1; i >= 0; i--) {
            const entry = this._stack[i];
            entry.wndBase?._doClose();
            if (entry.node?.isValid) entry.node.destroy();
        }
        this._stack = [];
        console.log(`[WndManager] replaceAll: 栈已清空, 准备打开 ${wndName}`);
        return this.open(wndName, params);
    }

    /**
     * 关闭栈顶 wnd，恢复下层
     */
    close(): boolean {
        if (this._stack.length === 0) {
            console.warn('[WndManager] 栈空，无法 close');
            return false;
        }
        this._destroyTop(true);
        console.log(`[WndManager] close, 栈深度: ${this._stack.length}`);
        return true;
    }

    /**
     * 返回（栈内 >1 个 wnd 时关闭栈顶）
     */
    back(): boolean {
        if (this._stack.length <= 1) return false;
        return this.close();
    }

    /**
     * 清空所有 wnd（场景切换时自动调用）
     */
    clear() {
        for (let i = this._stack.length - 1; i >= 0; i--) {
            const entry = this._stack[i];
            entry.wndBase?._doClose();
            if (entry.node?.isValid) entry.node.destroy();
        }
        this._stack = [];
        this._wndRoot = null;
        console.log('[WndManager] clear');
        this._emitStackChanged();
    }

    // ==================== 状态查询 ====================

    get currentWndName(): string { return this._getTop()?.name || ''; }
    get stackSize(): number { return this._stack.length; }
    get canBack(): boolean { return this._stack.length > 1; }

    /** 检查指定 wnd 是否在栈中 */
    hasWndInStack(name: string): boolean {
        return this._stack.some(e => e.name === name);
    }

    /** 释放所有缓存的 prefab */
    clearCache() {
        if (this._bundle) {
            this._prefabCache.forEach((_p, name) => this._bundle!.release(name));
        }
        this._prefabCache.clear();
    }

    // ==================== 内部方法 ====================

    /** 获取 TopLayer 节点（Canvas 下的最顶层节点） */
    private _getTopLayer(): Node | null {
        const scene = director.getScene();
        if (!scene) return null;

        const canvas = scene.getComponentInChildren(Canvas);
        if (!canvas) {
            console.error('[WndManager] 场景中找不到 Canvas');
            return null;
        }

        const topLayer = canvas.node.getChildByName('TopLayer');
        if (!topLayer) {
            console.error('[WndManager] Canvas 中找不到 TopLayer 节点');
            return null;
        }
        return topLayer;
    }

    /** 获取或创建当前场景 Canvas 内的 WndRoot */
    private _getWndRoot(): Node | null {
        if (this._wndRoot?.isValid) return this._wndRoot;

        const scene = director.getScene();
        if (!scene) return null;

        const canvas = scene.getComponentInChildren(Canvas);
        if (!canvas) {
            console.error('[WndManager] 场景中找不到 Canvas');
            return null;
        }

        let root = canvas.node.getChildByName('WndRoot');
        if (!root) {
            root = new Node('WndRoot');
            root.layer = Layers.Enum.UI_2D;

            // 全屏铺满 Canvas
            const transform = root.addComponent(UITransform);
            const canvasTransform = canvas.node.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
            }

            const widget = root.addComponent(Widget);
            widget.isAlignTop = true;
            widget.isAlignBottom = true;
            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            widget.top = 0;
            widget.bottom = 0;
            widget.left = 0;
            widget.right = 0;

            canvas.node.addChild(root);
            console.log('[WndManager] 自动创建 WndRoot');
        }

        this._wndRoot = root;
        return root;
    }

    /** 加载 bundle（懒加载 + 缓存） */
    private _loadBundle(): Promise<AssetManager.Bundle | null> {
        if (this._bundle) return Promise.resolve(this._bundle);

        return new Promise((resolve) => {
            assetManager.loadBundle(this._bundleName, (err, bundle) => {
                if (err) {
                    console.error(`[WndManager] 加载 bundle 失败: ${this._bundleName}`, err);
                    resolve(null);
                    return;
                }
                this._bundle = bundle;
                resolve(bundle);
            });
        });
    }

    private async _loadPrefab(wndName: string): Promise<Prefab | null> {
        const cached = this._prefabCache.get(wndName);
        if (cached?.isValid) return cached;

        const bundle = await this._loadBundle();
        if (!bundle) return null;

        return new Promise((resolve) => {
            bundle.load(wndName, Prefab, (err, prefab) => {
                if (err) {
                    console.error(`[WndManager] 加载失败: ${wndName}`, err);
                    resolve(null);
                    return;
                }
                this._prefabCache.set(wndName, prefab);
                resolve(prefab);
            });
        });
    }

    private _destroyTop(resumeBelow: boolean) {
        const entry = this._stack.pop();
        if (!entry) return;

        entry.wndBase?._doClose();
        if (entry.node?.isValid) entry.node.destroy();

        if (resumeBelow) {
            const newTop = this._getTop();
            if (newTop) {
                // topLayer 模式下层 wnd 未被隐藏，无需重新激活，但调用 resume 仍然必要
                if (!entry.topLayer) {
                    newTop.node.active = true;
                }
                newTop.wndBase?._doResume();
            }
        }
        this._emitStackChanged();
    }

    private _getTop(): WndEntry | null {
        return this._stack.length > 0 ? this._stack[this._stack.length - 1] : null;
    }

    /** 通知栈变化 */
    private _emitStackChanged() {
        director.emit(WndManager.EVENT_STACK_CHANGED);
        for (const fn of WndManager._stackChangeCallbacks) {
            try { fn(); } catch (e) { console.error('[WndManager] stack listener error:', e); }
        }
    }

    /** 场景加载前清空 wnd 栈 */
    private _onBeforeSceneLoading() {
        this.clear();
    }

    /** 场景启动后重置 root 引用 */
    private _onAfterSceneLaunch() {
        this._wndRoot = null;
    }
}
