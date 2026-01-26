import { sys } from 'cc';
import { ANALYTICS_DEBUG, FIREBASE_WEB_CONFIG, FIREBASE_WEB_SDK_URLS } from '../AnalyticsConfig';
import { AnalyticsParams, AnalyticsProvider } from '../AnalyticsProvider';

export class WebFirebaseAnalyticsProvider implements AnalyticsProvider {
    private _analytics: any = null;
    private _ready: Promise<void> | null = null;

    private loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new Error('document not available'));
                return;
            }
            const existing = document.querySelector(`script[data-firebase-sdk="${url}"]`) as HTMLScriptElement | null;
            if (existing?.getAttribute('data-loaded') === 'true') {
                resolve();
                return;
            }
            const script = existing ?? document.createElement('script');
            script.async = true;
            script.src = url;
            script.setAttribute('data-firebase-sdk', url);
            script.onload = () => {
                script.setAttribute('data-loaded', 'true');
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            if (!existing) {
                document.head.appendChild(script);
            }
        });
    }

    private ensureFirebaseReady(): Promise<void> {
        if (this._ready) return this._ready;
        this._ready = Promise.resolve()
            .then(() => this.loadScript(FIREBASE_WEB_SDK_URLS[0]))
            .then(() => this.loadScript(FIREBASE_WEB_SDK_URLS[1]))
            .then(() => {
                const firebase = (globalThis as any).firebase;
                if (!firebase?.apps?.length) {
                    firebase.initializeApp(FIREBASE_WEB_CONFIG);
                }
                this._analytics = firebase.analytics();
                if (ANALYTICS_DEBUG) {
                    console.log('[Analytics] Firebase Web initialized');
                }
            })
            .catch((error) => {
                console.error('[Analytics] Firebase Web init failed', error);
            });
        return this._ready;
    }

    init() {
        if (!sys.isBrowser) return;
        this.ensureFirebaseReady();
    }

    trackEvent(name: string, params?: AnalyticsParams) {
        this.ensureFirebaseReady().then(() => {
            if (!this._analytics) {
                if (ANALYTICS_DEBUG) {
                    console.warn('[Analytics] Firebase Web not initialized, skipping event:', name);
                }
                return;
            }
            this._analytics.logEvent(name, params);
            if (ANALYTICS_DEBUG) {
                console.log('[Analytics] Firebase Web logEvent:', name, params);
            }
        });
    }
}
