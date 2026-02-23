import { _decorator, Component, Node, Prefab, instantiate, Label, Button } from 'cc';
import { GameManager } from '../scripts/core/GameManager';
import { DataStore } from '../scripts/core/DataStore';
import { SaveGame } from '../scripts/types/api.types';
import { Navigator } from '../scripts/core/Navigator';
import { SceneParams } from '../scripts/core/SceneParams';

const { ccclass, property, menu } = _decorator;

/**
 * 存档列表组件
 * 用于显示和管理存档列表
 */
@ccclass('SavesListComponent')
@menu('Components/SavesListComponent')
export class SavesListComponent extends Component {
    @property({ type: Node, tooltip: '存档项的容器节点' })
    containerNode: Node | null = null;

    @property({ type: Prefab, tooltip: '存档项预制体（需包含 novelTitle、level、updateTime 等节点）' })
    itemPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '加载中提示节点' })
    loadingNode: Node | null = null;

    @property({ type: Node, tooltip: '空状态提示节点' })
    emptyNode: Node | null = null;

    @property({ type: Node, tooltip: '错误提示节点' })
    errorNode: Node | null = null;

    @property({ tooltip: '过滤的小说 ID（可选，只显示该小说的存档）' })
    filterNovelId: string = '';

    @property({ tooltip: '是否自动加载' })
    autoLoad: boolean = true;

    @property({ tooltip: '点击存档时是否自动跳转到游戏场景（如果false，则只触发save-selected事件）' })
    autoNavigateToGame: boolean = true;

    @property({ tooltip: '游戏场景名称（当autoNavigateToGame=true时生效）' })
    gameSceneName: string = 'game';

    private dataStore: DataStore | null = null;
    private isLoading: boolean = false;
    private saves: SaveGame[] = [];
    private _unsubscribe: (() => void) | null = null;

    onLoad() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) {
            console.error('[SavesListComponent] GameManager 未初始化');
            return;
        }

        this.dataStore = gameManager.getDataStore();

        // 订阅数据更新
        const key = this.filterNovelId ? `saves_${this.filterNovelId}` : 'saves_all';
        this._unsubscribe = this.dataStore.subscribe<SaveGame[]>(key, (data, isFromCache) => {
            if (!isFromCache && this.node && this.node.isValid) {
                this.saves = data;
                this.renderSaves();
            }
        });

        if (this.autoLoad) {
            this.loadSaves();
        }
    }

    /**
     * 加载存档列表
     */
    async loadSaves() {
        if (this.isLoading || !this.dataStore) {
            return;
        }

        this.setLoadingState(true);
        this.hideAllStates();

        try {
            const novelId = this.filterNovelId || undefined;
            this.saves = await this.dataStore.getSaves(novelId);

            if (this.saves.length === 0) {
                this.showEmptyState();
            } else {
                this.renderSaves();
            }

        } catch (error) {
            console.error('[SavesListComponent] 加载失败:', error);
            this.showErrorState();
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * 渲染存档列表
     */
    private renderSaves() {
        if (!this.containerNode || !this.itemPrefab) {
            console.error('[SavesListComponent] containerNode 或 itemPrefab 未配置');
            return;
        }

        // 清空容器
        this.containerNode.removeAllChildren();

        // 创建列表项
        for (const save of this.saves) {
            const itemNode = instantiate(this.itemPrefab);
            this.containerNode.addChild(itemNode);

            // 设置数据
            this.setItemData(itemNode, save);

            // 绑定点击事件
            itemNode.on(Node.EventType.TOUCH_END, () => {
                this.onSaveClick(save);
            }, this);

            // 绑定删除按钮
            const deleteBtn = itemNode.getChildByName('DeleteButton');
            if (deleteBtn) {
                deleteBtn.on(Button.EventType.CLICK, () => {
                    this.onDeleteClick(save);
                }, this);
            }
        }
    }

    /**
     * 设置列表项数据
     */
    private setItemData(itemNode: Node, save: SaveGame) {
        // 小说标题
        const titleLabel = itemNode.getChildByName('NovelTitle')?.getComponent(Label);
        if (titleLabel) {
            titleLabel.string = save.novelTitle;
        }

        // 存档名称
        const nameLabel = itemNode.getChildByName('SaveName')?.getComponent(Label);
        if (nameLabel) {
            nameLabel.string = save.saveName || `存档 ${save.id.slice(0, 8)}`;
        }

        // 等级
        const levelLabel = itemNode.getChildByName('Level')?.getComponent(Label);
        if (levelLabel) {
            levelLabel.string = `等级: ${save.level}`;
        }

        // 进度
        const progressLabel = itemNode.getChildByName('Progress')?.getComponent(Label);
        if (progressLabel) {
            progressLabel.string = `节点: ${save.currentNodeIndex}`;
        }

        // 更新时间
        const timeLabel = itemNode.getChildByName('UpdateTime')?.getComponent(Label);
        if (timeLabel) {
            const date = new Date(save.updatedAt);
            timeLabel.string = this.formatDate(date);
        }
    }

    /**
     * 格式化日期
     */
    private formatDate(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diff / (1000 * 60));
                return `${minutes}分钟前`;
            }
            return `${hours}小时前`;
        } else if (days < 7) {
            return `${days}天前`;
        } else {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }
    }

    /**
     * 存档点击事件
     */
    private onSaveClick(save: SaveGame) {
        console.log('[SavesListComponent] 点击存档:', save.id);
        
        // 触发自定义事件
        this.node.emit('save-selected', save);
        
        // 如果启用了自动跳转，则跳转到游戏场景
        if (this.autoNavigateToGame) {
            this.navigateToGame(save.id);
        }
    }
    
    /**
     * 跳转到游戏场景
     */
    private navigateToGame(saveId: string) {
        console.log('[SavesListComponent] 跳转到游戏场景, saveId:', saveId);
        
        // 跳转到游戏场景
        Navigator.toScene('game', { saveId: parseInt(saveId) });
    }

    /**
     * 删除存档
     */
    private async onDeleteClick(save: SaveGame) {
        if (!this.dataStore) return;

        // TODO: 添加确认对话框
        console.log('[SavesListComponent] 删除存档:', save.id);

        try {
            const gameManager = GameManager.getInstance();
            const apiService = gameManager.getAPI();
            await apiService.delete(`/apiv2/saves/${save.id}`);
            // 刷新缓存并重新加载
            this.dataStore.invalidateSaves(this.filterNovelId || undefined);
            this.loadSaves();
        } catch (error) {
            console.error('[SavesListComponent] 删除失败:', error);
        }
    }

    /**
     * 刷新列表
     */
    refresh() {
        this.loadSaves();
    }

    /**
     * 设置过滤的小说 ID
     */
    setFilterNovelId(novelId: string) {
        this.filterNovelId = novelId;
        // 更新订阅
        this._unsubscribe?.();
        if (this.dataStore) {
            const key = novelId ? `saves_${novelId}` : 'saves_all';
            this._unsubscribe = this.dataStore.subscribe<SaveGame[]>(key, (data, isFromCache) => {
                if (!isFromCache && this.node && this.node.isValid) {
                    this.saves = data;
                    this.renderSaves();
                }
            });
        }
        this.loadSaves();
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
     * 获取当前加载的存档列表
     */
    getSaves(): SaveGame[] {
        return this.saves;
    }

    onDestroy() {
        this._unsubscribe?.();
        if (this.containerNode) {
            this.containerNode.removeAllChildren();
        }
    }
}
