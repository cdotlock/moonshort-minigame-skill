import { _decorator, Node, Label, Button, Sprite, SpriteFrame,
    assetManager, ImageAsset, Texture2D, Mask, Graphics, UITransform, Color,
    UIOpacity, instantiate, CCInteger, CCString } from 'cc';
import { WndBase } from '../core/WndBase';
import { GameManager } from '../core/GameManager';
import { SceneParams } from '../core/SceneParams';
import { Navigator } from '../core/Navigator';
import { SavesAPI } from '../api/SavesAPI';
import { NovelsAPI } from '../api/NovelsAPI';
import { Novel } from '../types/api.types';
import { Toast } from '../ui/Toast';
import { showLoading, hideLoading } from '../utils/SpriteLoading';

const { ccclass, property, menu } = _decorator;

/**
 * 属性项运行时数据
 */
interface AttrItemRuntime {
    node: Node;
    nameLabel: Label;
    numberLabel: Label;
    increaseBtn: Node | null;
    decreaseBtn: Node | null;
    value: number;
    initialValue: number;
}

/**
 * addPointWnd 根节点控制器
 *
 * 用法：
 * 1. 将此脚本拖到 addPointWnd 根节点上
 * 2. 在 Inspector 中将 attr-item 节点拖到 attrItemTemplate
 * 3. 将 remaining-points 节点拖到 remainingPointsNode
 * 4. 将 btn-start / btn-start-disable 分别拖到对应属性
 * 5. 在 Inspector 中配置 attrNames、attrInitialValues、initialRemainingPoints
 *
 * 运行时自动根据 attrItemTemplate 克隆生成 N 个属性项
 */
@ccclass('AddPointControl')
@menu('WndControl/AddPointControl')
export class AddPointControl extends WndBase {

    // ==================== 节点引用（在 Inspector 中拖拽配置） ====================

    @property({ type: Node, tooltip: '属性项模板节点（attr-item），运行时自动克隆生成多个' })
    attrItemTemplate: Node | null = null;

    @property({ type: Node, tooltip: '剩余点数节点（remaining-points）' })
    remainingPointsNode: Node | null = null;

    @property({ type: Node, tooltip: '开始冒险按钮（激活状态）' })
    btnStart: Node | null = null;

    @property({ type: Node, tooltip: '开始冒险按钮（禁用状态）' })
    btnStartDisable: Node | null = null;

    // ==================== 可配置参数 ====================

    @property({ type: [CCString], tooltip: '属性名称列表' })
    attrNames: string[] = ['Attack', 'Intelligence', 'Charisma', 'Willpower'];

    @property({ type: [CCInteger], tooltip: '各属性初始值（顺序与名称列表对应）' })
    attrInitialValues: number[] = [10, 10, 10, 10];

    @property({ type: CCInteger, tooltip: '初始剩余可分配点数' })
    initialRemainingPoints: number = 5;

    // ==================== 角色显示（可选） ====================

    @property({ type: Sprite, tooltip: '扮演角色头像（可选）' })
    roleplayAvatarSprite: Sprite | null = null;

    @property({ type: Label, tooltip: '扮演角色名称（可选）' })
    roleplayNameLabel: Label | null = null;

    @property({ tooltip: '角色名称前缀' })
    roleplayNamePrefix: string = '';

    @property({ tooltip: '游戏场景名称' })
    gameSceneName: string = 'game';

    // ==================== 运行时状态 ====================

    private attrItems: AttrItemRuntime[] = [];
    private remainingPoints: number = 0;
    private remainingPointsLabel: Label | null = null;
    private novelId: string = '';
    private savesAPI: SavesAPI | null = null;
    private novelsAPI: NovelsAPI | null = null;
    private currentNovel: Novel | null = null;

    /**
     * 场景加载时自动执行（直接放入场景 或 WndManager 实例化后均会触发）
     */
    onLoad() {
        // 初始化 API
        const gameManager = GameManager.getInstance();
        this.savesAPI = new SavesAPI(gameManager.getAPI());
        this.novelsAPI = new NovelsAPI(gameManager.getAPI());

        // 设置头像蒙版
        this.setupAvatarMask();

        // 初始化剩余点数
        this.remainingPoints = this.initialRemainingPoints;
        if (this.remainingPointsNode) {
            this.remainingPointsLabel = this.remainingPointsNode.getComponent(Label);
        }

        // 动态生成属性项
        this.generateAttrItems();

        // 注册底部按钮事件
        this.registerButtonEvents();

        // 初始化显示
        this.updateDisplay();
    }

    /**
     * onLoad 之后执行：若未通过 WndManager 打开，则从 SceneParams 获取 novelId
     */
    start() {
        if (!this.novelId) {
            const params = SceneParams.get<{ novelId?: string }>();
            if (params.novelId) {
                this.novelId = params.novelId;
                console.log('[AddPointControl] 从 SceneParams 获取 novelId:', this.novelId);
                this.loadNovelDetail();
            }
        }
    }

    /**
     * 通过 WndManager.open('addPointWnd', { novelId }) 打开时触发
     */
    protected async onWndOpen(params: Record<string, any>) {
        this.novelId = params.novelId || '';
        if (this.novelId) {
            console.log('[AddPointControl] 从 WndManager 接收 novelId:', this.novelId);
            await this.loadNovelDetail();
        }
    }

    // ==================== 动态生成 ====================

    /**
     * 根据 attrItemTemplate 自动克隆生成 N 个属性项
     * 子节点结构约定：
     *   attr-item
     *     ├── name      (Label: 属性名称)
     *     └── point
     *         ├── icon-decrease  (Button: 减少)
     *         ├── number         (Label: 数值)
     *         └── icon-increase  (Button: 增加)
     */
    private generateAttrItems() {
        if (!this.attrItemTemplate) {
            console.error('[AddPointControl] attrItemTemplate 未配置');
            return;
        }

        const layoutNode = this.attrItemTemplate.parent;
        if (!layoutNode) {
            console.error('[AddPointControl] attrItemTemplate 缺少父节点（layout）');
            return;
        }

        for (let i = 0; i < this.attrNames.length; i++) {
            // 第一个复用模板节点，后续克隆
            const itemNode = i === 0 ? this.attrItemTemplate : instantiate(this.attrItemTemplate);
            if (i > 0) {
                layoutNode.addChild(itemNode);
            }

            // 设置属性名称
            const nameNode = itemNode.getChildByName('name');
            const nameLabel = nameNode?.getComponent(Label) ?? null;
            if (nameLabel) {
                nameLabel.string = this.attrNames[i];
            }

            // 设置属性数值
            const pointNode = itemNode.getChildByName('point');
            const numberNode = pointNode?.getChildByName('number');
            const numberLabel = numberNode?.getComponent(Label) ?? null;
            const initialValue = i < this.attrInitialValues.length ? this.attrInitialValues[i] : 10;
            if (numberLabel) {
                numberLabel.string = initialValue.toString();
            }

            // 获取增减按钮引用
            const increaseBtn = pointNode?.getChildByName('icon-increase') ?? null;
            const decreaseBtn = pointNode?.getChildByName('icon-decrease') ?? null;

            // 为增减按钮添加 UIOpacity（用于禁用态视觉反馈）
            for (const btn of [increaseBtn, decreaseBtn]) {
                if (btn && !btn.getComponent(UIOpacity)) {
                    btn.addComponent(UIOpacity).opacity = 255;
                }
            }

            // 清除模板上可能残留的旧 ClickEvent，并修正 Button.target 指向自身
            for (const btn of [increaseBtn, decreaseBtn]) {
                if (btn) {
                    const buttonComp = btn.getComponent(Button);
                    if (buttonComp) {
                        buttonComp.clickEvents = [];
                        buttonComp.target = btn;
                    }
                }
            }

            // 注册点击事件（闭包捕获索引）
            const idx = i;
            if (increaseBtn) {
                increaseBtn.on('click', () => this.increase(idx), this);
            }
            if (decreaseBtn) {
                decreaseBtn.on('click', () => this.decrease(idx), this);
            }

            this.attrItems.push({
                node: itemNode,
                nameLabel: nameLabel!,
                numberLabel: numberLabel!,
                increaseBtn,
                decreaseBtn,
                value: initialValue,
                initialValue,
            });
        }

        console.log(`[AddPointControl] 生成 ${this.attrItems.length} 个属性项`);
    }

    /**
     * 注册底部按钮事件
     */
    private registerButtonEvents() {
        // btn-start: 提交（清除旧事件，改用代码注册）
        if (this.btnStart) {
            const btn = this.btnStart.getComponent(Button);
            if (btn) {
                btn.clickEvents = [];
            }
            this.btnStart.on('click', () => this.submit(), this);
        }

        // btn-start-disable: 弹出 Toast 提示（无 Button 组件，使用 touch 事件）
        if (this.btnStartDisable) {
            this.btnStartDisable.on(Node.EventType.TOUCH_END, this.onDisabledBtnClick, this);
        }
    }

    // ==================== 加减操作 ====================

    private increase(index: number) {
        if (index < 0 || index >= this.attrItems.length) return;
        if (this.remainingPoints <= 0) {
            Toast.show('超过限制，无法调整');
            return;
        }

        this.attrItems[index].value++;
        this.remainingPoints--;
        this.updateDisplay();
    }

    private decrease(index: number) {
        if (index < 0 || index >= this.attrItems.length) return;
        if (this.attrItems[index].value <= this.attrItems[index].initialValue) {
            Toast.show('超过限制，无法调整');
            return;
        }

        this.attrItems[index].value--;
        this.remainingPoints++;
        this.updateDisplay();
    }

    // ==================== 显示更新 ====================

    private updateDisplay() {
        // 更新各属性数值
        for (const item of this.attrItems) {
            if (item.numberLabel) {
                item.numberLabel.string = item.value.toString();
            }
        }

        // 更新剩余点数
        if (this.remainingPointsLabel) {
            this.remainingPointsLabel.string = `Remaining points: ${this.remainingPoints}`;
        }

        // 更新按钮状态
        this.updateButtonStates();
    }

    /**
     * 更新按钮状态：increase/decrease 用透明度，submit 用双节点切换
     */
    private updateButtonStates() {
        // increase 按钮：剩余点数 > 0 时 100%，否则 60%
        const increaseOpacity = this.remainingPoints > 0 ? 255 : 153;
        for (const item of this.attrItems) {
            if (item.increaseBtn) {
                const op = item.increaseBtn.getComponent(UIOpacity);
                if (op) op.opacity = increaseOpacity;
            }
        }

        // decrease 按钮：属性值 > 初始值时 100%，否则 60%
        for (const item of this.attrItems) {
            if (item.decreaseBtn) {
                const canDecrease = item.value > item.initialValue;
                const op = item.decreaseBtn.getComponent(UIOpacity);
                if (op) op.opacity = canDecrease ? 255 : 153;
            }
        }

        // submit 按钮：remaining === 0 显示 btn-start，否则显示 btn-start-disable
        const canSubmit = this.remainingPoints === 0;
        if (this.btnStart) this.btnStart.active = canSubmit;
        if (this.btnStartDisable) this.btnStartDisable.active = !canSubmit;
    }

    // ==================== 按钮事件 ====================

    /**
     * 禁用按钮点击 → Toast 提示
     */
    private onDisabledBtnClick() {
        Toast.show('请您分配剩余的属性。');
    }

    /**
     * 提交属性分配，创建存档并跳转到游戏
     */
    async submit() {
        if (this.remainingPoints > 0) {
            Toast.show('请您分配剩余的属性。');
            return;
        }

        if (!this.savesAPI) {
            console.error('[AddPointControl] savesAPI 未初始化');
            return;
        }

        try {
            const newSave = await this.savesAPI.create(
                this.novelId,
                this.attrItems[0]?.value ?? 10,
                this.attrItems[1]?.value ?? 10,
                this.attrItems[2]?.value ?? 10,
                this.attrItems[3]?.value ?? 10
            );

            console.log('[AddPointControl] 存档创建成功:', newSave.id);

            SceneParams.set({
                saveId: parseInt(newSave.id),
                novelId: this.novelId
            });

            Navigator.toScene(this.gameSceneName);
        } catch (error) {
            console.error('[AddPointControl] 创建存档失败:', error);
        }
    }

    /**
     * 重置属性分配
     */
    reset() {
        for (const item of this.attrItems) {
            item.value = item.initialValue;
        }
        this.remainingPoints = this.initialRemainingPoints;
        this.updateDisplay();
    }

    // ==================== 角色信息加载 ====================

    private async loadNovelDetail() {
        if (!this.novelsAPI) return;

        try {
            const novel = await this.novelsAPI.getDetail(this.novelId);
            this.currentNovel = novel;

            if (this.roleplayNameLabel && novel.roleplayCharacterName) {
                const displayName = this.roleplayNamePrefix
                    ? this.roleplayNamePrefix + novel.roleplayCharacterName
                    : novel.roleplayCharacterName;
                this.roleplayNameLabel.string = displayName;
            }

            if (novel.roleplayCharacterAvatar) {
                await this.loadRoleplayAvatar(novel.roleplayCharacterAvatar);
            }
        } catch (error) {
            console.error('[AddPointControl] 加载小说详情失败:', error);
        }
    }

    private loadRoleplayAvatar(avatarUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.roleplayAvatarSprite) { resolve(); return; }

            const avatarNode = this.roleplayAvatarSprite.node;
            if (avatarNode) showLoading(avatarNode, { showMask: false });

            assetManager.loadRemote<ImageAsset>(avatarUrl, (err, imageAsset) => {
                if (avatarNode) hideLoading(avatarNode);

                if (err) {
                    console.error('[AddPointControl] 头像加载失败:', err);
                    reject(err);
                    return;
                }

                const spriteFrame = new SpriteFrame();
                const texture = new Texture2D();
                texture.image = imageAsset;
                spriteFrame.texture = texture;
                this.roleplayAvatarSprite!.spriteFrame = spriteFrame;
                resolve();
            });
        });
    }

    private setupAvatarMask() {
        if (!this.roleplayAvatarSprite) return;

        const spriteNode = this.roleplayAvatarSprite.node;
        const parentNode = spriteNode.parent;
        if (!parentNode) return;

        let mask = parentNode.getComponent(Mask);
        if (!mask) mask = parentNode.addComponent(Mask);
        mask.type = Mask.Type.GRAPHICS_STENCIL;

        let graphics = parentNode.getComponent(Graphics);
        if (!graphics) graphics = parentNode.addComponent(Graphics);

        const transform = parentNode.getComponent(UITransform);
        if (!transform) return;

        const radius = Math.min(transform.width, transform.height) / 2;
        graphics.clear();
        graphics.fillColor = Color.WHITE;
        graphics.circle(0, 0, radius);
        graphics.fill();
    }
}
