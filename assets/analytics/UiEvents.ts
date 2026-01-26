import { director, Label, Node } from 'cc';
import { ANALYTICS_HOME_SCENE, ANALYTICS_PAGE_YOU, ANALYTICS_SECTION_MY } from './AnalyticsConfig';
import { Analytics } from './AnalyticsManager';
import { AnalyticsParams } from './AnalyticsProvider';

type UiEventPayload = {
    section: string;
    event: 'ui_view' | 'ui_click';
    page_id: string;
    module_id?: string;
    element_id?: string;
    action?: string;
    biz_key?: string;
    params?: AnalyticsParams;
};

type HomeClickOptions = {
    moduleId?: string;
    params?: AnalyticsParams;
};

function normalizeParams(params?: AnalyticsParams) {
    if (!params) return;
    Object.keys(params).forEach((key) => {
        if (params[key] === undefined) {
            delete params[key];
        }
    });
}

function trackUiEvent(payload: UiEventPayload) {
    const params: AnalyticsParams = {
        section: payload.section,
        page_id: payload.page_id,
    };
    if (payload.module_id) params.module_id = payload.module_id;
    if (payload.element_id) params.element_id = payload.element_id;
    if (payload.action) params.action = payload.action;
    if (payload.biz_key) params.biz_key = payload.biz_key;
    if (payload.params) {
        normalizeParams(payload.params);
        Object.assign(params, payload.params);
    }
    Analytics.trackEvent(payload.event, params);
}

function getLabelText(node?: Node) {
    if (!node) return undefined;
    const label = node.getComponent(Label) ?? node.getComponentInChildren(Label);
    const value = label?.string?.trim();
    return value || undefined;
}

export function isHomeScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_HOME_SCENE;
}

export function trackHomeView() {
    if (!isHomeScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_MY,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_YOU,
        action: 'screen',
    });
}

export function trackHomeClick(elementId: string, options?: HomeClickOptions) {
    if (!isHomeScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_MY,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_YOU,
        module_id: options?.moduleId,
        element_id: elementId,
        action: 'tap',
        params: options?.params,
    });
}

export function trackHomeInviteOpen() {
    trackHomeClick('invite');
}

export function trackHomeCopyInvite(params?: AnalyticsParams) {
    trackHomeClick('copy_invite_code', { moduleId: 'invite', params });
}

export function trackHomePurchase(currentGems?: number) {
    trackHomeClick('purchase', {
        params: currentGems !== undefined ? { current_gems: currentGems } : undefined,
    });
}

export function trackHomeRouterClick(targetScene: string, sourceNode?: Node) {
    if (!isHomeScene()) return;
    if (targetScene === 'notifications') {
        trackHomeClick('notification');
        return;
    }
    if (targetScene === 'setting') {
        trackHomeClick('settings');
        return;
    }
    if (targetScene === 'histroy') {
        if (sourceNode && sourceNode.name !== 'btn-view-all') {
            return;
        }
        trackHomeClick('history_card', {
            moduleId: 'history',
            params: {
                content_type: 'game',
                content_id: sourceNode?.name,
                content_name: getLabelText(sourceNode),
            },
        });
    }
}
