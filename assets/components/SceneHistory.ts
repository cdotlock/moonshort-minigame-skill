import { director, Director, game, Game, Scene } from 'cc';
import { Analytics } from '../analytics/AnalyticsManager';
import { trackHistoryView, trackHomeView, trackIndexView, trackLoginView, trackNotificationsView, trackSettingsView } from '../analytics/UiEvents';
import { SceneParams } from '../scripts/core/SceneParams';

/**
 * 场景历史记录管理器
 * 通过 game.on(Game.EVENT_GAME_INITED) 自动初始化，无需手动挂载
 */
class SceneHistoryManager {
    private static _instance: SceneHistoryManager | null = null;
    private _history: string[] = [];
    private _current: string = '';
    private _maxLength: number = 20;
    private _inited: boolean = false;

    static get instance(): SceneHistoryManager {
        if (!this._instance) {
            this._instance = new SceneHistoryManager();
        }
        return this._instance;
    }

    private constructor() {
        // 私有构造，防止外部 new
    }

    /**
     * 初始化（自动调用，通常不需要手动调用）
     */
    init() {
        if (this._inited) return;
        this._inited = true;
        Analytics.init();
        director.on(Director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.onAfterSceneLaunch, this);
    }

    private onBeforeSceneLoading(sceneName: string) {
        if (this._current && this._current !== sceneName) {
            this._history.push(this._current);
            if (this._history.length > this._maxLength) {
                this._history.shift();
            }
        }
        this._current = sceneName;
    }

    private onAfterSceneLaunch(scene: Scene | string) {
        const name = typeof scene === 'string' ? scene : scene?.name;
        if (!name) return;
        trackHomeView();
        trackIndexView();
        trackNotificationsView();
        trackHistoryView();
        trackLoginView();
        trackSettingsView();
    }

    /**
     * 返回上一个场景，无历史时返回 home
     * @returns 是否成功返回
     */
    back(): boolean {
        this.init(); // 确保已初始化
        if (this._history.length === 0) {
            director.loadScene('home');
            return true;
        }
        const prev = this._history.pop()!;
        // 临时移除监听，避免 back 时再次记录
        director.off(Director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
        director.loadScene(prev, () => {
            this._current = prev;
            director.on(Director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
        });
        return true;
    }

    /**
     * 跳转场景（会记录历史）
     * @param sceneName 场景名称
     * @param params 场景参数（可选）
     * @param onLaunched 加载完成回调（可选）
     */
    push(sceneName: string, params?: Record<string, any>, onLaunched?: () => void) {
        this.init(); // 确保已初始化
        
        // 如果第二个参数是函数，说明没有传递 params
        if (typeof params === 'function') {
            onLaunched = params;
            params = undefined;
        }
        
        // 设置场景参数
        if (params) {
            SceneParams.set(params);
        }
        
        director.loadScene(sceneName, onLaunched);
    }

    /**
     * 替换当前场景（不记录历史）
     * @param sceneName 场景名称
     * @param params 场景参数（可选）
     * @param onLaunched 加载完成回调（可选）
     */
    replace(sceneName: string, params?: Record<string, any>, onLaunched?: () => void) {
        this.init();
        
        // 如果第二个参数是函数，说明没有传递 params
        if (typeof params === 'function') {
            onLaunched = params;
            params = undefined;
        }
        
        // 设置场景参数
        if (params) {
            SceneParams.set(params);
        }
        
        director.off(Director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
        director.loadScene(sceneName, () => {
            this._current = sceneName;
            director.on(Director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
            onLaunched?.();
        });
    }

    /**
     * 清空历史
     */
    clear() {
        this._history = [];
    }

    get history(): readonly string[] {
        return this._history;
    }

    get current(): string {
        return this._current;
    }

    get canBack(): boolean {
        return this._history.length > 0;
    }
}

// 导出单例访问器
export const SceneHistory = SceneHistoryManager.instance;

// 游戏初始化时自动启动监听
game.once(Game.EVENT_GAME_INITED, () => {
    SceneHistory.init();
});
