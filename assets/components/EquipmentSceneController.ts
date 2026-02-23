import { _decorator, Component, Node, Button } from 'cc';
import { SceneParams } from '../scripts/core/SceneParams';
import { Navigator } from '../scripts/core/Navigator';
import { InventoryPanel } from './InventoryPanel';
import { PlayerSave } from '../scripts/types/game.types';

const { ccclass, property, menu } = _decorator;

/**
 * 装备场景控制器
 * 负责管理装备场景的初始化和数据传递
 * 
 * 节点结构：
 * EquipmentSceneRoot
 * ├── InventoryPanel - 装备面板组件
 * └── BackButton - 返回按钮
 */
@ccclass('EquipmentSceneController')
@menu('Components/EquipmentSceneController')
export class EquipmentSceneController extends Component {
    @property({ type: Node, tooltip: '装备面板节点（包含 InventoryPanel 组件）' })
    inventoryPanelNode: Node | null = null;
    
    @property({ type: Node, tooltip: '返回按钮节点' })
    backButtonNode: Node | null = null;
    
    // 私有属性
    private inventoryPanel: InventoryPanel | null = null;
    private playerId: number = 0;
    private saveData: PlayerSave | null = null;
    
    async onLoad() {
        // 获取场景参数
        const params = SceneParams.get<{ playerId?: number, saveData?: PlayerSave }>(true);
        
        if (!params.playerId) {
            console.error('[EquipmentSceneController] 缺少 playerId 参数');
            this.returnToGame();
            return;
        }
        
        this.playerId = params.playerId;
        this.saveData = params.saveData || null;
        
        // 查找装备面板组件
        if (this.inventoryPanelNode) {
            this.inventoryPanel = this.inventoryPanelNode.getComponent(InventoryPanel);
            
            if (!this.inventoryPanel) {
                this.inventoryPanel = this.inventoryPanelNode.getComponentInChildren(InventoryPanel);
            }
            
            if (this.inventoryPanel) {
                try {
                    await this.inventoryPanel.setPlayer(this.playerId);
                } catch (error) {
                    console.error('[EquipmentSceneController] 初始化失败:', error);
                }
            } else {
                console.error('[EquipmentSceneController] 未找到 InventoryPanel 组件');
            }
        } else {
            console.error('[EquipmentSceneController] inventoryPanelNode 未配置');
        }
        
        // 绑定返回按钮事件
        if (this.backButtonNode) {
            // 自动添加 Button 组件（如果没有）
            let button = this.backButtonNode.getComponent(Button);
            if (!button) {
                button = this.backButtonNode.addComponent(Button);
            }
            
            this.backButtonNode.on('click', this.onBackButtonClick, this);
        }
    }
    
    /**
     * 返回按钮点击事件
     */
    private onBackButtonClick() {
        this.returnToGame();
    }
    
    /**
     * 返回游戏场景
     */
    private returnToGame() {
        console.log('[EquipmentSceneController] 返回游戏场景');
        
        // 获取传入的缓存数据
        const params = SceneParams.get<{ cachedSave?: PlayerSave, cachedPhase?: GamePhase }>(false);
        
        // 设置返回标记和缓存数据
        SceneParams.set({
            returnFromInventory: true,
            cachedSave: params.cachedSave,
            cachedPhase: params.cachedPhase
        });
        
        // 返回游戏场景
        Navigator.toScene('game');
    }
    
    /**
     * 获取当前装备面板
     */
    getInventoryPanel(): InventoryPanel | null {
        return this.inventoryPanel;
    }
    
    /**
     * 获取玩家ID
     */
    getPlayerId(): number {
        return this.playerId;
    }
    
    /**
     * 获取存档数据
     */
    getSaveData(): PlayerSave | null {
        return this.saveData;
    }
    
    onDestroy() {
        // 清理事件（检查节点是否有效）
        if (this.backButtonNode && this.backButtonNode.isValid) {
            this.backButtonNode.off('click', this.onBackButtonClick, this);
        }
        
        // 清空引用
        this.inventoryPanel = null;
        this.inventoryPanelNode = null;
        this.backButtonNode = null;
        this.saveData = null;
    }
}
