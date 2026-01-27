import { _decorator, Component, Node, instantiate, ScrollView, Layout, director } from 'cc';
import { HistoryCard } from './HistoryCard';
import { Novel } from '../scripts/types/api.types';
import { NovelsAPI } from '../scripts/api/NovelsAPI';
import { GameManager } from '../scripts/core/GameManager';
import { SceneParams } from '../scripts/core/SceneParams';
import { trackHistoryCardClick } from '../analytics/UiEvents';

const { ccclass, property, menu } = _decorator;

/**
 * 历史记录列表组件
 * 负责加载和管理历史记录数据，并分发给 HistoryCard 组件渲染
 * 
 * 节点结构：
 * HistoryList
 * └── ScrollView
 *     └── Content (Layout)
 *         └── HistoryCard (Prefab, 动态创建)
 */
@ccclass('HistoryList')
@menu('Components/HistoryList')
export class HistoryList extends Component {
    // ========== 节点引用 ==========
    @property({ type: Node, tooltip: '卡片容器（通常是 ScrollView 的 Content）' })
    cardsContainer: Node | null = null;

    @property({ type: Node, tooltip: 'HistoryCard 预制体' })
    historyCardPrefab: Node | null = null;

    @property({ type: ScrollView, tooltip: 'ScrollView 组件（可选）' })
    scrollView: ScrollView | null = null;

    @property({ type: Node, tooltip: '加载中提示节点（可选）' })
    loadingNode: Node | null = null;

    @property({ type: Node, tooltip: '空状态提示节点（可选）' })
    emptyNode: Node | null = null;

    @property({ type: Node, tooltip: '错误提示节点（可选）' })
    errorNode: Node | null = null;

    // ========== 配置 ==========
    @property({ tooltip: '游戏场景名称' })
    gameSceneName: string = 'overview';

    @property({ tooltip: '是否自动加载' })
    autoLoad: boolean = true;

    @property({ tooltip: '每页数量' })
    pageSize: number = 20;

    // ========== 私有属性 ==========
    private novelsAPI: NovelsAPI | null = null;
    private historyList: Novel[] = [];
    private currentPage: number = 1;
    private isLoading: boolean = false;

    onLoad() {
        // 初始化 API
        const gameManager = GameManager.getInstance();
        this.novelsAPI = new NovelsAPI(gameManager.getAPI());

        // 初始化状态
        this.showLoading();

        // 自动加载历史记录
        if (this.autoLoad) {
            this.loadHistory();
        }
    }

    onDestroy() {
        // 清理引用
        this.novelsAPI = null;
        this.historyList = [];
        this.cardsContainer = null;
        this.historyCardPrefab = null;
        this.scrollView = null;
        this.loadingNode = null;
        this.emptyNode = null;
        this.errorNode = null;
    }

    /**
     * 加载历史记录
     */
    async loadHistory(page: number = 1) {
        if (!this.novelsAPI) {
            console.error('[HistoryList] NovelsAPI 未初始化');
            this.showError();
            return;
        }

        if (this.isLoading) {
            console.warn('[HistoryList] 正在加载中，请勿重复请求');
            return;
        }

        this.isLoading = true;
        this.currentPage = page;

        try {
            console.log(`[HistoryList] 加载历史记录 - 页码: ${page}, 每页: ${this.pageSize}`);

            // 调用历史记录接口
            const response = await this.novelsAPI.getHistory(page, this.pageSize);

            console.log('[HistoryList] 历史记录加载成功:', response);
            console.log('[HistoryList] items:', response.items);
            console.log('[HistoryList] items 数量:', response.items?.length);

            // 保存数据
            this.historyList = response.items || [];

            // 渲染列表
            this.renderList();

            // 显示内容
            if (this.historyList.length === 0) {
                this.showEmpty();
            } else {
                this.showContent();
            }

        } catch (error) {
            console.error('[HistoryList] 加载历史记录失败:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 渲染历史记录列表
     */
    private renderList() {
        if (!this.cardsContainer || !this.historyCardPrefab) {
            console.warn('[HistoryList] 容器或预制体未配置');
            return;
        }

        // 清空容器
        this.cardsContainer.removeAllChildren();

        // 创建卡片
        this.historyList.forEach(novel => {
            const cardNode = instantiate(this.historyCardPrefab!);
            const historyCard = cardNode.getComponent(HistoryCard);

            if (historyCard) {
                // 设置数据
                historyCard.setNovelData(novel);

                // 设置点击回调
                historyCard.setClickCallback((clickedNovel) => {
                    this.onCardClick(clickedNovel);
                });
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
     * 卡片点击事件
     */
    private onCardClick(novel: Novel) {
        console.log('[HistoryList] 卡片被点击:', novel.title, 'ID:', novel.id);

        // 埋点
        trackHistoryCardClick(novel.id, novel.title);

        // 设置场景参数
        SceneParams.set({ novelId: novel.id });

        // 跳转到游戏场景
        director.loadScene(this.gameSceneName);
    }

    /**
     * 刷新列表
     */
    async refresh() {
        await this.loadHistory(1);
    }

    /**
     * 加载下一页
     */
    async loadNextPage() {
        await this.loadHistory(this.currentPage + 1);
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
     * 获取当前历史记录列表
     */
    getHistoryList(): Novel[] {
        return this.historyList;
    }

    /**
     * 清空列表
     */
    clear() {
        this.historyList = [];
        if (this.cardsContainer) {
            this.cardsContainer.removeAllChildren();
        }
    }
}
