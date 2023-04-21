import { Node } from './../type';
import { CommandName, initCommand } from "./command";
import { initEditor } from "./editor";
import { layout } from './layout';
import { render } from './render';
import { initSelection, visitNode } from "./selection";
import { initStage } from "./stage";
import { initStore } from './store';

const DATA_TYPE = 'text/mindmap';

export function initCopy(
    root: Node,
    stage: ReturnType<typeof initStage>,
    selection: ReturnType<typeof initSelection>,
    command: ReturnType<typeof initCommand>,
    editor: ReturnType<typeof initEditor>,
    store: ReturnType<typeof initStore>,
) {
    function handleCopy(event: ClipboardEvent) {
        if (editor.isEditing()) return;

        const ids = selection.getSelectedIds();
        if (!ids.length) return;

        const datas = ids.map(id => store.serialize(root.map[id]));
        event.clipboardData.setData(DATA_TYPE, JSON.stringify(datas));
        event.preventDefault();
    }

    function handleCut(event: ClipboardEvent) {
        handleCopy(event);
        if (command.canExecute(CommandName.DeleteNode)) {
            command.execute(CommandName.DeleteNode);
        }
    }

    function handlePaste(event: ClipboardEvent) {
        if (editor.isEditing()) return;

        const ids = selection.getSelectedIds();
        if (ids.length !== 1) return;

        const json = event.clipboardData.getData(DATA_TYPE);
        if (!json) return;

        let nodes: Node[];
        try {
            const datas = JSON.parse(json);
            if (Array.isArray(datas) && datas.every(data => store.validate(data))) {
                nodes = datas.map(data => store.deserialize(data, true));
            } else {
                return;
            }
        } catch (e) {
            console.error('deserialize paste data error', e);
            return;
        }

        if (!nodes || !nodes.length) return;

        const parent = root.map[ids[0]];
        nodes.forEach(node => {
            node.parent = parent;
            node.index = parent.children.length;
            node.depth = parent.depth + 1;
            visitNode(node, n => {
                root.map[n.id] = n;
                n.map = root.map;
            });
            parent.children.push(node);
        });

        layout(root);
        render(root);

        selection.select(nodes.map(n => n.id));

        const focusNode = nodes[0];
        stage.scrollNodeIntoViewIfNeeded(focusNode);

        event.preventDefault();
    }

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);

    return {
        destroy: () => {
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('paste', handlePaste);
        },
    }
}
