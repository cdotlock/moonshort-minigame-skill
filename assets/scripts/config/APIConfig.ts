/**
 * API 配置
 */
export const APIConfig = {
    // API 基础 URL
    BASE_URL: 'http://47.98.225.71',
    
    // API 端点
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/apiv2/auth/login',
            REGISTER: '/apiv2/auth/register',
            REFRESH: '/apiv2/auth/refresh',
            LOGOUT: '/apiv2/auth/logout',
            ME: '/apiv2/auth/me',
        },
        NOVELS: {
            LIST: '/apiv2/novels',
            DETAIL: '/apiv2/novels',
            HISTORY: '/apiv2/novels/history',
        },
        SAVES: {
            LIST: '/apiv2/saves',
            CREATE: '/apiv2/saves',
            DETAIL: '/apiv2/saves',
        },
        MALL: {
            ITEMS: '/apiv2/mall/items',
            PURCHASE: '/apiv2/mall/purchase',
        },
        GAME: {
            // 后续添加游戏相关接口
        },
    },
    
    // 请求超时时间（毫秒）
    TIMEOUT: 10000,
    
    // Token 刷新阈值：在过期前多久刷新（毫秒）
    // 默认为 1 天
    TOKEN_REFRESH_BEFORE_EXPIRY_MS: 24 * 60 * 60 * 1000,
};

/**
 * 本地存储 Key
 */
export const StorageKeys = {
    TOKEN: 'auth_token',
    TOKEN_EXPIRES_AT: 'auth_token_expires_at',
    USER_INFO: 'auth_user_info',
};
