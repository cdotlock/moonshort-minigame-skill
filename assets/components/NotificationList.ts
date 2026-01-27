import { _decorator, Component, Node, instantiate, ScrollView, Layout } from 'cc';
import { NotificationCard } from './NotificationCard';
import { Notification } from '../scripts/types/api.types';
import { NotificationsAPI } from '../scripts/api/NotificationsAPI';
import { GameManager } from '../scripts/core/GameManager';
import { trackNotificationClick } from '../analytics/UiEvents';

const { ccclass, property, menu } = _decorator;

/**
 * 通知列表组件
 * 负责加载和管理通知数据，并分发给 NotificationCard 组件渲染
 * 
 * 节点结构：
 * NotificationList
 * └── ScrollView
 *     └── Content (Layout)
 *         └── NotificationCard (Prefab, 动态创建)
 */
@ccclass('NotificationList')
@menu('Components/NotificationList')
export class NotificationList extends Component {
    // ========== 节点引用 ==========
    @property({ type: Node, tooltip: '卡片容器（通常是 ScrollView 的 Content）' })
    cardsContainer: Node | null = null;

    @property({ type: Node, tooltip: 'NotificationCard 预制体' })
    notificationCardPrefab: Node | null = null;

    @property({ type: ScrollView, tooltip: 'ScrollView 组件（可选）' })
    scrollView: ScrollView | null = null;

    @property({ type: Node, tooltip: '加载中提示节点（可选）' })
    loadingNode: Node | null = null;

    @property({ type: Node, tooltip: '空状态提示节点（可选）' })
    emptyNode: Node | null = null;

    @property({ type: Node, tooltip: '错误提示节点（可选）' })
    errorNode: Node | null = null;

    // ========== 配置 ==========
    @property({ tooltip: '是否自动加载' })
    autoLoad: boolean = true;

    @property({ tooltip: '每页数量' })
    pageSize: number = 20;

    // ========== 私有属性 ==========
    private notificationsAPI: NotificationsAPI | null = null;
    private notificationList: Notification[] = [];
    private currentPage: number = 1;
    private isLoading: boolean = false;

    onLoad() {
        // 初始化 API
        const gameManager = GameManager.getInstance();
        this.notificationsAPI = new NotificationsAPI(gameManager.getAPI());

        // 初始化状态
        this.showLoading();

        // 自动加载通知
        if (this.autoLoad) {
            this.loadNotifications();
        }
    }

    onDestroy() {
        // 清理引用
        this.notificationsAPI = null;
        this.notificationList = [];
        this.cardsContainer = null;
        this.notificationCardPrefab = null;
        this.scrollView = null;
        this.loadingNode = null;
        this.emptyNode = null;
        this.errorNode = null;
    }

    /**
     * 加载通知列表
     */
    async loadNotifications(page: number = 1) {
        if (!this.notificationsAPI) {
            console.error('[NotificationList] NotificationsAPI 未初始化');
            this.showError();
            return;
        }

        if (this.isLoading) {
            console.warn('[NotificationList] 正在加载中，请勿重复请求');
            return;
        }

        this.isLoading = true;
        this.currentPage = page;

        try {
            console.log(`[NotificationList] 加载通知 - 页码: ${page}, 每页: ${this.pageSize}`);

            // 调用通知接口
            const response = await this.notificationsAPI.getList(page, this.pageSize);

            console.log('[NotificationList] 通知加载成功:', response);

            // 保存数据
            this.notificationList = response.items || [];

            // 渲染列表
            this.renderList();

            // 显示内容
            if (this.notificationList.length === 0) {
                this.showEmpty();
            } else {
                this.showContent();
            }

        } catch (error) {
            console.error('[NotificationList] 加载通知失败:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 渲染通知列表
     */
    private renderList() {
        if (!this.cardsContainer || !this.notificationCardPrefab) {
            console.warn('[NotificationList] 容器或预制体未配置');
            return;
        }

        // 清空容器
        this.cardsContainer.removeAllChildren();

        // 创建卡片
        this.notificationList.forEach(notification => {
            const cardNode = instantiate(this.notificationCardPrefab!);
            const notificationCard = cardNode.getComponent(NotificationCard);

            if (notificationCard) {
                // 设置数据
                notificationCard.setNotificationData(notification);
            }

            this.cardsContainer!.addChild(cardNode);
        });

        // 刷新布局
        const layout = this.cardsContainer.getComponent(Layout);
        if (layout) {
            layout.updateLayout();
        }

        // 重置滚动位置
        if (this.scrollView) {
            this.scrollView.scrollToTop(0);
        }
    }

    /**
     * 刷新列表
     */
    async refresh() {
        await this.loadNotifications(1);
    }

    /**
     * 加载下一页
     */
    async loadNextPage() {
        await this.loadNotifications(this.currentPage + 1);
    }

    /**
     * 显示加载中状态
     */
    private showLoading() {
        this.setNodeActive(this.loadingNode, true);
        this.setNodeActive(this.emptyNode, false);
        this.setNodeActive(this.errorNode, false);
        this.setNodeActive(this.cardsContainer, false);
    }

    /**
     * 显示内容
     */
    private showContent() {
        this.setNodeActive(this.loadingNode, false);
        this.setNodeActive(this.emptyNode, false);
        this.setNodeActive(this.errorNode, false);
        this.setNodeActive(this.cardsContainer, true);
    }

    /**
     * 显示空状态
     */
    private showEmpty() {
        this.setNodeActive(this.loadingNode, false);
        this.setNodeActive(this.emptyNode, true);
        this.setNodeActive(this.errorNode, false);
        this.setNodeActive(this.cardsContainer, false);
    }

    /**
     * 显示错误状态
     */
    private showError() {
        this.setNodeActive(this.loadingNode, false);
        this.setNodeActive(this.emptyNode, false);
        this.setNodeActive(this.errorNode, true);
        this.setNodeActive(this.cardsContainer, false);
    }

    /**
     * 设置节点激活状态
     */
    private setNodeActive(node: Node | null, active: boolean) {
        if (node) {
            node.active = active;
        }
    }

    /**
     * 获取当前通知列表
     */
    getNotificationList(): Notification[] {
        return this.notificationList;
    }

    /**
     * 清空列表
     */
    clear() {
        this.notificationList = [];
        if (this.cardsContainer) {
            this.cardsContainer.removeAllChildren();
        }
    }
}
