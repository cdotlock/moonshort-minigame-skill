import { _decorator, Component, Node, assetManager, ImageAsset, SpriteFrame, Texture2D, director, Sprite, Size, Rect, AudioSource } from 'cc';
import { SceneParams } from '../scripts/core/SceneParams';
import { Navigator } from '../scripts/core/Navigator';
import { GameManager } from '../scripts/core/GameManager';
import { GameAPI } from '../scripts/api/GameAPI';
import { PlayerSave, GamePhase, EnrichedBCard, ACardPool } from '../scripts/types/game.types';
import { trackGameItemsClick, trackGameNodeFinished, trackGameView } from '../analytics/UiEvents';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { TransitionDisplayComponent } from './TransitionDisplayComponent';
import { ACardPanel } from './ACardPanel';
import { BCardDisplayComponent } from './BCardDisplayComponent';
import { InventoryPanel } from './InventoryPanel';
import { VideoTexturePlayer } from './VideoTexturePlayer';
import { showLoading, hideLoading } from '../scripts/utils/SpriteLoading';
import { getTTSManager } from '../scripts/core/TTSManager';

const { ccclass, property, menu } = _decorator;

/**
 * 游戏场景总控组件
 * 负责管理游戏状态、阶段切换、协调各个子组件
 * 
 * 使用方法：
 * 1. 创建 Game 场景
 * 2. 将此组件挂载到根节点
 * 3. 配置各个子组件节点引用
 * 4. 从 Overview 场景传递 saveId 参数跳转过来
 */
@ccclass('GameSceneController')
@menu('Components/GameSceneController')
export class GameSceneController extends Component {
    // 子组件节点引用
    @property({ type: Node, tooltip: '玩家状态面板节点' })
    playerStatsPanelNode: Node | null = null;

    @property({ type: Node, tooltip: 'B卡显示容器节点' })
    bCardContainerNode: Node | null = null;

    @property({ type: Node, tooltip: 'A卡面板容器节点' })
    aCardContainerNode: Node | null = null;

    @property({ type: Node, tooltip: '过渡叙事容器节点' })
    transitionContainerNode: Node | null = null;

    @property({ type: Node, tooltip: '装备面板容器节点' })
    inventoryContainerNode: Node | null = null;

    // 场景渲染节点
    @property({ type: Sprite, tooltip: '场景渲染节点（无蒙版，用于图片/视频）' })
    sceneImageSprite: Sprite | null = null;

    @property({ type: Sprite, tooltip: '场景渲染节点（有蒙版，只用于图片）' })
    sceneImageWithMaskSprite: Sprite | null = null;

    // 状态节点
    @property({ type: Node, tooltip: '加载中节点' })
    loadingNode: Node | null = null;

    @property({ type: Node, tooltip: '错误节点' })
    errorNode: Node | null = null;

    // 私有属性
    private gameAPI: GameAPI | null = null;
    private currentSave: PlayerSave | null = null;
    private currentPhase: GamePhase = GamePhase.B_CARD;

    // 子组件引用
    private playerStatsPanel: PlayerStatsPanel | null = null;
    private transitionDisplay: TransitionDisplayComponent | null = null;
    private aCardPanel: ACardPanel | null = null;
    private bCardDisplay: BCardDisplayComponent | null = null;
    private inventoryPanel: InventoryPanel | null = null;
    
    // 场景渲染状态
    private videoPlayer: VideoTexturePlayer | null = null;  // 视频播放器（动态添加）
    private currentRenderMode: 'image' | 'image-mask' | 'video' | null = null;  // 当前渲染模式

    async onLoad() {
        console.log('[GameSceneController] 初始化...');
        
        // 初始化场景渲染 Sprite 节点
        // 两个节点始终激活，通过层级切换显示
        if (this.sceneImageSprite?.node) {
            this.sceneImageSprite.node.active = true;
            this.sceneImageSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            console.log('[GameSceneController] sceneImageSprite 激活，sizeMode = CUSTOM');
        }
        if (this.sceneImageWithMaskSprite?.node) {
            this.sceneImageWithMaskSprite.node.active = true;
            this.sceneImageWithMaskSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            console.log('[GameSceneController] sceneImageWithMaskSprite 激活，sizeMode = CUSTOM');
        }
        // 初始层级：无蒙版节点在上层（视频和普通图片都用它）
        if (this.sceneImageSprite?.node && this.sceneImageWithMaskSprite?.node) {
            const idx1 = this.sceneImageSprite.node.getSiblingIndex();
            const idx2 = this.sceneImageWithMaskSprite.node.getSiblingIndex();
            if (idx1 < idx2) {
                // 无蒙版在下层，交换
                this.sceneImageSprite.node.setSiblingIndex(idx2);
                this.sceneImageWithMaskSprite.node.setSiblingIndex(idx1);
            }
            console.log('[GameSceneController] 初始层级: sceneImageSprite =', this.sceneImageSprite.node.getSiblingIndex(), 
                        ', sceneImageWithMaskSprite =', this.sceneImageWithMaskSprite.node.getSiblingIndex());
        }
        
        // 初始化 TTS AudioSource
        this.initTTSAudioSource();

        // 初始化 API
        const gameManager = GameManager.getInstance();
        this.gameAPI = new GameAPI(gameManager.getAPI());

        // 查找子组件
        this.findChildComponents();

        // 获取场景参数
        console.log('[GameSceneController] 尝试获取 SceneParams...');
        const params = SceneParams.get<{ saveId?: number, novelId?: string }>(false);
        
        console.log('[GameSceneController] 获取到的 SceneParams:', params);
        
        // 消费参数
        SceneParams.get(true);
        
        if (!params.saveId) {
            console.error('[GameSceneController] 缺少 saveId 参数');
            this.showError();
            return;
        }

        // 加载存档
        await this.loadSave(params.saveId);
    }

    /**
     * 查找并缓存子组件引用
     */
    private findChildComponents() {
        console.log('[GameSceneController] 开始查找子组件...');
        
        // 玩家状态面板
        if (this.playerStatsPanelNode) {
            console.log('[GameSceneController] playerStatsPanelNode 节点路径:', this.playerStatsPanelNode.name);
            this.playerStatsPanel = this.playerStatsPanelNode.getComponent(PlayerStatsPanel);
            if (!this.playerStatsPanel) {
                console.log('[GameSceneController] 根节点未找到 PlayerStatsPanel，尝试在子节点中查找...');
                this.playerStatsPanel = this.playerStatsPanelNode.getComponentInChildren(PlayerStatsPanel);
            }
            
            if (this.playerStatsPanel) {
                console.log('[GameSceneController] ✓ 成功找到 PlayerStatsPanel 组件');
            } else {
                console.error('[GameSceneController] ✗ 未找到 PlayerStatsPanel 组件，请检查预制体配置');
            }
        } else {
            console.error('[GameSceneController] ✗ playerStatsPanelNode 未配置');
        }

        // B卡显示
        if (this.bCardContainerNode) {
            console.log('[GameSceneController] bCardContainerNode 节点路径:', this.bCardContainerNode.name);
            this.bCardDisplay = this.bCardContainerNode.getComponent(BCardDisplayComponent);
            if (!this.bCardDisplay) {
                console.log('[GameSceneController] 根节点未找到 BCardDisplayComponent，尝试在子节点中查找...');
                this.bCardDisplay = this.bCardContainerNode.getComponentInChildren(BCardDisplayComponent);
            }
            
            if (this.bCardDisplay) {
                console.log('[GameSceneController] ✓ 成功找到 BCardDisplayComponent 组件');
            } else {
                console.warn('[GameSceneController] ✗ 未找到 BCardDisplayComponent 组件');
            }
        }

        // A卡面板
        if (this.aCardContainerNode) {
            console.log('[GameSceneController] aCardContainerNode 节点路径:', this.aCardContainerNode.name);
            this.aCardPanel = this.aCardContainerNode.getComponent(ACardPanel);
            if (!this.aCardPanel) {
                console.log('[GameSceneController] 根节点未找到 ACardPanel，尝试在子节点中查找...');
                this.aCardPanel = this.aCardContainerNode.getComponentInChildren(ACardPanel);
            }
            
            if (this.aCardPanel) {
                console.log('[GameSceneController] ✓ 成功找到 ACardPanel 组件');
            } else {
                console.warn('[GameSceneController] ✗ 未找到 ACardPanel 组件');
            }
        }

        // 过渡叙事
        if (this.transitionContainerNode) {
            console.log('[GameSceneController] transitionContainerNode 节点路径:', this.transitionContainerNode.name);
            this.transitionDisplay = this.transitionContainerNode.getComponent(TransitionDisplayComponent);
            if (!this.transitionDisplay) {
                console.log('[GameSceneController] 根节点未找到 TransitionDisplayComponent，尝试在子节点中查找...');
                this.transitionDisplay = this.transitionContainerNode.getComponentInChildren(TransitionDisplayComponent);
            }
            
            if (this.transitionDisplay) {
                console.log('[GameSceneController] ✓ 成功找到 TransitionDisplayComponent 组件');
            } else {
                console.warn('[GameSceneController] ✗ 未找到 TransitionDisplayComponent 组件');
            }
        }

        // 装备面板
        if (this.inventoryContainerNode) {
            console.log('[GameSceneController] inventoryContainerNode 节点路径:', this.inventoryContainerNode.name);
            this.inventoryPanel = this.inventoryContainerNode.getComponent(InventoryPanel);
            if (!this.inventoryPanel) {
                console.log('[GameSceneController] 根节点未找到 InventoryPanel，尝试在子节点中查找...');
                this.inventoryPanel = this.inventoryContainerNode.getComponentInChildren(InventoryPanel);
            }
            
            if (this.inventoryPanel) {
                console.log('[GameSceneController] ✓ 成功找到 InventoryPanel 组件');
                
                // 监听装备面板关闭事件
                if (this.inventoryPanel.node && this.inventoryPanel.node.isValid) {
                    this.inventoryPanel.node.on('inventory-close', this.closeInventoryPanel, this);
                }
            } else {
                console.warn('[GameSceneController] ✗ 未找到 InventoryPanel 组件');
            }
        }
        
        console.log('[GameSceneController] 子组件查找完成:', {
            playerStatsPanel: !!this.playerStatsPanel,
            bCardDisplay: !!this.bCardDisplay,
            aCardPanel: !!this.aCardPanel,
            transitionDisplay: !!this.transitionDisplay,
            inventoryPanel: !!this.inventoryPanel,
        });
    }
    
    /**
     * 初始化 TTS AudioSource
     * 在根节点上添加 AudioSource 组件用于 TTS 播放
     */
    private initTTSAudioSource() {
        // 获取或添加 AudioSource 组件
        let audioSource = this.node.getComponent(AudioSource);
        if (!audioSource) {
            audioSource = this.node.addComponent(AudioSource);
            console.log('[GameSceneController] 已添加 AudioSource 组件用于 TTS');
        }
        
        // 设置给 TTSManager
        const ttsManager = getTTSManager();
        ttsManager.setAudioSource(audioSource);
        console.log('[GameSceneController] TTS AudioSource 初始化完成');
    }

    /**
     * 加载存档
     */
    private async loadSave(saveId: number) {
        if (!this.gameAPI) {
            return;
        }

        this.showLoading();

        try {
            console.log('[GameSceneController] 加载存档 ID:', saveId);
            const save = await this.gameAPI.getSaveDetail(saveId);
            this.currentSave = save;

            trackGameView(save.novelId, save.novelTitle);
            
            console.log('[GameSceneController] 存档数据加载成功:', {
                id: save.id,
                level: save.level,
                hp: save.hp,
                maxHp: save.maxHp,
                mp: save.mp,
                maxMp: save.maxMp,
                experience: save.experience,
                expForLevelUp: save.expForLevelUp,
                spiritStone: save.spiritStone
            });

            // 更新玩家状态面板
            if (this.playerStatsPanel) {
                console.log('[GameSceneController] 正在更新 PlayerStatsPanel...');
                this.playerStatsPanel.updatePlayerState(save);
                
                // 加载扮演角色头像
                if (save.roleplayCharacterAvatar) {
                    console.log('[GameSceneController] 加载扮演角色头像:', save.roleplayCharacterAvatar);
                    await this.loadAndSetAvatar(save.roleplayCharacterAvatar);
                } else {
                    console.warn('[GameSceneController] 未设置扮演角色头像');
                }
                
                console.log('[GameSceneController] PlayerStatsPanel 更新完成');
            } else {
                console.error('[GameSceneController] PlayerStatsPanel 组件为 null，无法更新玩家状态！');
            }

            // 根据游戏阶段初始化
            console.log('[GameSceneController] 当前阶段:', save.gamePhase);
            this.currentPhase = save.gamePhase as GamePhase;

            if (this.currentPhase === GamePhase.A_CARD) {
                await this.startACardPhase();
            } else {
                await this.startBCardPhase();
            }

            this.hideLoading();
        } catch (error) {
            console.error('[GameSceneController] 加载存档失败:', error);
            this.showError();
        }
    }

    // 存储加载好的头像 SpriteFrame
    private roleplayAvatarFrame: SpriteFrame | null = null;

    /**
     * 加载并设置扮演角色头像
     */
    private loadAndSetAvatar(avatarUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.playerStatsPanel) {
                resolve();
                return;
            }

            // 显示 Loading
            const avatarNode = this.playerStatsPanel?.getAvatarNode?.();
            if (avatarNode) showLoading(avatarNode, { showMask: false });
            
            assetManager.loadRemote<ImageAsset>(avatarUrl, (err, imageAsset) => {
                // 隐藏 Loading
                if (avatarNode) hideLoading(avatarNode);
                
                if (err) {
                    console.error('[GameSceneController] 头像加载失败:', err);
                    reject(err);
                    return;
                }

                const spriteFrame = new SpriteFrame();
                const texture = new Texture2D();
                texture.image = imageAsset;
                spriteFrame.texture = texture;
                
                // 缓存 SpriteFrame 供 B 卡使用
                this.roleplayAvatarFrame = spriteFrame;
                
                this.playerStatsPanel!.setAvatar(spriteFrame);
                console.log('[GameSceneController] 头像设置成功');
                resolve();
            });
        });
    }

    /**
     * 为 B 卡设置角色信息
     */
    private setupRoleplayInfoForBCard() {
        if (!this.bCardDisplay || !this.currentSave) {
            return;
        }

        const characterName = this.currentSave.roleplayCharacterName || '主角';
        
        console.log('[GameSceneController] 设置 B 卡角色信息:', {
            characterName,
            hasAvatar: !!this.roleplayAvatarFrame
        });
        
        // nameSuffix 由预制体面板配置，不需要传递
        this.bCardDisplay.setRoleplayInfo(this.roleplayAvatarFrame, characterName);
    }

    /**
     * 为 B 卡设置玩家数据
     */
    private setupPlayerDataForBCard() {
        if (!this.bCardDisplay || !this.currentSave) {
            return;
        }

        console.log('[GameSceneController] 设置 B 卡玩家数据');
        this.bCardDisplay.setPlayerSave(this.currentSave);
    }

    /**
     * 开始 B 卡阶段
     */
    private async startBCardPhase() {
        console.log('[GameSceneController] 开始 B 卡阶段');
        this.currentPhase = GamePhase.B_CARD;

        // 显示 B 卡容器，隐藏其他
        this.showContainer(this.bCardContainerNode);

        console.log('[GameSceneController] 检查组件状态:', {
            bCardDisplay: !!this.bCardDisplay,
            gameAPI: !!this.gameAPI,
            currentSave: !!this.currentSave,
            bCardContainerNode: !!this.bCardContainerNode
        });

        if (!this.bCardDisplay) {
            console.error('[GameSceneController] BCardDisplayComponent 未初始化！');
            return;
        }
        
        if (!this.gameAPI) {
            console.error('[GameSceneController] GameAPI 未初始化！');
            return;
        }
        
        if (!this.currentSave) {
            console.error('[GameSceneController] currentSave 为 null！');
            return;
        }

        // 设置角色信息和玩家数据
        this.setupRoleplayInfoForBCard();
        this.setupPlayerDataForBCard();

        try {
            console.log('[GameSceneController] 开始调用 getEnrichedBCard API, saveId:', this.currentSave.id);
            
            // 在 API 请求期间显示 Loading（在无蒙版 Sprite 上）
            if (this.sceneImageSprite?.node) {
                showLoading(this.sceneImageSprite.node);
            }
            
            // 获取富化的 B 卡数据
            const bcard = await this.gameAPI.getEnrichedBCard(this.currentSave.id);
            
            // API 返回后隐藏 Loading（视频加载时会重新显示）
            if (this.sceneImageSprite?.node) {
                hideLoading(this.sceneImageSprite.node);
            }
            
            // 异步操作完成后，检查组件是否还存在（防止场景切换）
            if (!this.bCardDisplay || !this.node || !this.node.isValid) {
                console.warn('[GameSceneController] 组件已销毁，放弃 B 卡显示');
                return;
            }
            
            console.log('[GameSceneController] B 卡数据加载成功:', bcard);
            
            // 显示 B 卡内容
            console.log('[GameSceneController] 调用 displayBCard...');
            this.bCardDisplay.displayBCard(bcard);
            console.log('[GameSceneController] displayBCard 调用完成');

            // 监听 B 卡完成事件
            if (this.bCardDisplay.node && this.bCardDisplay.node.isValid) {
                this.bCardDisplay.node.once('bcard-completed', this.onBCardCompleted, this);
            }

        } catch (error) {
            console.error('[GameSceneController] 加载 B 卡失败:', error);
            console.error('[GameSceneController] 错误详情:', error instanceof Error ? error.message : String(error));
            console.error('[GameSceneController] 错误堆栈:', error instanceof Error ? error.stack : '');
        }
    }

    /**
     * B 卡完成回调
     */
    private async onBCardCompleted(result: any) {
        console.log('[GameSceneController] B 卡完成:', result);
        
        // 检查组件是否还存在
        if (!this.node || !this.node.isValid) {
            console.warn('[GameSceneController] 组件已销毁，放弃 B 卡完成处理');
            return;
        }

        const nodeIndex = typeof result?.nodeIndex === 'number'
            ? result.nodeIndex
            : this.currentSave?.currentNodeIndex;
        trackGameNodeFinished(nodeIndex);

        // 更新存档数据
        if (this.currentSave && result.playerUpdates) {
            Object.assign(this.currentSave, result.playerUpdates);
            console.log('[GameSceneController] B卡完成，更新存档数据:', result.playerUpdates);
            
            // 更新玩家状态面板
            if (this.playerStatsPanel) {
                console.log('[GameSceneController] 正在更新 PlayerStatsPanel...');
                this.playerStatsPanel.updatePlayerState(this.currentSave);
            } else {
                console.error('[GameSceneController] PlayerStatsPanel 组件为 null');
            }
        }

        // 检查是否有下一个节点
        if (!this.currentSave || !this.gameAPI) {
            console.error('[GameSceneController] currentSave 或 gameAPI 为 null');
            return;
        }

        // 检查后端返回的 gameCompleted 字段
        console.log('[GameSceneController] 检查游戏状态:', {
            gameCompleted: result.gameCompleted,
            nextNodeIndex: result.nextNodeIndex,
            resultType: result.resultType,
        });
        const gameCompleted = result.gameCompleted === true;

        if (gameCompleted) {
            console.log('[GameSceneController] 游戏已完成，返回首页');
            this.returnToHome();
        } else {
            console.log('[GameSceneController] 进入下一个节点的 A 卡阶段');
            await this.startACardPhase();
        }
    }

    /**
     * 开始过渡叙事阶段
     */
    private async startTransitionPhase(nodeIndex: number, resultType: string) {
        console.log('[GameSceneController] 开始过渡叙事阶段');
        this.currentPhase = GamePhase.TRANSITION;

        // 显示过渡容器
        this.showContainer(this.transitionContainerNode);

        if (!this.transitionDisplay || !this.gameAPI || !this.currentSave) {
            return;
        }

        try {
            // 生成过渡叙事
            const transition = await this.gameAPI.generateTransition(
                this.currentSave.id,
                nodeIndex,
                resultType
            );
            
            // 异步操作完成后，检查组件是否还存在
            if (!this.transitionDisplay || !this.node || !this.node.isValid) {
                console.warn('[GameSceneController] 组件已销毁，放弃过渡叙事显示');
                return;
            }

            // 显示过渡叙事
            this.transitionDisplay.displayTransition(transition);

            // 监听过渡完成事件
            this.transitionDisplay.node.once('transition-completed', this.onTransitionCompleted, this);

        } catch (error) {
            console.error('[GameSceneController] 生成过渡叙事失败:', error);
        }
    }

    /**
     * 过渡叙事完成回调
     */
    private onTransitionCompleted() {
        console.log('[GameSceneController] 过渡叙事完成');
        
        // 检查组件是否还存在
        if (!this.node || !this.node.isValid) {
            console.warn('[GameSceneController] 组件已销毁，放弃过渡完成处理');
            return;
        }

        // 进入 A 卡阶段
        this.startACardPhase();
    }

    /**
     * 开始 A 卡阶段
     */
    private async startACardPhase() {
        console.log('[GameSceneController] 开始 A 卡阶段');
        this.currentPhase = GamePhase.A_CARD;

        // 显示 A 卡容器
        this.showContainer(this.aCardContainerNode);

        if (!this.aCardPanel || !this.gameAPI || !this.currentSave) {
            return;
        }

        try {
            // 获取 A 卡池
            const pool = await this.gameAPI.getACardPool(this.currentSave.id);
            
            // 异步操作完成后，检查组件是否还存在
            if (!this.aCardPanel || !this.node || !this.node.isValid) {
                console.warn('[GameSceneController] 组件已销毁，放弃 A 卡显示');
                return;
            }
            
            // 先设置卡片点击回调（必须在 setACardPool 之前）
            this.aCardPanel.setCardClickCallback(async (card) => {
                await this.onACardSelected(card.id);
            });

            // 显示 A 卡池
            await this.aCardPanel.setACardPool(pool);

        } catch (error) {
            console.error('[GameSceneController] 加载 A 卡池失败:', error);
        }
    }

    /**
     * A 卡选择回调
     */
    private async onACardSelected(cardId: string) {
        console.log('[GameSceneController] 选择 A 卡:', cardId);
        
        if (!this.gameAPI || !this.currentSave) {
            return;
        }
        
        try {
            // 调用 API 选择 A 卡
            const result = await this.gameAPI.selectACard(this.currentSave.id, cardId);
            
            // 异步操作完成后，检查组件是否还存在
            if (!this.node || !this.node.isValid) {
                console.warn('[GameSceneController] 组件已销毁，放弃 A 卡选择处理');
                return;
            }
            
            console.log('[GameSceneController] A 卡选择结果:', result);
            
            // 处理 A 卡完成
            await this.onACardCompleted(result);
            
        } catch (error) {
            console.error('[GameSceneController] 选择 A 卡失败:', error);
        }
    }
    
    /**
     * A 卡完成回调
     */
    private async onACardCompleted(result: any) {
        console.log('[GameSceneController] A 卡阶段完成:', result);
        
        // 检查组件是否还存在
        if (!this.node || !this.node.isValid) {
            console.warn('[GameSceneController] 组件已销毁，放弃 A 卡完成处理');
            return;
        }

        // 更新存档数据
        if (this.currentSave && result.effects) {
            Object.assign(this.currentSave, result.effects);
            this.currentSave.prepTurnsRemaining = result.prepTurnsRemaining;
            console.log('[GameSceneController] A卡完成，更新存档数据:', result.effects);

            // 更新玩家状态面板
            if (this.playerStatsPanel) {
                console.log('[GameSceneController] 正在更新 PlayerStatsPanel...');
                this.playerStatsPanel.updatePlayerState(this.currentSave);
            } else {
                console.error('[GameSceneController] PlayerStatsPanel 组件为 null');
            }
        }

        // 检查是否还有准备回合
        if (this.currentSave && this.currentSave.prepTurnsRemaining > 0) {
            // 继续 A 卡阶段
            await this.startACardPhase();
        } else {
            // A 卡轮结束，进入当前节点的 B 卡
            await this.startBCardPhase();
        }
    }

    /**
     * 显示指定容器，隐藏其他
     */
    private showContainer(containerNode: Node | null) {
        // 隐藏所有容器
        if (this.bCardContainerNode) this.bCardContainerNode.active = false;
        if (this.aCardContainerNode) this.aCardContainerNode.active = false;
        if (this.transitionContainerNode) this.transitionContainerNode.active = false;

        // 显示指定容器
        if (containerNode) {
            containerNode.active = true;
        }
    }

    /**
     * 返回首页
     */
    private returnToHome() {
        console.log('[GameSceneController] 返回首页');
        Navigator.toScene('index');
    }

    /**
     * 显示加载状态
     */
    private showLoading() {
        if (this.loadingNode) this.loadingNode.active = true;
        if (this.errorNode) this.errorNode.active = false;
        this.showContainer(null);
    }

    /**
     * 隐藏加载状态
     */
    private hideLoading() {
        if (this.loadingNode) this.loadingNode.active = false;
    }

    /**
     * 显示错误状态
     */
    private showError() {
        if (this.loadingNode) this.loadingNode.active = false;
        if (this.errorNode) this.errorNode.active = true;
        this.showContainer(null);
    }

    /**
     * 获取当前存档
     */
    getCurrentSave(): PlayerSave | null {
        return this.currentSave;
    }

    /**
     * 获取当前阶段
     */
    getCurrentPhase(): GamePhase {
        return this.currentPhase;
    }

    /**
     * 结算 B 卡（供 BCardDisplayComponent 调用）
     */
    async evaluateBCard(playerId: number, nodeIndex: number, checkResults: any[]): Promise<any> {
        if (!this.gameAPI) {
            throw new Error('GameAPI 未初始化');
        }
        return this.gameAPI.evaluateBCard(playerId, nodeIndex, checkResults);
    }

    // ==================== 场景渲染管理 ====================
    
    /**
     * 渲染图片（无蒙版）
     * @param imageUrl 图片 URL
     */
    async renderImage(imageUrl: string): Promise<void> {
        console.log('[GameSceneController] 渲染图片（无蒙版）:', imageUrl);
        
        // 清理视频播放器
        this.cleanupVideoPlayer();
        
        // 两个 Sprite 始终激活，通过层级切换显示
        // 无蒙版节点在上层（siblingIndex 更大）
        if (this.sceneImageSprite?.node && this.sceneImageWithMaskSprite?.node) {
            // 只交换两个节点的相对层级，不影响其他节点
            const idx1 = this.sceneImageSprite.node.getSiblingIndex();
            const idx2 = this.sceneImageWithMaskSprite.node.getSiblingIndex();
            if (idx1 < idx2) {
                // 无蒙版在下层，需要交换
                this.sceneImageSprite.node.setSiblingIndex(idx2);
                this.sceneImageWithMaskSprite.node.setSiblingIndex(idx1);
            }
        }
        
        // 加载图片
        await this.loadRemoteImage(imageUrl, this.sceneImageSprite);
        this.currentRenderMode = 'image';
    }
    
    /**
     * 渲染图片（有蒙版）
     * @param imageUrl 图片 URL
     */
    async renderImageWithMask(imageUrl: string): Promise<void> {
        console.log('[GameSceneController] 渲染图片（有蒙版）:', imageUrl);
        
        // 清理视频播放器
        this.cleanupVideoPlayer();
        
        // 两个 Sprite 始终激活，通过层级切换显示
        // 有蒙版节点在上层（siblingIndex 更大）
        if (this.sceneImageSprite?.node && this.sceneImageWithMaskSprite?.node) {
            // 只交换两个节点的相对层级，不影响其他节点
            const idx1 = this.sceneImageSprite.node.getSiblingIndex();
            const idx2 = this.sceneImageWithMaskSprite.node.getSiblingIndex();
            if (idx2 < idx1) {
                // 有蒙版在下层，需要交换
                this.sceneImageWithMaskSprite.node.setSiblingIndex(idx1);
                this.sceneImageSprite.node.setSiblingIndex(idx2);
            }
        }
        
        // 加载图片
        await this.loadRemoteImage(imageUrl, this.sceneImageWithMaskSprite);
        this.currentRenderMode = 'image-mask';
    }
    
    /**
     * 渲染视频
     * @param videoUrl 视频 URL
     */
    async renderVideo(videoUrl: string): Promise<void> {
        console.log('[GameSceneController] 渲染视频:', videoUrl);
        
        if (!this.sceneImageSprite?.node) {
            console.error('[GameSceneController] sceneImageSprite 未配置');
            return;
        }
        
        // 1. 先切换层级，让无蒙版节点在上层
        if (this.sceneImageWithMaskSprite?.node) {
            const idx1 = this.sceneImageSprite.node.getSiblingIndex();
            const idx2 = this.sceneImageWithMaskSprite.node.getSiblingIndex();
            if (idx1 < idx2) {
                this.sceneImageSprite.node.setSiblingIndex(idx2);
                this.sceneImageWithMaskSprite.node.setSiblingIndex(idx1);
            }
        }
        
        // 2. 确保 Sprite 有有效的 spriteFrame（防止 UV 错误）
        // 注：VideoTexturePlayer.initVideo() 内部会设置新的 spriteFrame
        if (!this.sceneImageSprite.spriteFrame) {
            console.warn('[GameSceneController] sceneImageSprite.spriteFrame 为 null，创建临时占位');
            const tempTexture = new Texture2D();
            tempTexture.reset({ width: 1, height: 1, format: Texture2D.PixelFormat.RGBA8888 });
            const tempFrame = new SpriteFrame();
            tempFrame.texture = tempTexture;
            this.sceneImageSprite.spriteFrame = tempFrame;
        }
        
        // 3. 获取或添加 VideoTexturePlayer 组件
        this.videoPlayer = this.sceneImageSprite.node.getComponent(VideoTexturePlayer);
        if (!this.videoPlayer) {
            console.log('[GameSceneController] 添加 VideoTexturePlayer 组件');
            this.videoPlayer = this.sceneImageSprite.node.addComponent(VideoTexturePlayer);
            this.videoPlayer.autoPlay = false;
            this.videoPlayer.loop = false;
        }
        
        // 4. 设置视频 URL
        // Loading 由 VideoTexturePlayer.initVideo() 内部处理
        await this.videoPlayer.setVideoUrl(videoUrl);
        this.currentRenderMode = 'video';
    }
    
    /**
     * 播放视频（必须先调用 renderVideo）
     */
    playVideo(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.videoPlayer) {
                reject(new Error('视频播放器未初始化，请先调用 renderVideo'));
                return;
            }
            
            // 播放视频
            this.videoPlayer.play();
            console.log('[GameSceneController] 视频开始播放');
            
            // 监听视频结束
            const videoElement = (this.videoPlayer as any).videoElement as HTMLVideoElement;
            if (videoElement) {
                const onEnded = () => {
                    videoElement.removeEventListener('ended', onEnded);
                    console.log('[GameSceneController] 视频播放完成');
                    resolve();
                };
                videoElement.addEventListener('ended', onEnded);
            } else {
                // 如果没有 video 元素，立即 resolve
                resolve();
            }
        });
    }
    
    /**
     * 停止视频播放
     */
    stopVideo(): void {
        if (this.videoPlayer) {
            this.videoPlayer.stop();
            console.log('[GameSceneController] 视频已停止');
        }
    }
    
    /**
     * 获取当前渲染模式
     */
    getRenderMode(): 'image' | 'image-mask' | 'video' | null {
        return this.currentRenderMode;
    }
    
    /**
     * 切换到带蒙版模式（复用当前的 SpriteFrame）
     * 仅当当前模式为 'image' 时有效
     */
    switchToMask(): void {
        if (this.currentRenderMode !== 'image') {
            console.warn('[GameSceneController] 当前不是 image 模式，无法切换');
            return;
        }
        
        if (!this.sceneImageSprite || !this.sceneImageWithMaskSprite) {
            console.error('[GameSceneController] Sprite 节点未配置');
            return;
        }
        
        // 复用当前的 SpriteFrame
        const spriteFrame = this.sceneImageSprite.spriteFrame;
        if (!spriteFrame) {
            console.warn('[GameSceneController] 当前没有 SpriteFrame');
            return;
        }
        
        console.log('[GameSceneController] 切换到带蒙版模式（复用 SpriteFrame）');
        
        // 获取两个节点的尺寸用于对比
        const normalTransform = this.sceneImageSprite.node?.getComponent('cc.UITransform') as any;
        const maskTransform = this.sceneImageWithMaskSprite.node?.getComponent('cc.UITransform') as any;
        
        console.log('  - 无蒙版节点尺寸:', normalTransform?.width, 'x', normalTransform?.height);
        console.log('  - 有蒙版节点尺寸:', maskTransform?.width, 'x', maskTransform?.height);
        
        // 两个 Sprite 始终激活，通过层级切换显示
        // 只交换两个节点的相对层级，不影响其他节点
        const idx1 = this.sceneImageSprite.node.getSiblingIndex();
        const idx2 = this.sceneImageWithMaskSprite.node.getSiblingIndex();
        if (idx2 < idx1) {
            // 有蒙版在下层，需要交换
            this.sceneImageWithMaskSprite.node.setSiblingIndex(idx1);
            this.sceneImageSprite.node.setSiblingIndex(idx2);
        }
        
        // 设置 spriteFrame
        this.sceneImageWithMaskSprite.spriteFrame = spriteFrame;
        
        // 立即强制设置 sizeMode 为 CUSTOM（spriteFrame 赋值会重置 sizeMode）
        this.sceneImageWithMaskSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        // 再次检查
        if (this.sceneImageWithMaskSprite.sizeMode !== Sprite.SizeMode.CUSTOM) {
            console.error('  - [CRITICAL] SizeMode 仍然不是 CUSTOM，当前值:', this.sceneImageWithMaskSprite.sizeMode);
            // 尝试多次设置
            for (let i = 0; i < 3; i++) {
                this.sceneImageWithMaskSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            }
        }
        
        console.log('  - 切换后 SizeMode:', this.sceneImageWithMaskSprite.sizeMode);
        
        // 锁定节点尺寸，防止被修改
        if (maskTransform) {
            const targetWidth = maskTransform.width;
            const targetHeight = maskTransform.height;
            maskTransform.setContentSize(targetWidth, targetHeight);
            console.log('  - 锁定节点尺寸:', targetWidth, 'x', targetHeight);
        }
        
        // 延迟检查并强制重新设置
        this.scheduleOnce(() => {
            if (this.sceneImageWithMaskSprite) {
                if (this.sceneImageWithMaskSprite.sizeMode !== Sprite.SizeMode.CUSTOM) {
                    console.error('  - [BUG] SizeMode 在下一帧被重置为:', this.sceneImageWithMaskSprite.sizeMode);
                    this.sceneImageWithMaskSprite.sizeMode = Sprite.SizeMode.CUSTOM;
                }
                // 再次锁定尺寸
                const transform = this.sceneImageWithMaskSprite.node?.getComponent('cc.UITransform') as any;
                if (transform) {
                    transform.setContentSize(393, 737);
                }
                console.log('  - 下一帧检查: SizeMode =', this.sceneImageWithMaskSprite.sizeMode, ', 尺寸 =', transform?.width, 'x', transform?.height);
            }
        }, 0);
        
        this.currentRenderMode = 'image-mask';
    }
    
    /**
     * 加载远程图片（带 60 秒超时）
     */
    private loadRemoteImage(url: string, sprite: Sprite | null): Promise<void> {
        const TIMEOUT_MS = 60000; // 60 秒超时
        
        return new Promise((resolve, reject) => {
            if (!sprite) {
                reject(new Error('Sprite 为 null'));
                return;
            }
            
            let isResolved = false;
            const targetNode = sprite.node;
            
            // 显示 Loading
            if (targetNode) showLoading(targetNode);
            
            // 超时处理
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    if (targetNode) hideLoading(targetNode);
                    console.error('[GameSceneController] 加载图片超时 (60s):', url);
                    reject(new Error('图片加载超时'));
                }
            }, TIMEOUT_MS);
            
            assetManager.loadRemote<ImageAsset>(url, (err, imageAsset) => {
                if (isResolved) return; // 已超时，忽略
                isResolved = true;
                clearTimeout(timeoutId);
                
                // 隐藏 Loading
                if (targetNode) hideLoading(targetNode);
                
                if (err) {
                    console.error('[GameSceneController] 加载图片失败:', err);
                    reject(err);
                    return;
                }
                
                // 创建纹理
                const texture = new Texture2D();
                texture.image = imageAsset;
                
                // 创建 SpriteFrame
                const spriteFrame = new SpriteFrame();
                spriteFrame.reset({
                    texture: texture,
                    originalSize: new Size(imageAsset.width, imageAsset.height),
                    rect: new Rect(0, 0, imageAsset.width, imageAsset.height)
                });
                
                // 先设置 sizeMode，再设置 spriteFrame
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = spriteFrame;
                
                // 再次确认 sizeMode
                if (sprite.sizeMode !== Sprite.SizeMode.CUSTOM) {
                    console.warn('[GameSceneController] SizeMode 被覆盖，重新设置');
                    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                }
                
                // 获取节点尺寸用于调试
                const uiTransform = sprite.node?.getComponent('cc.UITransform') as any;
                const nodeWidth = uiTransform?.width || 0;
                const nodeHeight = uiTransform?.height || 0;
                
                console.log('[GameSceneController] 图片加载成功:', url);
                console.log('  - 图片尺寸:', imageAsset.width, 'x', imageAsset.height);
                console.log('  - 节点尺寸:', nodeWidth, 'x', nodeHeight);
                console.log('  - SizeMode:', sprite.sizeMode);
                resolve();
            });
        });
    }
    
    /**
     * 清理视频播放器
     */
    private cleanupVideoPlayer(): void {
        if (this.videoPlayer && this.sceneImageSprite?.node) {
            console.log('[GameSceneController] 清理视频播放器');
            
            // 先停止视频
            try {
                this.videoPlayer.stop();
            } catch (e) {
                // 忽略错误
            }
            
            // 注意: 不要设置 spriteFrame = null
            // Sprite 节点始终 active，设置 null 会导致 UV 错误
            // 下次加载图片时会直接覆盖
            
            // 移除组件
            this.sceneImageSprite.node.removeComponent(this.videoPlayer);
            this.videoPlayer = null;
        }
    }
    
    // ==================== 装备面板管理 ====================
    
    /**
     * 打开装备面板（在当前场景内显示）
     * 可从按钮点击事件调用此方法
     */
    async openInventoryPanel() {
        if (!this.currentSave) {
            console.error('[GameSceneController] 无法打开装备面板：存档数据不存在');
            return;
        }

        trackGameItemsClick();
        
        if (!this.inventoryContainerNode || !this.inventoryPanel) {
            console.error('[GameSceneController] 装备面板未配置');
            return;
        }

        console.log('[GameSceneController] 打开装备面板，玩家ID:', this.currentSave.id);
        
        // 显示装备面板容器
        this.inventoryContainerNode.active = true;
        
        // 初始化装备面板数据
        await this.inventoryPanel.setPlayer(this.currentSave.id);
        
        // 隐藏游戏内容容器（但不销毁）
        if (this.bCardContainerNode) this.bCardContainerNode.active = false;
        if (this.aCardContainerNode) this.aCardContainerNode.active = false;
        if (this.transitionContainerNode) this.transitionContainerNode.active = false;
    }
    
    /**
     * 关闭装备面板
     */
    closeInventoryPanel() {
        if (!this.inventoryContainerNode) {
            return;
        }
        
        console.log('[GameSceneController] 关闭装备面板');
        
        // 隐藏装备面板
        this.inventoryContainerNode.active = false;
        
        // 恢复当前阶段的容器显示
        switch (this.currentPhase) {
            case GamePhase.B_CARD:
                if (this.bCardContainerNode) this.bCardContainerNode.active = true;
                break;
            case GamePhase.A_CARD:
                if (this.aCardContainerNode) this.aCardContainerNode.active = true;
                break;
            case GamePhase.TRANSITION:
                if (this.transitionContainerNode) this.transitionContainerNode.active = true;
                break;
        }
    }

    onDestroy() {
        console.log('[GameSceneController] 销毁场景控制器...');
        
        // 清理事件监听（检查节点是否有效）
        if (this.bCardDisplay && this.bCardDisplay.node && this.bCardDisplay.node.isValid) {
            this.bCardDisplay.node.off('bcard-completed', this.onBCardCompleted, this);
        }
        if (this.transitionDisplay && this.transitionDisplay.node && this.transitionDisplay.node.isValid) {
            this.transitionDisplay.node.off('transition-completed', this.onTransitionCompleted, this);
        }
        if (this.aCardPanel && this.aCardPanel.node && this.aCardPanel.node.isValid) {
            this.aCardPanel.node.off('acard-completed', this.onACardCompleted, this);
        }
        if (this.inventoryPanel && this.inventoryPanel.node && this.inventoryPanel.node.isValid) {
            this.inventoryPanel.node.off('inventory-close', this.closeInventoryPanel, this);
        }
        
        // 清空引用
        this.gameAPI = null;
        this.currentSave = null;
        this.playerStatsPanel = null;
        this.transitionDisplay = null;
        this.aCardPanel = null;
        this.bCardDisplay = null;
        this.roleplayAvatarFrame = null;
        
        // 清空节点引用
        this.playerStatsPanelNode = null;
        this.bCardContainerNode = null;
        this.aCardContainerNode = null;
        this.transitionContainerNode = null;
        this.inventoryContainerNode = null;
        this.loadingNode = null;
        this.errorNode = null;
    }
}
