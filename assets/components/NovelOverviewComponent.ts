import { _decorator, Component, Node, Label, Sprite, Prefab, instantiate, assetManager, ImageAsset, SpriteFrame, Texture2D, Button } from 'cc';
import { showLoading, hideLoading } from '../scripts/utils/SpriteLoading';
import { SceneParams } from '../scripts/core/SceneParams';
import { Navigator } from '../scripts/core/Navigator';
import { GameManager } from '../scripts/core/GameManager';
import { NovelsAPI } from '../scripts/api/NovelsAPI';
import { SavesAPI } from '../scripts/api/SavesAPI';
import { Novel, SaveGame } from '../scripts/types/api.types';
import { trackOverviewPlayClick, trackOverviewView } from '../analytics/UiEvents';
import { TagItemComponent } from './TagItemComponent';

const { ccclass, property, menu } = _decorator;

/**
 * 小说详情页组件
 * 显示小说名称、描述、标签、点赞数、游玩次数、章节数量等
 * 支持点赞/取消点赞功能
 */
@ccclass('NovelOverviewComponent')
@menu('Components/NovelOverviewComponent')
export class NovelOverviewComponent extends Component {
    // UI 元素
    @property({ type: Sprite, tooltip: '封面图' })
    coverImage: Sprite | null = null;

    @property({ type: Label, tooltip: '小说标题' })
    titleLabel: Label | null = null;

    @property({ type: Label, tooltip: '小说描述' })
    descriptionLabel: Label | null = null;

    @property({ type: Label, tooltip: '点赞数量' })
    likeCountLabel: Label | null = null;

    @property({ type: Label, tooltip: '游玩次数' })
    viewCountLabel: Label | null = null;

    @property({ type: Label, tooltip: '章节数量' })
    nodeCountLabel: Label | null = null;

    @property({ type: Button, tooltip: '点赞按钮' })
    likeButton: Button | null = null;

    @property({ type: Node, tooltip: '已点赞状态节点（点赞后显示）' })
    likedNode: Node | null = null;

    @property({ type: Node, tooltip: '未点赞状态节点（默认显示）' })
    unlikedNode: Node | null = null;

    // 标签相关
    @property({ type: Node, tooltip: '标签容器节点' })
    tagsContainer: Node | null = null;

    @property({ type: Prefab, tooltip: '标签项预制体（需包含 TagItemComponent）' })
    tagPrefab: Prefab | null = null;

    // 加载状态
    @property({ type: Node, tooltip: '加载中提示节点' })
    loadingNode: Node | null = null;

    @property({ type: Node, tooltip: '错误提示节点' })
    errorNode: Node | null = null;

    @property({ type: Node, tooltip: '内容节点（加载成功后显示）' })
    contentNode: Node | null = null;

    @property({ tooltip: '属性分配场景名称' })
    addPointSceneName: string = 'add-point';

    private novelId: string = '';
    private novelsAPI: NovelsAPI | null = null;
    private savesAPI: SavesAPI | null = null;
    private currentNovel: Novel | null = null;
    private isLiking: boolean = false; // 防止重复点击

    onLoad() {
        // 初始化 API
        const gameManager = GameManager.getInstance();
        this.novelsAPI = new NovelsAPI(gameManager.getAPI());
        this.savesAPI = new SavesAPI(gameManager.getAPI());

        // 获取场景参数
        const params = SceneParams.get<{ novelId: string }>();
        
        if (!params.novelId) {
            console.error('[NovelOverviewComponent] 缺少 novelId 参数');
            this.showError();
            return;
        }

        this.novelId = params.novelId;
        console.log('[NovelOverviewComponent] 接收到 novelId:', this.novelId);

        // 绑定点赞按钮事件
        if (this.likeButton) {
            this.likeButton.node.on(Button.EventType.CLICK, this.onLikeButtonClick, this);
        }

        // 加载小说详情
        this.loadNovelDetail();
    }

    /**
     * 跳转到游戏场景（如果已有存档）
     */
    private navigateToGame(saveId: string) {
        console.log('[NovelOverviewComponent] 跳转到游戏场景, saveId:', saveId);
        
        // 设置场景参数
        SceneParams.set({ 
            saveId: parseInt(saveId),
            novelId: this.novelId 
        });
        
        console.log('[NovelOverviewComponent] SceneParams 已设置:', { saveId: parseInt(saveId), novelId: this.novelId });
        
        // 跳转场景
        Navigator.toScene('game');
    }
    
    /**
     * 跳转到属性分配场景（创建新存档）
     */
    private navigateToAddPoint() {
        console.log('[NovelOverviewComponent] 跳转到属性分配场景');
        
        // 设置场景参数
        SceneParams.set({ novelId: this.novelId });
        
        console.log('[NovelOverviewComponent] SceneParams 已设置:', { novelId: this.novelId });
        
        // 打开属性分配窗口
        Navigator.toWnd('addPointWnd', { novelId: this.novelId });
    }

    /**
     * 加载小说详情
     */
    private async loadNovelDetail() {
        if (!this.novelsAPI) {
            return;
        }

        this.showLoading();

        try {
            const novel = await this.novelsAPI.getDetail(this.novelId);
            this.currentNovel = novel;
            this.renderNovelDetail(novel);
            trackOverviewView(novel.id, novel.title);
            this.showContent();
        } catch (error) {
            console.error('[NovelOverviewComponent] 加载小说详情失败:', error);
            this.showError();
        }
    }

    /**
     * 渲染小说详情
     */
    private renderNovelDetail(novel: Novel) {
        console.log('[NovelOverviewComponent] 渲染小说详情:', novel);

        // 封面图
        if (novel.coverImage) {
            this.loadCoverImage(novel.coverImage);
        }

        // 标题
        if (this.titleLabel) {
            this.titleLabel.string = novel.title;
        }

        // 描述
        if (this.descriptionLabel) {
            this.descriptionLabel.string = novel.description || '暂无描述';
        }

        // 点赞数
        if (this.likeCountLabel) {
            this.likeCountLabel.string = novel.likeCount.toString();
        }

        // 游玩次数
        if (this.viewCountLabel) {
            this.viewCountLabel.string = novel.viewCount.toString();
        }

        // 章节数量
        if (this.nodeCountLabel) {
            this.nodeCountLabel.string = `${novel.nodeCount} chapters`;
        }

        // 渲染标签
        this.renderTags(novel.tags || []);

        // 更新点赞按钮状态
        this.updateLikeButtonState(novel.isLiked || false);
    }

    /**
     * 加载封面图
     */
    private async loadCoverImage(url: string) {
        if (!this.coverImage) {
            return;
        }

        try {
            // 显示 Loading
            const coverNode = this.coverImage.node;
            if (coverNode) showLoading(coverNode);
            
            // 加载远程图片
            assetManager.loadRemote<ImageAsset>(url, { ext: '.png' }, (err, imageAsset) => {
                // 隐藏 Loading
                if (coverNode) hideLoading(coverNode);
                
                if (err) {
                    console.error('[NovelOverviewComponent] 加载封面图失败:', err);
                    return;
                }

                if (!this.coverImage) {
                    return;
                }

                // 创建纹理
                const texture = new Texture2D();
                texture.image = imageAsset;

                // 创建 SpriteFrame
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;

                // 设置到 Sprite
                this.coverImage.spriteFrame = spriteFrame;
            });
        } catch (error) {
            console.error('[NovelOverviewComponent] 加载封面图异常:', error);
        }
    }

    /**
     * 渲染标签列表
     */
    private renderTags(tags: string[]) {
        if (!this.tagsContainer || !this.tagPrefab) {
            return;
        }

        // 清空容器
        this.tagsContainer.removeAllChildren();

        // 创建标签项
        for (const tag of tags) {
            const tagNode = instantiate(this.tagPrefab);
            this.tagsContainer.addChild(tagNode);

            // 设置标签文本
            const tagComponent = tagNode.getComponent(TagItemComponent);
            if (tagComponent) {
                tagComponent.setTag(tag);
            } else {
                // 降级：直接查找 Label
                const label = tagNode.getComponent(Label) || tagNode.getComponentInChildren(Label);
                if (label) {
                    label.string = tag;
                }
            }
        }
    }

    /**
     * 点赞按钮点击事件
     */
    private async onLikeButtonClick() {
        if (!this.currentNovel || !this.novelsAPI || this.isLiking) {
            return;
        }

        this.isLiking = true;
        const wasLiked = this.currentNovel.isLiked || false;

        try {
            if (wasLiked) {
                // 取消点赞
                await this.novelsAPI.unlike(this.novelId);
                this.currentNovel.isLiked = false;
                this.currentNovel.likeCount--;
            } else {
                // 点赞
                await this.novelsAPI.like(this.novelId);
                this.currentNovel.isLiked = true;
                this.currentNovel.likeCount++;
            }

            // 更新 UI
            this.updateLikeButtonState(this.currentNovel.isLiked);
            if (this.likeCountLabel) {
                this.likeCountLabel.string = this.currentNovel.likeCount.toString();
            }

        } catch (error) {
            console.error('[NovelOverviewComponent] 点赞/取消点赞失败:', error);
            // 恢复状态
            this.currentNovel.isLiked = wasLiked;
        } finally {
            this.isLiking = false;
        }
    }

    /**
     * 更新点赞按钮状态
     */
    private updateLikeButtonState(isLiked: boolean) {
        // 根据点赞状态显示/隐藏对应节点
        if (this.likedNode) {
            this.likedNode.active = isLiked;
        }
        
        if (this.unlikedNode) {
            this.unlikedNode.active = !isLiked;
        }
    }

    /**
     * 显示加载状态
     */
    private showLoading() {
        if (this.loadingNode) this.loadingNode.active = true;
        if (this.errorNode) this.errorNode.active = false;
        if (this.contentNode) this.contentNode.active = false;
    }

    /**
     * 显示错误状态
     */
    private showError() {
        if (this.loadingNode) this.loadingNode.active = false;
        if (this.errorNode) this.errorNode.active = true;
        if (this.contentNode) this.contentNode.active = false;
    }

    /**
     * 显示内容
     */
    private showContent() {
        if (this.loadingNode) this.loadingNode.active = false;
        if (this.errorNode) this.errorNode.active = false;
        if (this.contentNode) this.contentNode.active = true;
    }

    /**
     * 获取当前小说 ID
     */
    getNovelId(): string {
        return this.novelId;
    }

    /**
     * 获取当前小说数据
     */
    getCurrentNovel(): Novel | null {
        return this.currentNovel;
    }

    /**
     * 点击按钮跳转到游戏场景
     * 可以在编辑器中将按钮的点击事件绑定到这个方法
     * 
     * 使用方式：
     * 1. 在按钮的 Button 组件中，点击 "Click Events" 的 "+"
     * 2. 将 NovelOverviewComponent 所在节点拖入
     * 3. 选择 NovelOverviewComponent -> onClickRouterToGame
     */
    async onClickRouterToGame() {
        console.log('[NovelOverviewComponent] 按钮点击：跳转到游戏');

        const title = this.currentNovel?.title || this.titleLabel?.string || undefined;
        trackOverviewPlayClick(this.novelId, title);
        
        // 获取该小说的第一个存档或创建新存档
        if (!this.savesAPI) {
            console.error('[NovelOverviewComponent] savesAPI 未初始化');
            return;
        }
        
        try {
            console.log('[NovelOverviewComponent] 正在获取存档列表...');
            const saves = await this.savesAPI.getList(this.novelId);
            console.log('[NovelOverviewComponent] 存档列表:', saves);
            
            if (saves && saves.length > 0) {
                // 有存档，直接进入游戏
                console.log('[NovelOverviewComponent] 使用第一个存档:', saves[0].id);
                this.navigateToGame(saves[0].id);
            } else {
                // 没有存档，跳转到属性分配页面
                console.log('[NovelOverviewComponent] 没有存档，跳转到属性分配页面');
                this.navigateToAddPoint();
            }
        } catch (error) {
            console.error('[NovelOverviewComponent] 获取存档失败:', error);
        }
    }

    onDestroy() {
        // 清理事件监听（检查节点是否有效）
        if (this.likeButton && this.likeButton.node && this.likeButton.node.isValid) {
            this.likeButton.node.off(Button.EventType.CLICK, this.onLikeButtonClick, this);
        }
        
        // 清空引用
        this.novelsAPI = null;
        this.savesAPI = null;
        this.currentNovel = null;
    }
}
