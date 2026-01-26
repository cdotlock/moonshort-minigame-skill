import { ANALYTICS_DEBUG } from '../AnalyticsConfig';
import { AnalyticsParams, AnalyticsProvider } from '../AnalyticsProvider';

export class NoopAnalyticsProvider implements AnalyticsProvider {
    trackEvent(name: string, params?: AnalyticsParams) {
        if (!ANALYTICS_DEBUG) return;
        console.log('[Analytics] noop', name, params ?? {});
    }
}
