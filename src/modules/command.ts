import { Node } from '../type';
import { initSelection, visitNode } from "./selection";
import { initStage } from "./stage";
import { layout } from './layout';
import { render } from './render';
import { initEditor } from './editor';
import { nanoid } from './store';

type Listener = () => void;

export enum CommandName {
    CreateChild = 'CreateChild',
    CreateSibling = 'CreateSibling',
    DeleteNode = 'DeleteNode',
    MoveNode = 'MoveNode',
    InitEditor = 'InitEditor',
    FocusEditor = 'FocusEditor',
    BlurEditor = 'BlurEditor',
    ResetEditor = 'ResetEditor',
}

export interface CommandArgsMap {
    [CommandName.CreateChild]: [] | [string];
    [CommandName.CreateSibling]: [] | [string];
    [CommandName.DeleteNode]: [] | [string];
    [CommandName.MoveNode]: [string, number, string[]];
    [CommandName.InitEditor]:  [] | [string];
    [CommandName.ResetEditor]:  [] | [string];
    [CommandName.FocusEditor]:  [] | [string];
    [CommandName.BlurEditor]:  [] | [string];
}

export interface CommandReturnsMap {
    [CommandName.CreateChild]: void;
    [CommandName.CreateSibling]: void;
    [CommandName.DeleteNode]: void;
    [CommandName.DeleteNode]: void;
    [CommandName.MoveNode]: void;
    [CommandName.InitEditor]: void;
    [CommandName.ResetEditor]: void;
    [CommandName.FocusEditor]: void;
    [CommandName.BlurEditor]: void;
}

export function initCommand(
    root: Node,
    selection: ReturnType<typeof initSelection>,
    stage: ReturnType<typeof initStage>,
    editor: ReturnType<typeof initEditor>,
) {
    function getNode(id?: string) {
        const node = root.map[id || selection.getSelectedIds()[0]];
        if (!node) throw new Error('no node id to execute command');
        return node;
    }

    function createChild(parentId?: string) {
        const parent = getNode(parentId);
        const child = createNode(parent, parent.children.length);
        layout(root);
        render(root);
        selection.select([child.id]);
        stage.scrollNodeIntoViewIfNeeded(child);
        listeners.forEach(l => l());
    }

    function canCreateChild(parentId?: string) {
        const node = getNode(parentId);
        return (!!parentId || selection.isSingleSelection()) && !editor.isEditing(node.id);
    }

    function createSibling(nodeId?: string) {
        const node = getNode(nodeId);
        if (!node.parent) return;
        const sibling = createNode(node.parent, node.index + 1);
        layout(root);
        render(root);
        selection.select([sibling.id]);
        stage.scrollNodeIntoViewIfNeeded(sibling);
        listeners.forEach(l => l());
    }

    function canCreateSibling(nodeId?: string) {
        const node = getNode(nodeId);
        return (!!nodeId || selection.isSingleSelection()) && !!node.parent && !editor.isEditing(node.id);
    }

    function deleteNode(nodeId?: string) {
        const ids = nodeId ? [nodeId] : selection.getSelectedOutmostIds();
        let focusNode: Node | null = null;
        ids.forEach((id) => {
            const node = root.map[id];
            if (!node || !node.parent) return;
            const focus = focusNode = node.prev() || node.next() || node.parent;
            destroyNode(node);
            if (!focusNode || !root.map[focusNode.id]) focusNode = focus;
        });
        if (ids.length) {
            layout(root);
            render(root);
        }
        if (focusNode) {
            selection.select([focusNode.id]);
            stage.scrollNodeIntoViewIfNeeded(focusNode);
        }
        listeners.forEach(l => l());
    }

    function canDeleteNode(nodeId?: string) {
        const node = getNode(nodeId);
        return (!!node.parent || (!nodeId && selection.isMultipleSelection())) && !editor.isEditing(node.id);
    }

    function canEdit(nodeId?: string) {
        return !!nodeId || selection.isSingleSelection();
    }

    function isNotEditing(nodeId?: string) {
        const node = getNode(nodeId);
        return (!!nodeId || selection.isSingleSelection()) && !editor.isEditing(node.id);
    }

    function moveNode(parentId: string, index: number, nodeIds: string[]) {
        const parent = root.map[parentId];
        const nodes = nodeIds.map(id => root.map[id]);
        nodes.forEach(node => {
            destroyNode(node, false);
            node.parent = parent;
            visitNode(node, n => { n.depth = n.parent.depth + 1 });
            parent.children.splice(index++, 0, node);
        });
        parent.children.forEach((child, i) => child.index = i);
        layout(root);
        render(root);
        selection.select(nodeIds);
        stage.scrollNodeIntoViewIfNeeded(root.map[nodeIds[0]]);
        listeners.forEach(l => l());
    }

    function canMoveNode(parentId: string, index: number, nodeIds: string[]) {
        return index >= 0 && index <= root.map[parentId].children.length && nodeIds.length > 0;
    }

    function execute<T extends CommandName>(command: T, ...args: CommandArgsMap[T]): CommandReturnsMap[T] {
        switch (command) {
            case CommandName.CreateChild:
                // @ts-ignore
                return createChild(...args);
            case CommandName.CreateSibling:
                // @ts-ignore
                return createSibling(...args);
            case CommandName.DeleteNode:
                // @ts-ignore
                return deleteNode(...args);
            case CommandName.MoveNode:
                // @ts-ignore
                return moveNode(...args);
            case CommandName.InitEditor:
                // @ts-ignore
                return editor.initEditor(getNode(args[0]).id);
            case CommandName.ResetEditor:
                // @ts-ignore
                return editor.resetEditor(getNode(args[0]).id);
            case CommandName.FocusEditor:
                // @ts-ignore
                return editor.focusEditor(getNode(args[0]).id);
            case CommandName.BlurEditor:
                // @ts-ignore
                return editor.blurEditor(getNode(args[0]).id);
            default:
                console.warn(`no execute handler for command ${CommandName}`);
        }
    }

    function canExecute<T extends CommandName>(command: T, ...args: CommandArgsMap[T]): boolean {
        switch (command) {
            case CommandName.CreateChild:
                // @ts-ignore
                return canCreateChild(...args);
            case CommandName.CreateSibling:
                // @ts-ignore
                return canCreateSibling(...args);
            case CommandName.DeleteNode:
                // @ts-ignore
                return canDeleteNode(...args);
            case CommandName.MoveNode:
                // @ts-ignore
                return canMoveNode(...args);
            case CommandName.InitEditor:
            case CommandName.FocusEditor:
                // @ts-ignore
                return isNotEditing(...args);
            case CommandName.ResetEditor:
            case CommandName.BlurEditor:
                // @ts-ignore
                return canEdit(...args);
            default:
                console.warn(`no canExecute handler for command ${CommandName}`);
        }
    }

    let listeners: Listener[] = [];

    return {
        execute,
        canExecute,
        onNodeChange: (listener: Listener) => listeners.push(listener),
        offNodeChange: (listener: Listener) => listeners = listeners.filter(l => l !== listener),
    };
}

export function createNode(parent: Node | null = null, index: number = 0, text: string = ''): Node {
    const node: Node = {
        id: nanoid(),
        text,
        children: [],
        depth: parent ? parent.depth + 1 : 1,
        index: parent ? index : -1,
        map: parent ? parent.map : {},
        parent,
        prev: () => (node.parent && node.parent.children[node.index - 1]) || null,
        next: () => (node.parent && node.parent.children[node.index + 1]) || null,
        prevCross: () => {
            let n = node.prev();
            if (n) return n;
            n = node.parent;
            while (n && !n.prev()) n = n.parent;
            if (!n) return null;
            n = n.prev();
            while (n && n.depth < node.depth) {
                n = n.children[n.children.length - 1];
                if (n && n.depth === node.depth) {
                    return n;
                }
            }
            return null;
        },
        nextCross: () => {
            let n = node.next();
            if (n) return n;
            n = node.parent;
            while (n && !n.next()) n = n.parent;
            if (!n) return null;
            n = n.next();
            while (n && n.depth < node.depth) {
                n = n.children[0];
                if (n && n.depth === node.depth) {
                    return n;
                }
            }
            return null;
        },
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        contentX: 0,
        contentY: 0,
        contentWidth: 0,
        contentHeight: 0,
    };
    parent && parent.children.splice(index, 0, node);
    node.map[node.id] = node;
    return node;
}

export function destroyNode(node: Node, resetMap: boolean = true) {
    const removeFromMap = (n: Node) => {
        delete n.map[n.id];
        n.children.forEach(c => removeFromMap(c));
    };
    if (node.parent) {
        node.parent.children = node.parent.children.filter(child => child !== node);
        node.parent.children.forEach((child, index) => child.index = index);
    }
    resetMap && removeFromMap(node);
}
