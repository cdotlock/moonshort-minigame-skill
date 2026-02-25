import { _decorator, Node } from 'cc';
import { WndBase } from '../core/WndBase';
import { HistoryList } from '../../components/HistoryList';

const { ccclass, property, menu } = _decorator;

/**
 * homeWnd 控制器
 * 管理首页生命周期：打开/恢复时加载历史记录
 */
@ccclass('HomeWndController')
@menu('WndControl/HomeWndController')
export class HomeWndController extends WndBase {
    @property({ type: Node, tooltip: 'historyCardList 节点（挂有 HistoryList 组件）' })
    historyCardListNode: Node | null = null;

    private _historyList: HistoryList | null = null;

    onLoad() {
        if (this.historyCardListNode) {
            this._historyList = this.historyCardListNode.getComponent(HistoryList);
        }
    }

    protected onWndOpen(params: Record<string, any>): void {
        // HistoryList 自身 autoLoad=true，onLoad 时已自动加载
    }

    protected onWndResume(): void {
        // 从其他 wnd 返回时刷新列表
        this._historyList?.refresh();
    }
}
