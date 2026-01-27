import { _decorator, Component, Label, director, Node, UIOpacity, Sprite, assetManager, ImageAsset, Texture2D, SpriteFrame, Mask, Graphics, Color, UITransform } from 'cc';
import { SceneParams } from '../scripts/core/SceneParams';
import { GameManager } from '../scripts/core/GameManager';
import { SavesAPI } from '../scripts/api/SavesAPI';
import { NovelsAPI } from '../scripts/api/NovelsAPI';
import { Novel } from '../scripts/types/api.types';

const { ccclass, property, menu } = _decorator;

/**
 * 属性分配组件
 * 用于在创建新存档前分配角色属性
 * 
 * 默认属性值：combat=15, intelligence=14, charisma=13, will=12
 * 可分配点数：2
 */
@ccclass('AddPointComponent')
@menu('Components/AddPointComponent')
export class AddPointComponent extends Component {
    // 属性值显示的 Label
    @property({ type: Label, tooltip: '战斗力数值显示' })
    combatLabel: Label | null = null;

    @property({ type: Label, tooltip: '智力数值显示' })
    intelligenceLabel: Label | null = null;

    @property({ type: Label, tooltip: '魅力数值显示' })
    charismaLabel: Label | null = null;

    @property({ type: Label, tooltip: '意志数值显示' })
    willLabel: Label | null = null;

    @property({ type: Label, tooltip: '剩余点数显示' })
    remainingPointsLabel: Label | null = null;

    // 扮演角色显示
    @property({ type: Sprite, tooltip: '扮演角色头像（自动添加圆角蒙版）' })
    roleplayAvatarSprite: Sprite | null = null;

    @property({ type: Label, tooltip: '扮演角色名称' })
    roleplayNameLabel: Label | null = null;

    @property({ tooltip: '角色名称前缀（如 "Your Character: "）' })
    roleplayNamePrefix: string = '';

    // 增加按钮
    @property({ type: Node, tooltip: '增加战斗力按钮' })
    combatIncreaseBtn: Node | null = null;

    @property({ type: Node, tooltip: '增加智力按钮' })
    intelligenceIncreaseBtn: Node | null = null;

    @property({ type: Node, tooltip: '增加魅力按钮' })
    charismaIncreaseBtn: Node | null = null;

    @property({ type: Node, tooltip: '增加意志按钮' })
    willIncreaseBtn: Node | null = null;

    // 减少按钮
    @property({ type: Node, tooltip: '减少战斗力按钮' })
    combatDecreaseBtn: Node | null = null;

    @property({ type: Node, tooltip: '减少智力按钮' })
    intelligenceDecreaseBtn: Node | null = null;

    @property({ type: Node, tooltip: '减少魅力按钮' })
    charismaDecreaseBtn: Node | null = null;

    @property({ type: Node, tooltip: '减少意志按钮' })
    willDecreaseBtn: Node | null = null;

    // 提交按钮
    @property({ type: Node, tooltip: '开始冒险按钮' })
    submitBtn: Node | null = null;

    @property({ type: Node, tooltip: '开始冒险按钮（禁用）' })
    submitBtnDisabled: Node | null = null;

    @property({ tooltip: '游戏场景名称' })
    gameSceneName: string = 'game';

    // 属性值（索引0=combat, 1=intelligence, 2=charisma, 3=will）
    private stats: number[] = [15, 14, 13, 12];
    private initialValues: number[] = [15, 14, 13, 12];
    private remainingPoints: number = 2;
    private novelId: string = '';
    private savesAPI: SavesAPI | null = null;
    private novelsAPI: NovelsAPI | null = null;
    private currentNovel: Novel | null = null;
    
    private increaseButtons: (Node | null)[] = [];
    private decreaseButtons: (Node | null)[] = [];

    async onLoad() {
        // 初始化 API
        const gameManager = GameManager.getInstance();
        this.savesAPI = new SavesAPI(gameManager.getAPI());
        this.novelsAPI = new NovelsAPI(gameManager.getAPI());

        // 获取场景参数
        const params = SceneParams.get<{ novelId?: string }>();
        
        if (!params.novelId) {
            console.error('[AddPointComponent] 缺少 novelId 参数');
            return;
        }

        this.novelId = params.novelId;
        console.log('[AddPointComponent] 接收到 novelId:', this.novelId);

        // 加载小说详情（获取角色信息）
        await this.loadNovelDetail();

        // 为头像设置圆角蒙版
        this.setupAvatarMask();
        
        // 初始化按钮数组
        this.increaseButtons = [
            this.combatIncreaseBtn,
            this.intelligenceIncreaseBtn,
            this.charismaIncreaseBtn,
            this.willIncreaseBtn
        ];
        this.decreaseButtons = [
            this.combatDecreaseBtn,
            this.intelligenceDecreaseBtn,
            this.charismaDecreaseBtn,
            this.willDecreaseBtn
        ];
        
        // 为 increase/decrease 按钮添加 UIOpacity 组件
        this.initButtonOpacity();
        
        // 检查 Label 配置
        console.log('[AddPointComponent] Label 配置检查:', {
            combatLabel: !!this.combatLabel,
            intelligenceLabel: !!this.intelligenceLabel,
            charismaLabel: !!this.charismaLabel,
            willLabel: !!this.willLabel,
            remainingPointsLabel: !!this.remainingPointsLabel
        });

        // 初始化显示
        this.updateDisplay();
    }

    /**
     * 加载小说详情
     */
    private async loadNovelDetail() {
        if (!this.novelsAPI) {
            return;
        }

        try {
            console.log('[AddPointComponent] 加载小说详情...');
            const novel = await this.novelsAPI.getDetail(this.novelId);
            this.currentNovel = novel;
            console.log('[AddPointComponent] 小说详情:', novel);

            // 设置角色名称（带前缀）
            if (this.roleplayNameLabel && novel.roleplayCharacterName) {
                const displayName = this.roleplayNamePrefix 
                    ? this.roleplayNamePrefix + novel.roleplayCharacterName 
                    : novel.roleplayCharacterName;
                this.roleplayNameLabel.string = displayName;
                console.log('[AddPointComponent] 设置角色名称:', displayName);
            }

            // 加载角色头像
            if (novel.roleplayCharacterAvatar) {
                await this.loadRoleplayAvatar(novel.roleplayCharacterAvatar);
            }
        } catch (error) {
            console.error('[AddPointComponent] 加载小说详情失败:', error);
        }
    }

    /**
     * 加载扮演角色头像
     */
    private loadRoleplayAvatar(avatarUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.roleplayAvatarSprite) {
                resolve();
                return;
            }

            console.log('[AddPointComponent] 加载角色头像:', avatarUrl);

            assetManager.loadRemote<ImageAsset>(avatarUrl, (err, imageAsset) => {
                if (err) {
                    console.error('[AddPointComponent] 头像加载失败:', err);
                    reject(err);
                    return;
                }

                const spriteFrame = new SpriteFrame();
                const texture = new Texture2D();
                texture.image = imageAsset;
                spriteFrame.texture = texture;

                this.roleplayAvatarSprite!.spriteFrame = spriteFrame;
                console.log('[AddPointComponent] 头像设置成功');
                resolve();
            });
        });
    }

    /**
     * 为头像设置圆角蒙版
     */
    private setupAvatarMask() {
        if (!this.roleplayAvatarSprite) {
            return;
        }

        const spriteNode = this.roleplayAvatarSprite.node;
        const parentNode = spriteNode.parent;
        
        if (!parentNode) {
            return;
        }
        
        // 在父节点上添加 Mask 组件
        let mask = parentNode.getComponent(Mask);
        if (!mask) {
            mask = parentNode.addComponent(Mask);
        }
        
        // 设置 Mask 类型为 Graphics
        mask.type = Mask.Type.GRAPHICS_STENCIL;
        
        // 在父节点上添加 Graphics 组件
        let graphics = parentNode.getComponent(Graphics);
        if (!graphics) {
            graphics = parentNode.addComponent(Graphics);
        }
        
        // 获取父节点尺寸
        const transform = parentNode.getComponent(UITransform);
        if (!transform) {
            return;
        }
        
        // 绘制圆形（以节点中心为圆心）
        const radius = Math.min(transform.width, transform.height) / 2;
        graphics.clear();
        graphics.fillColor = Color.WHITE;
        graphics.circle(0, 0, radius);
        graphics.fill();
        
        console.log(`[AddPointComponent] 已为头像设置圆角蒙版，半径: ${radius}`);
    }

    /**
     * 为 increase/decrease按钮添加 UIOpacity 组件
     */
    private initButtonOpacity() {
        // 为 increase按钮添加 UIOpacity
        for (const btn of this.increaseButtons) {
            if (btn && !btn.getComponent(UIOpacity)) {
                const opacity = btn.addComponent(UIOpacity);
                opacity.opacity = 255;
            }
        }
        
        // 为 decrease按钮添加 UIOpacity
        for (const btn of this.decreaseButtons) {
            if (btn && !btn.getComponent(UIOpacity)) {
                const opacity = btn.addComponent(UIOpacity);
                opacity.opacity = 255;
            }
        }
    }

    /**
     * 更新所有数值显示
     */
    private updateDisplay() {
        // 更新属性值
        if (this.combatLabel) {
            this.combatLabel.string = this.stats[0].toString();
            console.log('[AddPointComponent] 设置 combatLabel:', this.stats[0]);
        } else {
            console.warn('[AddPointComponent] combatLabel 未配置');
        }
        
        if (this.intelligenceLabel) {
            this.intelligenceLabel.string = this.stats[1].toString();
            console.log('[AddPointComponent] 设置 intelligenceLabel:', this.stats[1]);
        } else {
            console.warn('[AddPointComponent] intelligenceLabel 未配置');
        }
        
        if (this.charismaLabel) {
            this.charismaLabel.string = this.stats[2].toString();
            console.log('[AddPointComponent] 设置 charismaLabel:', this.stats[2]);
        } else {
            console.warn('[AddPointComponent] charismaLabel 未配置');
        }
        
        if (this.willLabel) {
            this.willLabel.string = this.stats[3].toString();
            console.log('[AddPointComponent] 设置 willLabel:', this.stats[3]);
        } else {
            console.warn('[AddPointComponent] willLabel 未配置');
        }

        // 更新剩余点数
        if (this.remainingPointsLabel) {
            this.remainingPointsLabel.string = `Remaining points: ${this.remainingPoints}`;
            console.log('[AddPointComponent] 设置 remainingPointsLabel:', this.remainingPoints);
        } else {
            console.warn('[AddPointComponent] remainingPointsLabel 未配置');
        }

        console.log('[AddPointComponent] 属性值:', {
            combat: this.stats[0],
            intelligence: this.stats[1],
            charisma: this.stats[2],
            will: this.stats[3],
            remaining: this.remainingPoints
        });
        
        // 更新按钮状态
        this.updateButtonStates();
    }
    
    /**
     * 更新按钮状态：increase/decrease用透明度，submit用双节点
     */
    private updateButtonStates() {
        // 更新 increase 按钮：剩余点数>0时100%，否则60%
        const increaseOpacity = this.remainingPoints > 0 ? 255 : 153; // 153 = 255 * 0.6
        for (const btn of this.increaseButtons) {
            if (btn) {
                const uiOpacity = btn.getComponent(UIOpacity);
                if (uiOpacity) {
                    uiOpacity.opacity = increaseOpacity;
                }
            }
        }
        
        // 更新 decrease 按钮：当属性值>初始值时100%，否则60%
        for (let i = 0; i < this.decreaseButtons.length; i++) {
            const btn = this.decreaseButtons[i];
            if (btn) {
                const canDecrease = this.stats[i] > this.initialValues[i];
                const decreaseOpacity = canDecrease ? 255 : 153;
                const uiOpacity = btn.getComponent(UIOpacity);
                if (uiOpacity) {
                    uiOpacity.opacity = decreaseOpacity;
                }
            }
        }
        
        // 更新 submit 按钮：分配点数=0时显示正常，否则显示禁用
        const canSubmit = this.remainingPoints === 0;
        if (this.submitBtn) {
            this.submitBtn.active = canSubmit;
        }
        if (this.submitBtnDisabled) {
            this.submitBtnDisabled.active = !canSubmit;
        }
    }

    /**
     * 增加指定属性的点数
     * @param index 属性索引（0=combat, 1=intelligence, 2=charisma, 3=will）
     * 
     * 使用方法：在按钮的 Click Events 中，CustomEventData 填写 "0", "1", "2", 或 "3"
     */
    increase(event: any, customEventData: string) {
        const index = parseInt(customEventData);
        
        if (isNaN(index) || index < 0 || index >= 4) {
            console.error('[AddPointComponent] 无效的属性索引:', customEventData);
            return;
        }

        if (this.remainingPoints <= 0) {
            console.warn('[AddPointComponent] 没有剩余点数可分配');
            return;
        }
        
        // 防止属性值超过17
        if (this.stats[index] >= 17) {
            console.warn('[AddPointComponent] 属性值已达到上限 17');
            return;
        }

        // 增加属性点
        this.stats[index]++;
        this.remainingPoints--;

        console.log('[AddPointComponent] 增加属性', index, '当前值:', this.stats[index]);
        this.updateDisplay();
    }

    /**
     * 减少指定属性的点数
     * @param index 属性索引（0=combat, 1=intelligence, 2=charisma, 3=will）
     * 
     * 使用方法：在按钮的 Click Events 中，CustomEventData 填写 "0", "1", "2", 或 "3"
     */
    decrease(event: any, customEventData: string) {
        const index = parseInt(customEventData);
        
        if (isNaN(index) || index < 0 || index >= 4) {
            console.error('[AddPointComponent] 无效的属性索引:', customEventData);
            return;
        }

        // 防止减少到初始值以下
        if (this.stats[index] <= this.initialValues[index]) {
            console.warn('[AddPointComponent] 属性值不能低于初始值');
            return;
        }

        // 减少属性点
        this.stats[index]--;
        this.remainingPoints++;

        console.log('[AddPointComponent] 减少属性', index, '当前值:', this.stats[index]);
        this.updateDisplay();
    }

    /**
     * 提交属性分配，创建存档并跳转到游戏
     * 
     * 使用方法：在"开始冒险"按钮的 Click Events 中绑定此方法
     */
    async submit() {
        console.log('[AddPointComponent] 提交属性分配');

        if (this.remainingPoints > 0) {
            console.warn('[AddPointComponent] 还有剩余点数未分配:', this.remainingPoints);
            // TODO: 显示提示：还有点数未分配，是否继续？
        }

        if (!this.savesAPI) {
            console.error('[AddPointComponent] savesAPI 未初始化');
            return;
        }

        try {
            console.log('[AddPointComponent] 创建存档，属性值:', {
                combat: this.stats[0],
                intelligence: this.stats[1],
                charisma: this.stats[2],
                will: this.stats[3]
            });

            // 创建存档，传入属性值
            const newSave = await this.savesAPI.create(
                this.novelId,
                this.stats[0],  // combat
                this.stats[1],  // intelligence
                this.stats[2],  // charisma
                this.stats[3]   // will
            );

            console.log('[AddPointComponent] 存档创建成功:', newSave.id);

            // 设置场景参数
            SceneParams.set({ 
                saveId: parseInt(newSave.id),
                novelId: this.novelId 
            });

            console.log('[AddPointComponent] 跳转到游戏场景');

            // 跳转到游戏场景
            director.loadScene(this.gameSceneName);

        } catch (error) {
            console.error('[AddPointComponent] 创建存档失败:', error);
            // TODO: 显示错误提示
        }
    }

    /**
     * 重置属性分配
     * 
     * 使用方法：在"重置"按钮的 Click Events 中绑定此方法（可选）
     */
    reset() {
        console.log('[AddPointComponent] 重置属性分配');
        this.stats = [15, 14, 13, 12];
        this.remainingPoints = 2;
        this.updateDisplay();
    }
}
