/**
 * 获取 API 基础 URL
 * - 生产环境：动态获取当前域名（同域部署，无跨域问题）
 * - 开发环境：使用 localhost:3000
 */
function getBaseUrl(): string {
    // 在浏览器环境中，判断是否为生产环境
    if (typeof window !== 'undefined' && window.location) {
        const { protocol, host } = window.location;
        // 如果不是 localhost 开发环境，使用当前域名（同域部署）
        if (!host.includes('localhost')) {
            return `${protocol}//${host}`;
        }
    }
    // 开发环境默认值
    return 'http://localhost:3000';
}

/**
 * API 配置
 */
export const APIConfig = {
    // API 基础 URL（动态获取）
    get BASE_URL(): string {
        return getBaseUrl();
    },
    
    // API 端点
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/apiv2/auth/login',
            REGISTER: '/apiv2/auth/register',
            REFRESH: '/apiv2/auth/refresh',
            LOGOUT: '/apiv2/auth/logout',
            ME: '/apiv2/auth/me',
            ACTIVATE: '/apiv2/auth/activate',
            INVITE_INFO: '/apiv2/auth/invite',
            INVITE_VALIDATE: '/apiv2/auth/invite/validate',
            GOOGLE: '/apiv2/auth/google',  // Google 登录/绑定
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
    TIMEOUT: 60000,
    
    // Token 刷新阈值：在过期前多久刷新（毫秒）
    // 默认为 1 天
    TOKEN_REFRESH_BEFORE_EXPIRY_MS: 24 * 60 * 60 * 1000,
};

/**
 * 获取环境标识（基于 BASE_URL 生成）
 */
function getEnvKey(): string {
    const url = APIConfig.BASE_URL;
    if (url.includes('localhost')) return 'local';
    if (url.includes('47.254.93.15')) return 'prod';
    // 提取域名作为 key
    try {
        const host = new URL(url).host.replace(/[:.]/g, '_');
        return host;
    } catch {
        return 'default';
    }
}

/**
 * 本地存储 Key（带环境前缀，避免不同环境 token 混淆）
 */
export const StorageKeys = {
    get TOKEN() { return `${getEnvKey()}_auth_token`; },
    get TOKEN_EXPIRES_AT() { return `${getEnvKey()}_auth_token_expires_at`; },
    get USER_INFO() { return `${getEnvKey()}_auth_user_info`; },
};
