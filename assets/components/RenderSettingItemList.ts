import { _decorator, Component, Prefab, Node, instantiate, SpriteFrame, Enum } from 'cc';
import { RenderSettingItem, ClickMode } from './RenderSettingItem';

const { ccclass, property, menu } = _decorator;

@ccclass('SettingItemData')
export class SettingItemData {
    @property({ type: SpriteFrame, tooltip: '图标 SpriteFrame' })
    icon: SpriteFrame | null = null;

    @property({ tooltip: '标题' })
    title: string = '';

    @property({ tooltip: '跳转场景名称' })
    sceneName: string = '';

    @property({ type: Enum(ClickMode), tooltip: '点击行为' })
    clickMode: ClickMode = ClickMode.Auto;

    @property({ type: [Component.EventHandler], tooltip: '点击事件（同 Button 的 ClickEvents）' })
    clickEvents: Component.EventHandler[] = [];
}

@ccclass('RenderSettingItemList')
@menu('Components/RenderSettingItemList')
export class RenderSettingItemList extends Component {
    @property({ type: Prefab, tooltip: 'SettingItem 预制体（根节点需挂 RenderSettingItem）' })
    itemPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '内容容器（为空则使用当前节点）' })
    content: Node | null = null;

    @property({ type: [SettingItemData], tooltip: '设置项列表数据' })
    items: SettingItemData[] = [];

    @property({ tooltip: '启动时自动渲染' })
    autoRender: boolean = true;

    onLoad() {
        if (this.autoRender) {
            this.renderList(this.items);
        }
    }

    renderList(list: SettingItemData[]) {
        const parent = this.content ?? this.node;
        if (!this.itemPrefab) {
            console.warn('[RenderSettingItemList] itemPrefab 未设置');
            return;
        }
        // 清空旧内容
        parent.removeAllChildren();

        list.forEach((item) => {
            const node = instantiate(this.itemPrefab!);
            const comp = node.getComponent(RenderSettingItem);
            if (!comp) {
                console.warn('[RenderSettingItemList] Prefab 根节点缺少 RenderSettingItem');
                node.destroy();
                return;
            }
            comp.render(item.icon, item.title, item.sceneName, item.clickMode, item.clickEvents);
            node.setParent(parent);
        });
    }
}
