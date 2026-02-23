import { director, Director, game, Game, Node, Scene } from 'cc';
import { Analytics } from '../../analytics/AnalyticsManager';
import { trackHistoryView, trackHomeView, trackIndexView, trackLoginView, trackNotificationsView, trackSettingsView } from '../../analytics/UiEvents';
import { SceneParams } from './SceneParams';
import { WndManager } from './WndManager';

/**
 * 合法的主场景名称
 */
type MainScene = 'login' | 'index' | 'game';

/**
 * Navigator 统一导航器
 * 
 * 场景跳转：明确的业务行为，不堆栈
 * wnd 导航：同场景内栈式管理
 * 
 * ```typescript
 * Navigator.toScene('game', { saveId: 123 });
 * Navigator.toWnd('overviewWnd', { novelId: '123' });
 * Navigator.back();       // wnd 栈内返回
 * Navigator.replace('settingWnd');
 * ```
 */
class NavigatorManager {
    private static _instance: NavigatorManager | null = null;
    private _currentScene: string = '';
    private _inited: boolean = false;

    static get instance(): NavigatorManager {
        if (!this._instance) {
            this._instance = new NavigatorManager();
        }
        return this._instance;
    }

    private constructor() {}

    init() {
        if (this._inited) return;
        this._inited = true;
        Analytics.init();
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this._onAfterSceneLaunch, this);
    }

    // ==================== 场景跳转 ====================

    /**
     * 跳转场景（login / index / game）
     * 场景间是明确的业务跳转，不堆栈
     */
    toScene(sceneName: MainScene, params?: Record<string, any>) {
        this.init();
        if (params) SceneParams.set(params);
        console.log(`[Navigator] toScene: ${sceneName}`);
        director.loadScene(sceneName);
    }

    // ==================== wnd 导航 ====================

    /** 打开 wnd（入栈） */
    async toWnd(wndName: string, params?: Record<string, any>): Promise<Node | null> {
        this.init();
        return WndManager.instance.open(wndName, params);
    }

    /** 替换当前 wnd */
    async replace(wndName: string, params?: Record<string, any>): Promise<Node | null> {
        this.init();
        return WndManager.instance.replace(wndName, params);
    }

    /** 返回（wnd 栈内返回） */
    back(): boolean {
        this.init();
        return WndManager.instance.back();
    }

    // ==================== 状态 ====================

    get currentScene(): string { return this._currentScene; }
    get currentWnd(): string { return WndManager.instance.currentWndName; }
    get canBack(): boolean { return WndManager.instance.canBack; }

    // ==================== 内部 ====================

    private _onAfterSceneLaunch(scene: Scene | string) {
        const name = typeof scene === 'string' ? scene : scene?.name;
        if (name) this._currentScene = name;
        trackHomeView();
        trackIndexView();
        trackNotificationsView();
        trackHistoryView();
        trackLoginView();
        trackSettingsView();
    }
}

export const Navigator = NavigatorManager.instance;

game.once(Game.EVENT_GAME_INITED, () => {
    Navigator.init();
});
