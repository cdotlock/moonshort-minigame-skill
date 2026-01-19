import { director, Director, game, Game } from 'cc';

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
        director.on(Director.EVENT_BEFORE_SCENE_LOADING, this.onBeforeSceneLoading, this);
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

    /**
     * 返回上一个场景
     * @returns 是否成功返回
     */
    back(): boolean {
        this.init(); // 确保已初始化
        if (this._history.length === 0) {
            console.warn('[SceneHistory] 没有历史记录，无法返回');
            return false;
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
     */
    push(sceneName: string, onLaunched?: () => void) {
        this.init(); // 确保已初始化
        director.loadScene(sceneName, onLaunched);
    }

    /**
     * 替换当前场景（不记录历史）
     */
    replace(sceneName: string, onLaunched?: () => void) {
        this.init();
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
