import { sys } from 'cc';
import { JSB } from 'cc/env';
import { ANALYTICS_DEBUG } from '../AnalyticsConfig';
import { AnalyticsParams, AnalyticsProvider } from '../AnalyticsProvider';

const ANDROID_CLASS = 'com/cocos/game/AppActivity';
const METHOD_SIGNATURE = '(Ljava/lang/String;Ljava/lang/String;)V';

export class FirebaseAnalyticsProvider implements AnalyticsProvider {
    trackEvent(name: string, params?: AnalyticsParams) {
        if (!JSB || sys.platform !== sys.Platform.ANDROID) {
            if (ANALYTICS_DEBUG) {
                console.warn('[Analytics] Firebase provider skipped (not Android JSB)');
            }
            return;
        }
        const jsbAny = (globalThis as any).jsb;
        if (!jsbAny?.reflection?.callStaticMethod) {
            if (ANALYTICS_DEBUG) {
                console.warn('[Analytics] jsb.reflection.callStaticMethod not available');
            }
            return;
        }
        const payload = JSON.stringify(params ?? {});
        jsbAny.reflection.callStaticMethod(ANDROID_CLASS, 'logEvent', METHOD_SIGNATURE, name, payload);
    }
}
