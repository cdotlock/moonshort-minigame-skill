import { sys } from 'cc';
import { EDITOR, JSB } from 'cc/env';
import { ANALYTICS_ENABLED } from './AnalyticsConfig';
import { AnalyticsParams, AnalyticsProvider } from './AnalyticsProvider';
import { FirebaseAnalyticsProvider } from './providers/FirebaseAnalyticsProvider';
import { NoopAnalyticsProvider } from './providers/NoopAnalyticsProvider';

class AnalyticsManager {
    private static _provider: AnalyticsProvider = new NoopAnalyticsProvider();
    private static _inited = false;

    static init() {
        if (this._inited) return;
        this._inited = true;
        if (!ANALYTICS_ENABLED) {
            this._provider = new NoopAnalyticsProvider();
            return;
        }
        if (JSB && sys.platform === sys.Platform.ANDROID) {
            this._provider = new FirebaseAnalyticsProvider();
        } else if (sys.isBrowser && !EDITOR) {
            // 仅在浏览器预览/运行时加载 Web SDK，避免编辑器环境报错
            import('./providers/WebFirebaseAnalyticsProvider').then(({ WebFirebaseAnalyticsProvider }) => {
                this._provider = new WebFirebaseAnalyticsProvider();
                this._provider.init?.();
            }).catch(err => {
                console.error('[Analytics] Failed to load WebFirebaseAnalyticsProvider', err);
            });
            return; // 异步初始化，先返回
        } else {
            this._provider = new NoopAnalyticsProvider();
        }
        this._provider.init?.();
    }

    static trackEvent(name: string, params?: AnalyticsParams) {
        if (!ANALYTICS_ENABLED) return;
        this.init();
        this._provider.trackEvent(name, params);
    }
}

export const Analytics = AnalyticsManager;
