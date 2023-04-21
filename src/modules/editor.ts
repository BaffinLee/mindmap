import { layout } from "./layout";
import { getNodeIdByDom, render } from "./render";
import { initSelection } from "./selection";
import { initStage } from "./stage";
import { Node } from "../type";

type Listener = (newText: string, oldText: string) => void;

export function initEditor(
    root: Node,
    stage: ReturnType<typeof initStage>,
    selection: ReturnType<typeof initSelection>,
) {
    function handleSelectionChange(newIds: string[], oldIds: string[]) {
        if (oldIds.length === 1) {
            resetEditor(oldIds[0]);
        }
        if (newIds.length === 1) {
            initEditor(newIds[0]);
        }
    }

    function initEditor(nodeId: string) {
        const node = root.map[nodeId];
        node && node.el.setAttribute('contenteditable', 'true');
    }

    function resetEditor(nodeId: string) {
        const node = root.map[nodeId];
        node && node.el.removeAttribute('contenteditable');
    }

    function focusEditor(nodeId: string) {
        const node = root.map[nodeId];
        node && focus(node.el);
    }

    function blurEditor(nodeId?: string) {
        if (!nodeId) {
            const node = document.querySelector(':focus');
            const id = node && getNodeIdByDom(node);
            if (!id || !node) return;
            nodeId = id;
        }
        const node = root.map[nodeId];
        node && node.el.blur();
    }

    function handleFocus(event: FocusEvent) {
        const id = event.target && getNodeIdByDom(event.target as Element);
        if (!id || !root.map[id]) return;
        const node = root.map[id];
        const el = node.el;
        el.style.minWidth = `${node.contentWidth}px`;
        el.style.minHeight = `${node.contentHeight}px`;
        el.classList.add('editting');
    }

    function handleBlur(event: FocusEvent) {
        const id = event.target && getNodeIdByDom(event.target as Element);
        if (!id || !root.map[id]) return;
        const node = root.map[id];
        const el = node.el;
        el.style.minWidth = '';
        el.style.minHeight = '';
        el.classList.remove('editting');
        const oldText = node.text;
        node.text = el.innerText;
        listeners.forEach(l => l(node.text, oldText));
        setTimeout(() => {
            layout(root);
            render(root);
            selection.select(selection.getSelectedIds(), true);
        }, 100);
        
    }

    let listeners: Listener[] = [];

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    selection.onSelectionChange(handleSelectionChange);

    return {
        destroy: () => {
            listeners = [];
            document.removeEventListener('focus', handleFocus, true);
            document.removeEventListener('blur', handleBlur, true);
            selection.offSelectionChange(handleSelectionChange);
        },
        isEditable: (id: string) => {
            return !!root.map[id].el && root.map[id].el.getAttribute('contenteditable') === 'true';
        },
        isEditing: (id?: string) => {
            if (id) {
                return !!root.map[id].el && root.map[id].el.matches(':focus');
            } else {
                const node = document.querySelector(':focus');
                return !!node && !!getNodeIdByDom(node);
            }
        },
        onTextChange: (listener: Listener) => listeners.push(listener),
        offTextChange: (listener: Listener) => listeners = listeners.filter(l => l !== listener),
        initEditor,
        resetEditor,
        focusEditor,
        blurEditor,
    };
}

export function focus(el: HTMLElement) {
    el.focus({ preventScroll: true });
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 && selection.getRangeAt(0);
    if (range) {
        range.selectNodeContents(el);
        range.collapse();
    }
}
