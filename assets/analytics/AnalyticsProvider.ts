export type AnalyticsParamValue = string | number | boolean;
export type AnalyticsParams = Record<string, AnalyticsParamValue>;

export interface AnalyticsProvider {
    init?(): void;
    trackEvent(name: string, params?: AnalyticsParams): void;
}
