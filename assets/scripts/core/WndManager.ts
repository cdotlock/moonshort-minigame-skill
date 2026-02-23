import { _decorator, Component, AssetManager, Canvas, director, Director, game, assetManager, instantiate, Layers, Node, Prefab, UITransform, Widget } from 'cc';
import { WndBase } from './WndBase';

const { ccclass } = _decorator;

/**
 * Wnd 栈条目
 */
interface WndEntry {
    name: string;
    node: Node;
    wndBase: WndBase | null;
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
     */
    async open(wndName: string, params: Record<string, any> = {}): Promise<Node | null> {
        if (this._loading) {
            console.warn('[WndManager] 正在加载中，忽略 open:', wndName);
            return null;
        }

        this._loading = true;

        try {
            const root = this._getWndRoot();
            if (!root) {
                console.error('[WndManager] 找不到 WndRoot');
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
                topEntry.node.active = false;
            }

            // 实例化
            const node = instantiate(prefab);
            node.name = wndName;
            root.addChild(node);

            const wndBase = node.getComponent(WndBase) || node.getComponentInChildren(WndBase);
            if (wndBase) wndBase.wndName = wndName;

            // 入栈
            this._stack.push({ name: wndName, node, wndBase });
            wndBase?._doOpen(params);

            console.log(`[WndManager] open: ${wndName}, 栈深度: ${this._stack.length}`);
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
    }

    // ==================== 状态查询 ====================

    get currentWndName(): string { return this._getTop()?.name || ''; }
    get stackSize(): number { return this._stack.length; }
    get canBack(): boolean { return this._stack.length > 1; }

    /** 释放所有缓存的 prefab */
    clearCache() {
        if (this._bundle) {
            this._prefabCache.forEach((_p, name) => this._bundle!.release(name));
        }
        this._prefabCache.clear();
    }

    // ==================== 内部方法 ====================

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
                newTop.node.active = true;
                newTop.wndBase?._doResume();
            }
        }
    }

    private _getTop(): WndEntry | null {
        return this._stack.length > 0 ? this._stack[this._stack.length - 1] : null;
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
