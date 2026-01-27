import { director, Label, Node } from 'cc';
import { ANALYTICS_GAME_SCENE, ANALYTICS_HISTORY_SCENE, ANALYTICS_HOME_SCENE, ANALYTICS_INDEX_SCENE, ANALYTICS_LOGIN_SCENE, ANALYTICS_MODULE_ACCOUNT, ANALYTICS_NOTIFICATIONS_SCENE, ANALYTICS_OVERVIEW_SCENE, ANALYTICS_PAGE_CONTENT_OVERVIEW, ANALYTICS_PAGE_GAME, ANALYTICS_PAGE_HISTORY, ANALYTICS_PAGE_HOME, ANALYTICS_PAGE_LOGIN, ANALYTICS_PAGE_NOTIFICATION, ANALYTICS_PAGE_SETTING, ANALYTICS_PAGE_YOU, ANALYTICS_SECTION_GAME, ANALYTICS_SECTION_HISTORY, ANALYTICS_SECTION_INDEX, ANALYTICS_SECTION_LOGIN, ANALYTICS_SECTION_MY, ANALYTICS_SECTION_NOTIFICATION, ANALYTICS_SECTION_OVERVIEW, ANALYTICS_SECTION_SETTING, ANALYTICS_SETTINGS_SCENE } from './AnalyticsConfig';
import { Analytics } from './AnalyticsManager';
import { AnalyticsParams } from './AnalyticsProvider';

type UiEventPayload = {
    section: string;
    event: 'ui_view' | 'ui_click' | 'biz_event';
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

type IndexClickOptions = {
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

export function isIndexScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    // 兼容处理：有些环境下场景名可能带路径或为空，如果是在 NovelsListComponent 里调用的，通常就是首页
    return name === ANALYTICS_INDEX_SCENE || name === '' || name === undefined;
}

export function isNotificationsScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_NOTIFICATIONS_SCENE;
}

export function isHistoryScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_HISTORY_SCENE;
}

export function isLoginScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_LOGIN_SCENE;
}

export function isSettingsScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_SETTINGS_SCENE;
}

export function isOverviewScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_OVERVIEW_SCENE;
}

export function isGameScene(sceneName?: string) {
    const name = sceneName ?? director.getScene()?.name;
    return name === ANALYTICS_GAME_SCENE;
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

export function trackIndexView() {
    if (!isIndexScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_INDEX,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_HOME,
        action: 'screen',
    });
}

export function trackNotificationsView() {
    if (!isNotificationsScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_NOTIFICATION,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_NOTIFICATION,
        action: 'screen',
    });
}

export function trackHistoryView() {
    if (!isHistoryScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_HISTORY,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_HISTORY,
        action: 'screen',
    });
}

export function trackHistoryCardClick(novelId: string, novelTitle: string) {
    if (!isHistoryScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_HISTORY,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_HISTORY,
        element_id: 'history_card',
        action: 'tap',
        params: {
            content_type: 'game',
            content_id: novelId,
            content_name: novelTitle,
        },
    });
}

export function trackLoginView() {
    if (!isLoginScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_LOGIN,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_LOGIN,
        action: 'screen',
    });
}

export function trackSettingsView() {
    if (!isSettingsScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_SETTING,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_SETTING,
        action: 'screen',
    });
}

export function trackSettingsClick(elementId: 'profile' | 'privacy_policy' | 'invite_friends' | 'log_out') {
    if (!isSettingsScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_SETTING,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_SETTING,
        module_id: ANALYTICS_MODULE_ACCOUNT,
        element_id: elementId,
        action: 'tap',
    });
}

export function trackSettingsLogout(status: 'logout_success' | 'logout_fail') {
    if (!isSettingsScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_SETTING,
        event: 'biz_event',
        page_id: ANALYTICS_PAGE_SETTING,
        module_id: ANALYTICS_MODULE_ACCOUNT,
        element_id: 'log_out',
        action: 'tap',
        params: {
            logout_status: status,
        },
    });
}

export function trackOverviewView(novelId?: string, novelTitle?: string) {
    if (!isOverviewScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_OVERVIEW,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_CONTENT_OVERVIEW,
        action: 'screen',
        params: {
            content_type: 'game',
            content_id: novelId,
            content_name: novelTitle,
        },
    });
}

export function trackOverviewPlayClick(novelId?: string, novelTitle?: string) {
    if (!isOverviewScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_OVERVIEW,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_CONTENT_OVERVIEW,
        element_id: 'play',
        action: 'tap',
        params: {
            content_type: 'game',
            content_id: novelId,
            content_name: novelTitle,
        },
    });
}

export function trackGameView(novelId?: string, novelTitle?: string) {
    if (!isGameScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_GAME,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_GAME,
        action: 'screen',
        params: {
            content_id: novelId,
            content_name: novelTitle,
        },
    });
}

export function trackGameExitClick() {
    if (!isGameScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_GAME,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_GAME,
        module_id: 'tools',
        element_id: 'exit',
        action: 'tap',
    });
}

export function trackGameItemsClick() {
    if (!isGameScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_GAME,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_GAME,
        module_id: 'tools',
        element_id: 'items',
        action: 'tap',
    });
}

export function trackGameNodeFinished(nodeIndex?: number) {
    if (!isGameScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_GAME,
        event: 'biz_event',
        page_id: ANALYTICS_PAGE_GAME,
        element_id: 'node',
        action: 'finished',
        params: {
            node_index: nodeIndex,
        },
    });
}

export function trackNotificationClick(notificationId: string) {
    if (!isNotificationsScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_NOTIFICATION,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_NOTIFICATION,
        element_id: 'notification',
        action: 'tap',
        params: {
            notification_id: notificationId,
        },
    });
}

export function trackIndexCardClick(novelId: string, novelTitle: string) {
    if (!isIndexScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_INDEX,
        event: 'ui_click',
        page_id: ANALYTICS_PAGE_HOME,
        module_id: 'feed',
        element_id: 'preview_card',
        action: 'tap',
        params: {
            content_type: 'game',
            content_id: novelId,
            content_name: novelTitle,
        },
    });
}

export function trackIndexCardImpression(novelId: string, novelTitle: string) {
    if (!isIndexScene()) return;
    trackUiEvent({
        section: ANALYTICS_SECTION_INDEX,
        event: 'ui_view',
        page_id: ANALYTICS_PAGE_HOME,
        module_id: 'feed',
        element_id: 'preview_card',
        action: 'impression',
        params: {
            content_type: 'game',
            content_id: novelId,
            content_name: novelTitle,
        },
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
        // 仅当点击 "View All" 按钮时触发埋点
        if (sourceNode && sourceNode.name === 'btn-view-all') {
            trackHomeClick('history_view_all', {
                moduleId: 'history',
                params: {
                    content_type: 'game',
                    content_id: sourceNode?.name,
                    content_name: getLabelText(sourceNode),
                },
            });
        }
    }
}

export function trackHomeHistoryCardClick(novelId: string, novelTitle: string) {
    if (!isHomeScene()) return;
    trackHomeClick('history_card', {
        moduleId: 'history',
        params: {
            content_type: 'game',
            content_id: novelId,
            content_name: novelTitle,
        },
    });
}
