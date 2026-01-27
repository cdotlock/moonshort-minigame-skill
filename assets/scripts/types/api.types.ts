/**
 * API 统一响应格式
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * 用户信息
 */
export interface UserInfo {
    id: string;
    username: string;
    gems: number;
}

/**
 * 登录请求
 */
export interface LoginRequest {
    username: string;
    password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
    user: UserInfo;
    token: string;
    expiresAt: string;
}

/**
 * Token 刷新响应
 */
export interface RefreshTokenResponse {
    token: string;
    expiresAt: string;
}

/**
 * HTTP 请求方法
 */
export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
}

/**
 * API 错误
 */
export class ApiError extends Error {
    code: string;
    statusCode?: number;

    constructor(message: string, code: string, statusCode?: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * 分页数据
 */
export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/**
 * 小说信息
 */
export interface Novel {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    language: string;
    viewCount: number;
    likeCount: number;
    tags: string[];
    nodeCount: number;
    isLiked?: boolean; // 用户是否已点赞（详情接口返回）
    firstChapterTitle: string | null;
    firstNodeIntroVideo: string | null;
    publishedAt: string;
    // 扮演角色信息
    roleplayCharacterName?: string | null;
    roleplayCharacterAvatar?: string | null;
}

/**
 * 小说节点信息
 */
export interface NovelNode {
    id: string;
    nodeIndex: number;
    type: 'HIGHLIGHT' | 'NORMAL';
    title: string;
    branchId: string | null;
    hasIntroVideo: boolean;
    hasEndingVideo: boolean;
}

/**
 * B 卡原始数据
 */
export interface BCardData {
    nodeIndex: number;
    nodeType: string;
    nodeName: string;
    description: string;
    rawContent: string;
    introVideoUrl: string | null;
    endingVideoUrl: string | null;
}

/**
 * 小说列表项（包含额外数据）
 */
export interface NovelListItem extends Novel {
    firstNode?: NovelNode;
    firstNodeBCard?: BCardData;
}

/**
 * 存档信息
 */
export interface SaveGame {
    id: string;
    novelId: string;
    novelTitle: string;
    level: number;
    currentNodeIndex: number;
    saveName: string | null;
    updatedAt: string;
}

/**
 * 完整存档数据
 */
export interface FullSaveGame extends SaveGame {
    combat: number;
    intelligence: number;
    charisma: number;
    will: number;
    experience: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    spiritStone: number;
    prepTurnsRemaining: number;
    inventory: any[];
    equippedItems: Record<string, any>;
    pastInfluences: any[];
    createdAt: string;
}

/**
 * 商城商品
 */
export interface MallItem {
    id: string;
    name: string;
    description: string;
    type: 'consumable' | 'blindbox' | 'equipment';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    price: number;
    effect: string;
}

/**
 * 商城分类
 */
export interface MallCategory {
    id: string;
    name: string;
    items: MallItem[];
}

/**
 * 商城数据
 */
export interface MallData {
    categories: MallCategory[];
    userGems: number;
}

/**
 * 通知
 */
export interface Notification {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}
