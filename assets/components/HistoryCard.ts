import { _decorator, Component, Sprite, Label, Node, Button, SpriteFrame, instantiate, assetManager, ImageAsset, Texture2D } from 'cc';
import { Novel } from '../scripts/types/api.types';
import { trackHomeHistoryCardClick } from '../analytics/UiEvents';

const { ccclass, property, menu } = _decorator;

/**
 * 历史记录卡片组件
 * 用于显示单个小说的历史记录信息
 * 
 * 节点结构：
 * HistoryCard
 * ├── CoverImage (Sprite) - 封面图
 * ├── TitleLabel (Label) - 标题
 * ├── DescriptionLabel (Label) - 简介
 * └── TagsContainer (Node) - 标签容器
 *     └── TagLabel (Prefab) - 标签预制体
 */
@ccclass('HistoryCard')
@menu('Components/HistoryCard')
export class HistoryCard extends Component {
    // ========== 节点引用 ==========
    @property({ type: Sprite, tooltip: '封面图 Sprite' })
    coverSprite: Sprite | null = null;

    @property({ type: Label, tooltip: '标题 Label' })
    titleLabel: Label | null = null;

    @property({ type: Label, tooltip: '简介 Label' })
    descriptionLabel: Label | null = null;

    @property({ type: Node, tooltip: '标签容器' })
    tagsContainer: Node | null = null;

    @property({ type: Node, tooltip: '标签预制体' })
    tagPrefab: Node | null = null;

    @property({ type: Button, tooltip: '卡片按钮（可选）' })
    cardButton: Button | null = null;

    @property({ type: SpriteFrame, tooltip: '默认封面图' })
    defaultCover: SpriteFrame | null = null;

    // ========== 私有属性 ==========
    private novelData: Novel | null = null;
    private clickCallback: ((novel: Novel) => void) | null = null;

    onLoad() {
        // 绑定点击事件
        if (this.cardButton) {
            this.cardButton.node.on(Button.EventType.CLICK, this.onCardClick, this);
        } else {
            // 如果没有 Button 组件，监听整个节点的点击
            this.node.on(Node.EventType.TOUCH_END, this.onCardClick, this);
        }
    }

    onDestroy() {
        // 清理事件
        if (this.cardButton && this.cardButton.node && this.cardButton.node.isValid) {
            this.cardButton.node.off(Button.EventType.CLICK, this.onCardClick, this);
        }
        if (this.node && this.node.isValid) {
            this.node.off(Node.EventType.TOUCH_END, this.onCardClick, this);
        }

        // 清空引用
        this.novelData = null;
        this.clickCallback = null;
        this.coverSprite = null;
        this.titleLabel = null;
        this.descriptionLabel = null;
        this.tagsContainer = null;
        this.tagPrefab = null;
        this.cardButton = null;
    }

    /**
     * 设置小说数据
     */
    setNovelData(novel: Novel) {
        this.novelData = novel;
        this.render();
    }

    /**
     * 设置点击回调
     */
    setClickCallback(callback: (novel: Novel) => void) {
        this.clickCallback = callback;
    }

    /**
     * 渲染卡片内容
     */
    private async render() {
        if (!this.novelData) {
            console.warn('[HistoryCard] 小说数据为空');
            return;
        }

        // 渲染标题
        if (this.titleLabel) {
            this.titleLabel.string = this.novelData.title;
        }

        // 渲染简介
        if (this.descriptionLabel) {
            this.descriptionLabel.string = this.novelData.description || '暂无简介';
        }

        // 渲染封面
        await this.loadCoverImage();

        // 渲染标签
        this.renderTags();
    }

    /**
     * 加载封面图
     */
    private async loadCoverImage() {
        if (!this.coverSprite) {
            return;
        }

        const coverUrl = this.novelData?.coverImage;

        // 如果没有封面，使用默认封面
        if (!coverUrl) {
            if (this.defaultCover) {
                this.coverSprite.spriteFrame = this.defaultCover;
            }
            return;
        }

        try {
            // 使用 assetManager.loadRemote 加载远程图片
            assetManager.loadRemote<ImageAsset>(coverUrl, (err, imageAsset) => {
                if (err) {
                    console.error('[HistoryCard] 封面图加载失败:', err);
                    if (this.defaultCover && this.coverSprite) {
                        this.coverSprite.spriteFrame = this.defaultCover;
                    }
                    return;
                }

                if (!this.coverSprite || !this.coverSprite.isValid) {
                    return;
                }

                // 创建纹理
                const texture = new Texture2D();
                texture.image = imageAsset;

                // 创建 SpriteFrame
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;

                // 设置到 Sprite
                this.coverSprite.spriteFrame = spriteFrame;

                console.log('[HistoryCard] 封面图加载成功:', coverUrl);
            });
        } catch (error) {
            console.error('[HistoryCard] 封面图加载异常:', error);
            if (this.defaultCover) {
                this.coverSprite.spriteFrame = this.defaultCover;
            }
        }
    }

    /**
     * 渲染标签
     */
    private renderTags() {
        if (!this.tagsContainer || !this.tagPrefab || !this.novelData) {
            return;
        }

        // 清空现有标签
        this.tagsContainer.removeAllChildren();

        // 创建标签
        const tags = this.novelData.tags || [];
        tags.forEach(tag => {
            const tagNode = instantiate(this.tagPrefab!);
            
            // 设置标签文本
            const tagLabel = tagNode.getComponentInChildren(Label);
            if (tagLabel) {
                tagLabel.string = tag;
            }

            this.tagsContainer!.addChild(tagNode);
        });
    }

    /**
     * 卡片点击事件
     */
    private onCardClick() {
        if (!this.novelData) {
            console.warn('[HistoryCard] 小说数据为空，无法触发点击');
            return;
        }

        console.log('[HistoryCard] 卡片被点击:', this.novelData.title);

        // 触发埋点
        trackHomeHistoryCardClick(this.novelData.id, this.novelData.title);

        // 触发回调
        if (this.clickCallback) {
            this.clickCallback(this.novelData);
        }
    }

    /**
     * 获取小说ID
     */
    getNovelId(): string | null {
        return this.novelData?.id || null;
    }

    /**
     * 获取小说数据
     */
    getNovelData(): Novel | null {
        return this.novelData;
    }
}
