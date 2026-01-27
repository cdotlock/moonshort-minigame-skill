import { _decorator, Component, Node, Sprite, SpriteFrame, Label, director, NodeEventType, Enum, EventTouch } from 'cc';
import { trackSettingsClick } from '../analytics/UiEvents';
const { ccclass, property, menu, executeInEditMode } = _decorator;

export enum ClickMode {
    Auto = 0,           // 有事件就触发事件，否则跳场景
    EventsOnly = 1,     // 只触发事件
    SceneOnly = 2,      // 只跳场景
    EventsThenScene = 3 // 先事件后跳场景
}

@ccclass('RenderSettingItem')
@menu('Components/RenderSettingItem')
@executeInEditMode(true)
export class RenderSettingItem extends Component {
    @property({ type: Node, tooltip: 'Icon 节点（带 Sprite）' })
    iconNode: Node | null = null;

    @property({ type: SpriteFrame, tooltip: 'Icon 图片（可选，未设置则保留原图）' })
    get iconSpriteFrame(): SpriteFrame | null { return this._iconSpriteFrame; }
    set iconSpriteFrame(value: SpriteFrame | null) {
        this._iconSpriteFrame = value;
        this.setIcon(value);
    }

    @property({ type: Label, tooltip: '标题 Label' })
    titleLabel: Label | null = null;

    @property({ tooltip: '跳转场景名称（需在 Build Settings 中存在）' })
    sceneName: string = '';
    @property({ type: Enum(ClickMode), tooltip: '点击行为' })
    clickMode: ClickMode = ClickMode.Auto;

    @property({ type: [Component.EventHandler], tooltip: '点击事件（同 Button 的 ClickEvents）' })
    clickEvents: Component.EventHandler[] = [];

    @property({ type: Node, tooltip: '点击区域（为空则使用当前节点）' })
    clickTarget: Node | null = null;

    private _loading: boolean = false;
    private _title: string = '';

    @property
    private _iconSpriteFrame: SpriteFrame | null = null;

    onLoad() {
        if (this._iconSpriteFrame) {
            this.setIcon(this._iconSpriteFrame);
        }
    }

    onEnable() {
        const target = this.clickTarget ?? this.node;
        target.on(NodeEventType.TOUCH_END, this.onClick, this);
    }

    onDisable() {
        const target = this.clickTarget ?? this.node;
        target.off(NodeEventType.TOUCH_END, this.onClick, this);
    }

    /**
     * 渲染设置项
     */
    render(icon: SpriteFrame | null, title: string, sceneName: string, clickMode?: ClickMode, clickEvents?: Component.EventHandler[]) {
        this.setIcon(icon);
        this.setTitle(title);
        this._title = title ?? '';
        this.sceneName = sceneName ?? '';
        if (clickMode !== undefined) {
            this.clickMode = clickMode;
        }
        if (clickEvents !== undefined) {
            this.clickEvents = clickEvents;
        }
    }

    setIcon(icon: SpriteFrame | null) {
        const sprite = this.getIconSprite();
        if (!sprite) return;
        sprite.spriteFrame = icon;
    }

    setTitle(title: string) {
        if (!this.titleLabel) return;
        this.titleLabel.string = title ?? '';
    }

    private getIconSprite(): Sprite | null {
        if (this.iconNode) {
            return this.iconNode.getComponent(Sprite);
        }
        // 自动兜底：优先找名为 Icon 的子节点，否则取第一个 Sprite
        const iconChild = this.node.getChildByName('Icon');
        if (iconChild) {
            this.iconNode = iconChild;
            return iconChild.getComponent(Sprite);
        }
        const sprite = this.node.getComponentInChildren(Sprite);
        if (sprite) {
            this.iconNode = sprite.node;
            return sprite;
        }
        return null;
    }

    private onClick(event: EventTouch) {
        if (this._loading) return;
        const name = this.sceneName?.trim();
        const hasEvents = this.clickEvents && this.clickEvents.length > 0;
        const elementId = this.getSettingsElementId();
        if (elementId) {
            trackSettingsClick(elementId);
        }

        switch (this.clickMode) {
            case ClickMode.EventsOnly:
                if (hasEvents) Component.EventHandler.emitEvents(this.clickEvents, event);
                return;
            case ClickMode.SceneOnly:
                if (name) this.loadScene(name);
                return;
            case ClickMode.EventsThenScene:
                if (hasEvents) Component.EventHandler.emitEvents(this.clickEvents, event);
                if (name) this.loadScene(name);
                return;
            case ClickMode.Auto:
            default:
                if (hasEvents) {
                    Component.EventHandler.emitEvents(this.clickEvents, event);
                } else if (name) {
                    this.loadScene(name);
                } else {
                    console.warn('[RenderSettingItem] 未配置点击事件或场景');
                }
                return;
        }
    }

    private loadScene(name: string) {
        this._loading = true;
        director.loadScene(name, () => {
            this._loading = false;
        });
    }

    private getSettingsElementId(): 'invite_friends' | null {
        const title = (this._title || this.titleLabel?.string || '').trim().toLowerCase();
        if (!title) return null;
        if (title === 'invite friends' || title === 'invite_friend' || title === 'invite_friends') {
            return 'invite_friends';
        }
        return null;
    }
}
