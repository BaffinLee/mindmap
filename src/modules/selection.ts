import { Node, Rect, Direction, KeyCode } from '../type';
import { initStage } from "./stage";
import { getNodeIdByDom } from './render';
import { SystemCtrlKey } from './keybinding';

type Listener = (newIds: string[], oldIds: string[]) => void;

export function initSelection(root: Node, stage: ReturnType<typeof initStage>) {
    const map = document.querySelector('.map') as HTMLElement;
    const container = document.querySelector('.container') as HTMLElement;
    const rect = document.querySelector('.selection-rect') as HTMLElement;

    let selectedIds: string[] = [];
    let selecting = false;
    let afterSelecting = false;
    let selectStart: { x: number, y: number } | null = null;
    let selectNow: { x: number, y: number } | null = null;
    let listeners: Listener[] = [];

    const select = (ids: string[], force: boolean = false) => {
        if (!force && ids.length === 0 && selectedIds.length === 0) {
            return;
        }
        if (!force && ids.length === 1 && selectedIds.length === 1 && ids[0] === selectedIds[0]) {
            return;
        }
        const old = selectedIds;
        selectedIds.length && unselect(false);
        ids.forEach(id => {
            const newNode = map.querySelector(`[id="${id}"]`);
            newNode && newNode.classList.add('selected');
        });
        selectedIds = ids;
        listeners.forEach(l => l(ids, old));
    };

    const unselect = (fireEvent: boolean = true) => {
        if (selectedIds.length === 0) return;
        const old = selectedIds;
        selectedIds.forEach(id => {
            const oldNode = map.querySelector(`[id="${id}"]`);
            oldNode && oldNode.classList.remove('selected');
        });
        selectedIds = [];
        fireEvent && listeners.forEach(l => l([], old));
    };

    const handleClick = (event: MouseEvent) => {
        if (afterSelecting) return;
        const target = event.target && (event.target as Element);
        if (!target || !target.closest || !target.closest('.node')) {
            selectedIds.length && unselect();
            return;
        }
        const id = getNodeIdByDom(target);
        if (!id || !root.map[id]) return;
        if (event[SystemCtrlKey]) {
            const selected = !!selectedIds.find(i => i === id);
            if (selected) {
                select(selectedIds.filter(i => i !== id));
            } else {
                select([...selectedIds, id]);
            }
        } else {
            select([id]);
        }
    };

    const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) {
            return;
        }

        const target = event.target && (event.target as Element);
        if (!target || !target.closest || target.closest('.node') || target.closest('.scroll-bar')) {
            return;
        }

        selectStart = { x: event.clientX, y: event.clientY };
        selectNow = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!selectStart || !selectNow) return;
        selectNow.x = e.clientX;
        selectNow.y = e.clientY;
        const width = Math.abs(selectNow.x - selectStart.x);
        const height = Math.abs(selectNow.y - selectStart.y);
        if (!selecting && (width > 2 || height > 2)) {
            selecting = true;
            document.body.classList.add('selecting');
        }
        if (!selecting) {
            return;
        }
        const left = Math.min(selectNow.x, selectStart.x);
        const top = Math.min(selectNow.y, selectStart.y);
        rect.style.left = `${left}px`;
        rect.style.top = `${top}px`;
        rect.style.width = `${width}px`;
        rect.style.height = `${height}px`;
        const r = {
            width: width / stage.getScale(),
            height: height / stage.getScale(),
            left: left / stage.getScale() - stage.getTranslate().x,
            top: top / stage.getScale() - stage.getTranslate().y,
        };
        const ids = getNodesByRect(root, r);
        select(ids);
    };

    const handleMouseUp = (e: MouseEvent) => {
        selectStart = null;
        selectNow = null;
        if (!selecting) return;
        document.body.classList.remove('selecting');
        rect.style.width = '';
        rect.style.height = '';
        rect.style.top = '';
        rect.style.left = '';
        selecting = false;
        afterSelecting = true;
        setTimeout(() => afterSelecting = false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.metaKey || e.shiftKey || e.altKey || !selectedIds.length) return;
        if (e.ctrlKey) {
            if (e.keyCode === KeyCode.A) {
                const ids: string[] = [];
                visitNode(root, node => { ids.push(node.id) });
                select(ids);
                e.preventDefault();
            }
            return;
        }
        let id: string | null = null;
        if (e.keyCode === KeyCode.Left) {
            e.preventDefault();
            id = navigate(root, selectedIds, Direction.Left);
        } else if (e.keyCode === KeyCode.Right) {
            e.preventDefault();
            id = navigate(root, selectedIds, Direction.Right);
        } else if (e.keyCode === KeyCode.Up) {
            e.preventDefault();
            id = navigate(root, selectedIds, Direction.Up);
        } else if (e.keyCode === KeyCode.Down) {
            e.preventDefault();
            id = navigate(root, selectedIds, Direction.Down);
        }
        if (id) {
            select([id]);
            stage.scrollNodeIntoViewIfNeeded(root.map[id]);
        }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    container.addEventListener('mousedown', handleMouseDown);

    return {
        getSelecting: () => selecting,
        getSelectedIds: () => selectedIds,
        getSelectedOutmostIds: () => getOutmostNodeIds(root, selectedIds),
        hasSelection: () => selectedIds.length > 0,
        isSingleSelection: () => selectedIds.length === 1,
        isMultipleSelection: () => selectedIds.length > 1,
        select,
        unselect,
        onSelectionChange: (listener: Listener) => listeners.push(listener),
        offSelectionChange: (listener: Listener) => listeners = listeners.filter(l => l !== listener),
        destroy: () => {
            listeners = [];
            document.removeEventListener('click', handleClick);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keydown', handleKeyDown);
            container.removeEventListener('mousedown', handleMouseDown);
        },
    };
}

export function getOutmostNodeIds(root: Node, ids: string[]) {
    const map = ids.reduce((res, id) => {
        res[id] = true;
        return res;
    }, {} as { [id: string]: boolean });
    const res = ids.filter(id => {
        let node = root.map[id];
        while (node.parent) {
            if (map.hasOwnProperty(node.parent.id)) {
                return false;
            }
            node = node.parent;
        }
        return true;
    });
    return res.sort((a, b) => {
        const nodeA = root.map[a];
        const nodeB = root.map[b];
        return (nodeA.depth - nodeB.depth) || (nodeA.index - nodeB.index);
    });
}

function navigate(root: Node, selectedIds: string[], direction: Direction): string | null {
    const id = selectedIds[selectedIds.length - 1];
    if (direction === Direction.Left) {
        return root.map[id].parent?.id || null;
    } else if (direction === Direction.Right) {
        return root.map[id].children.reduce((res, item) => {
            const diff1 = Math.abs((root.map[id].y + root.map[id].contentHeight / 2) - (res.y + res.contentHeight / 2));
            const diff2 = Math.abs((root.map[id].y + root.map[id].contentHeight / 2) - (item.y + item.contentHeight / 2));
            return diff2 < diff1 ? item : res;
        }, root.map[id].children[0])?.id || null;
    } else {
        const node = direction === Direction.Up ? root.map[id].prevCross() : root.map[id].nextCross();
        return node ? node.id : null;
    }
}

function getNodesByRect(root: Node, rect: Rect): string[] {
    const ids: string[] = [];
    visitNode(root, node => {
        if (!isRectIntersect(rect, { width: node.width, height: node.height, left: node.x - node.contentX, top: node.y - node.contentY })) {
            return false;
        }
        if (isRectIntersect(rect, { width: node.contentWidth, height: node.contentHeight, left: node.x, top: node.y })) {
            ids.push(node.id);
        }
        return true;
    });
    return ids;
}

export function isRectIntersect(rectA: Rect, rectB: Rect): boolean {
    return !(
        rectA.left > rectB.left + rectB.width ||
        rectA.top > rectB.top + rectB.height ||
        rectB.left > rectA.left + rectA.width ||
        rectB.top > rectA.top + rectA.height
    );
}

export function visitNode(
    node: Node,
    func: (
        n: Node,
        i: number,
        parent: Node | null,
    ) => boolean | void,
    index: number = -1,
    parent: Node | null = null,
) {
    const visitChildren = func(node, index, parent);
    visitChildren !== false && node.children.forEach((child, i) => visitNode(child, func, i, node));
}
