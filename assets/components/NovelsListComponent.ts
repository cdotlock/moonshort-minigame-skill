import { _decorator, Component, Node, Prefab, instantiate, Label, Sprite, director, ScrollView, UITransform, Rect } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { NovelsAPI } from '../scripts/api/NovelsAPI';
import { Novel } from '../scripts/types/api.types';
import { NovelItemComponent } from './NovelItemComponent';
import { SceneHistory } from './SceneHistory';
import { trackIndexCardClick, trackIndexCardImpression } from '../analytics/UiEvents';
import { ANALYTICS_DEBUG } from '../analytics/AnalyticsConfig';

const { ccclass, property, menu } = _decorator;

/**
 * 小说列表组件
 * 用于显示小说列表，支持分页加载
 */
@ccclass('NovelsListComponent')
@menu('Components/NovelsListComponent')
export class NovelsListComponent extends Component {
    @property({ type: Node, tooltip: '小说项的容器节点（用于放置列表项）' })
    containerNode: Node | null = null;

    @property({ type: Prefab, tooltip: '小说项预制体（需包含 title、description、coverImage 等节点）' })
    itemPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '加载中提示节点' })
    loadingNode: Node | null = null;

    @property({ type: Node, tooltip: '空状态提示节点' })
    emptyNode: Node | null = null;

    @property({ type: Node, tooltip: '错误提示节点' })
    errorNode: Node | null = null;

    @property({ type: ScrollView, tooltip: '滚动视图组件（用于监听曝光）' })
    scrollView: ScrollView | null = null;

    @property({ tooltip: '每页加载数量' })
    pageSize: number = 10;

    @property({ tooltip: '是否自动加载' })
    autoLoad: boolean = true;

    private novelsAPI: NovelsAPI | null = null;
    private currentPage: number = 1;
    private totalPages: number = 1;
    private isLoading: boolean = false;
    private novels: Novel[] = [];
    private _exposedIds: Set<string> = new Set();

    onLoad() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            console.error('[NovelsListComponent] GameManager 未初始化');
            return;
        }

        this.novelsAPI = new NovelsAPI(gameManager.getAPI());

        if (this.autoLoad) {
            this.loadNovels();
        }

        if (this.scrollView) {
            this.scrollView.node.on('scrolling', this.checkVisibleItems, this);
        }
    }

    /**
     * 检查当前可视区域内的卡片并触发曝光埋点
     */
    private checkVisibleItems() {
        if (!this.scrollView || !this.containerNode) return;

        const viewNode = this.scrollView.view?.node;
        if (!viewNode) return;

        const viewTransform = viewNode.getComponent(UITransform);
        if (!viewTransform) return;

        // 获取可视区域的世界包围盒
        const viewBounds = viewTransform.getBoundingBoxToWorld();

        this.containerNode.children.forEach(itemNode => {
            const itemTransform = itemNode.getComponent(UITransform);
            if (!itemTransform) return;

            // 获取卡片的世界包围盒
            const itemBounds = itemTransform.getBoundingBoxToWorld();

            // 检查是否相交
            const isIntersect = viewBounds.intersects(itemBounds);

            if (isIntersect) {
                const itemComponent = itemNode.getComponent(NovelItemComponent) || itemNode.getComponentInChildren(NovelItemComponent);
                const novel = itemComponent?.getData();

                if (novel && !this._exposedIds.has(novel.id)) {
                    // 强制触发，不检查场景名，因为既然在这个组件里，肯定是在首页
                    trackIndexCardImpression(novel.id, novel.title);
                    this._exposedIds.add(novel.id);
                }
            }
        });
    }

    /**
     * 加载小说列表
     * @param page 页码（可选，默认加载下一页）
     */
    async loadNovels(page?: number) {
        // 检查组件是否有效
        if (!this.node || !this.node.isValid) {
            return;
        }

        if (this.isLoading || !this.novelsAPI) {
            return;
        }

        // 检查必要配置
        if (!this.containerNode || !this.itemPrefab) {
            console.warn('[NovelsListComponent] containerNode 或 itemPrefab 未配置，跳过加载');
            return;
        }

        if (page !== undefined) {
            this.currentPage = page;
        }

        this.setLoadingState(true);
        this.hideAllStates();

        try {
            const response = await this.novelsAPI.getList(this.currentPage, this.pageSize);
            
            // 异步请求后再次检查组件有效性
            if (!this.node || !this.node.isValid) {
                return;
            }

            this.novels = response.items;
            this.totalPages = response.pagination.totalPages;

            if (this.novels.length === 0) {
                this.showEmptyState();
            } else {
                this.renderNovels();
            }

        } catch (error) {
            console.error('[NovelsListComponent] 加载失败:', error);
            if (this.node && this.node.isValid) {
                this.showErrorState();
            }
        } finally {
            if (this.node && this.node.isValid) {
                this.setLoadingState(false);
            }
        }
    }

    /**
     * 渲染小说列表
     */
    private renderNovels() {
        if (!this.containerNode || !this.containerNode.isValid || !this.itemPrefab) {
            console.warn('[NovelsListComponent] containerNode 或 itemPrefab 无效，跳过渲染');
            return;
        }

        // 清空容器
        this.containerNode.removeAllChildren();

        // 创建列表项
        for (const novel of this.novels) {
            const itemNode = instantiate(this.itemPrefab);
            this.containerNode.addChild(itemNode);

            // 设置数据（通过查找子节点）
            this.setItemData(itemNode, novel);

            // 绑定点击事件
            itemNode.on(Node.EventType.TOUCH_END, () => {
                // 埋点：点击 (Tap)
                trackIndexCardClick(novel.id, novel.title);
                this.onNovelClick(novel);
            }, this);
        }

        // 渲染完成后立即检查一次初始可见状态
        this.scheduleOnce(() => {
            this.checkVisibleItems();
        }, 0.1);
    }

    /**
     * 设置列表项数据
     */
    private setItemData(itemNode: Node, novel: Novel) {
        // 优先在根节点上查找 NovelItemComponent
        let itemComponent = itemNode.getComponent(NovelItemComponent);
        
        // 如果根节点没有，在子节点中查找
        if (!itemComponent) {
            itemComponent = itemNode.getComponentInChildren(NovelItemComponent);
        }
        
        if (itemComponent) {
            itemComponent.setData(novel);
            return;
        }

        // 降级：使用传统的查找子节点方式
        // 标题
        const titleLabel = itemNode.getChildByName('Title')?.getComponent(Label);
        if (titleLabel) {
            titleLabel.string = novel.title;
        }

        // 描述
        const descLabel = itemNode.getChildByName('Description')?.getComponent(Label);
        if (descLabel) {
            descLabel.string = novel.description || '暂无描述';
        }

        // 第一章标题
        const firstChapterLabel = itemNode.getChildByName('FirstChapterTitle')?.getComponent(Label);
        if (firstChapterLabel) {
            firstChapterLabel.string = novel.firstChapterTitle || '未设置标题';
        }
    }

    /**
     * 小说点击事件
     */
    private onNovelClick(novel: Novel) {
        console.log('[NovelsListComponent] 点击小说:', novel.title);
        
        // 记录浏览
        if (this.novelsAPI) {
            this.novelsAPI.view(novel.id).catch(err => {
                console.error('[NovelsListComponent] 记录浏览失败:', err);
            });
        }

        // 跳转到 overview 场景，传递 novelId
        SceneHistory.push('overview', { novelId: novel.id });
        
        // 也触发自定义事件（兼容旧代码）
        this.node.emit('novel-selected', novel);
    }

    /**
     * 加载下一页
     */
    loadNextPage() {
        if (this.currentPage < this.totalPages) {
            this.loadNovels(this.currentPage + 1);
        }
    }

    /**
     * 加载上一页
     */
    loadPrevPage() {
        if (this.currentPage > 1) {
            this.loadNovels(this.currentPage - 1);
        }
    }

    /**
     * 刷新列表
     */
    refresh() {
        this.loadNovels(1);
    }

    /**
     * 设置加载状态
     */
    private setLoadingState(loading: boolean) {
        this.isLoading = loading;
        if (this.loadingNode) {
            this.loadingNode.active = loading;
        }
    }

    /**
     * 隐藏所有状态节点
     */
    private hideAllStates() {
        if (this.emptyNode) this.emptyNode.active = false;
        if (this.errorNode) this.errorNode.active = false;
    }

    /**
     * 显示空状态
     */
    private showEmptyState() {
        if (this.emptyNode) {
            this.emptyNode.active = true;
        }
    }

    /**
     * 显示错误状态
     */
    private showErrorState() {
        if (this.errorNode) {
            this.errorNode.active = true;
        }
    }

    /**
     * 获取当前加载的小说列表
     */
    getNovels(): Novel[] {
        return this.novels;
    }

    onDestroy() {
        // 清理事件监听
        if (this.containerNode) {
            this.containerNode.removeAllChildren();
        }
    }
}
