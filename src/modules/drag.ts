import { CommandName, initCommand } from "./command";
import { initEditor } from "./editor";
import { mergeRect } from "./layout";
import { getNodeIdByDom, unsetPath, setPath, getLine } from "./render";
import { initSelection, visitNode, isRectIntersect } from "./selection";
import { initStage } from "./stage";
import { Node } from "../type";

export function initDrag(
    root: Node,
    stage: ReturnType<typeof initStage>,
    selection: ReturnType<typeof initSelection>,
    command: ReturnType<typeof initCommand>,
    editor: ReturnType<typeof initEditor>,
) {
    const container = document.querySelector('.container') as HTMLElement;
    const dragLineContainer = document.querySelector('.drag-line') as HTMLElement;
    const line = getLine({ x: 0, y: 0 }, { x: 100, y: 100 }, 'start', 'end');
    dragLineContainer.appendChild(line);

    let dragging = false;
    let dragId = '';
    let dragIds: string[] = [];
    let dragIdMap: { [id: string]: boolean } = {};
    let mousePos = { x: 0, y: 0 };
    let dropId = '';
    let dropIndex = -1;
    let dragRect: HTMLElement | null = null;
    let snapshot: HTMLElement | null = null;
    let snapshotPos = { x: 0, y: 0 };

    const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) {
            return;
        }

        const target = event.target && (event.target as Element);
        const nodeId = target && getNodeIdByDom(target);
        if (!nodeId) {
            return;
        }

        const dragNode = root.map[nodeId];
        if (!dragNode || !dragNode.parent || editor.isEditing(nodeId)) {
            return;
        }

        const selectedIds = selection.getSelectedOutmostIds();
        const selected = !!selectedIds.find(id => id === nodeId);
        const nodeIds = (selected ? selectedIds : [nodeId]).filter(id => !!root.map[id].parent);
        if (nodeIds.length === 0) {
            return;
        }

        dragId = nodeId;
        dragIds = nodeIds;
        dragIdMap = nodeIds.reduce((map, id) => (map[id] = true) && map, {});
        mousePos = { x: event.clientX, y: event.clientY };
    };

    const startDrag = () => {
        const node = root.map[dragId];
        const el = node.el!;
        const rect = el.getBoundingClientRect();

        const dragNodesRect = mergeRect(dragIds.map(id => {
            const n = root.map[id];
            const el = n.el!;
            const elRect = el.getBoundingClientRect();
            return {
                left: elRect.left - n.contentX * stage.getScale(),
                top: elRect.top - n.contentY * stage.getScale(),
                width: n.width * stage.getScale(),
                height: n.height * stage.getScale(),
            }
        }));
        dragRect = document.createElement('div');
        dragRect.className = 'dragging-rect';
        dragRect.style.width = `${dragNodesRect.width + 20}px`;
        dragRect.style.height = `${dragNodesRect.height + 20}px`;
        dragRect.style.top = `${dragNodesRect.top - 10}px`;
        dragRect.style.left = `${dragNodesRect.left - 10}px`;

        snapshotPos = { x: rect.left, y: rect.top };
        snapshot = el.cloneNode(true) as HTMLElement;
        snapshot.id = `d${Date.now()}`;
        snapshot.style.left = `${snapshotPos.x}px`;
        snapshot.style.top = `${snapshotPos.y}px`;
        snapshot.style.width = `${node.contentWidth}px`;
        snapshot.style.height = `${node.contentHeight}px`;
        snapshot.classList.add('dragging-snapshot');
        
        if (dragIds.length > 1) {
            const num = document.createElement('div');
            num.textContent = `${dragIds.length}`;
            num.className = 'dragging-num';
            snapshot.appendChild(num);
        }

        container.appendChild(dragRect);
        container.appendChild(snapshot);
        document.body.classList.add('node-dragging');
    };

    const moveSnapshot = (x: number, y: number) => {
        if (!snapshot) return;
        snapshotPos.x += x - mousePos.x;
        snapshotPos.y += y - mousePos.y;
        mousePos = { x, y };
        snapshot.style.left = `${snapshotPos.x}px`;
        snapshot.style.top = `${snapshotPos.y}px`;
    };

    const findDropParent = () => {
        const dragNode = root.map[dragId];
        const x = snapshotPos.x;
        const y = snapshotPos.y + dragNode.contentHeight / 2;
        const rect = {
            width: 0,
            height: 0,
            left: x / stage.getScale() - stage.getTranslate().x,
            top: y / stage.getScale() - stage.getTranslate().y,
        };
        let parent: Node | null = null;
        let index = -1;
        visitNode(root, node => {
            if (index !== -1) return false;
            const nodeRect = {
                left: node.x + node.contentWidth,
                top: node.y - node.contentY - 200,
                width: 100 + 300,
                height: node.height + 200 * 2,
            };
            const nodeIndexRect = {
                left: node.x - 100,
                top: node.y - node.contentY - 10,
                width: 100 + 300,
                height: node.height + 10 * 2,
            };
            if (node.prevCross()) {
                nodeRect.top += 200 - 10;
                nodeRect.height -= 200 -10;
            } else {
                nodeIndexRect.top -= 200 - 10;
                nodeIndexRect.height += 200 -10;
            }
            if (node.nextCross()) {
                nodeRect.height -= 200 -10;
            } else {
                nodeIndexRect.height += 200 -10;
            }
            if (isRectIntersect(rect, nodeRect)) {
                parent = node;
                index = -1;
                return;
            }
            if (isRectIntersect(rect, nodeIndexRect)) {
                index = rect.top > node.y + node.contentHeight / 2 ? node.index + 1 : node.index;
                return false;
            }
        });
        if (parent) {
            let n = parent;
            while (n) {
                if (dragIdMap[n.id]) {
                    parent = null;
                    break;
                }
                n = n.parent;
            }
        }
        dropId = parent ? parent.id : '';
        dropIndex = parent ? (index === -1 ? 0 : index) : -1;
        dropId ? selection.select([dropId]) : selection.unselect();
    };

    const drawDropLine = () => {
        if (!dropId) {
            unsetPath(line);
            return;
        }
        const parent = root.map[dropId];
        const dragNode = root.map[dragId];
        const x = snapshotPos.x;
        const y = snapshotPos.y + dragNode.contentHeight / 2;
        const start = { x: parent.x + parent.contentWidth, y: parent.y + (parent.contentHeight / 2) };
        const end = { x: x / stage.getScale() - stage.getTranslate().x, y: y / stage.getScale() - stage.getTranslate().y };
        setPath(line, start, end, parent.id, snapshot.id);
    };

    const endDrag = () => {
        snapshot && snapshot.remove();
        dragRect && dragRect.remove();
        unsetPath(line);
        document.body.classList.remove('node-dragging');
        if (!dropId) return;
        const parent = root.map[dropId];
        let index = dropIndex;
        parent.children.forEach((child, i) => {
            if (dragIdMap[child.id] && i < dropIndex) {
                index -= 1;
            }
        });
        command.execute(CommandName.MoveNode, dropId, index, dragIds);
    };

    const handleMouseMove = (event: MouseEvent) => {
        if (dragIds.length === 0) return;
        if (!dragging && (Math.abs(event.clientX - mousePos.x) > 2 || Math.abs(event.clientY - mousePos.y) > 2)) {
            dragging = true;
            startDrag();
            selection.unselect();
        }
        if (!dragging) return;
        moveSnapshot(event.clientX, event.clientY);
        findDropParent();
        drawDropLine();
    };

    const handleMouseUp = (event: MouseEvent) => {
        dragging && endDrag();
        dragId = '';
        dragIds = [];
        dragIdMap = {};
        mousePos = { x: 0, y: 0 };
        dragRect = null;
        snapshot = null;
        snapshotPos = { x: 0, y: 0 };
        dragging = false;
        dropId = '';
        dropIndex = -1;
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return {
        isDragging: () => dragging,
        getDraggingNodes: () => dragIds,
        destroy: () => {
            line.remove();
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        },
    };
}
