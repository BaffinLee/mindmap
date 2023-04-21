import { Node } from './type';
import { layout } from "./modules/layout";
import { render } from "./modules/render";
import { initSelection } from "./modules/selection";
import { initStage } from "./modules/stage";
import { initCommand } from './modules/command';
import { initKeybinding } from './modules/keybinding';
import { initDrag } from './modules/drag';
import { initEditor } from './modules/editor';
import { initStore } from './modules/store';
import { initCopy } from './modules/copy';

declare global {
    interface Window {
        root: Node;
        stage: ReturnType<typeof initStage>;
        selection: ReturnType<typeof initSelection>;
        command: ReturnType<typeof initCommand>;
        editor: ReturnType<typeof initEditor>;
    }
}

if (process.env.NODE_ENV !== 'development') {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register(location.pathname + 'service-worker.js');
        });
    }
}

const store = initStore();
const root = store.root;
layout(root);
render(root);
const stage = initStage(root, store);
const selection = initSelection(root, stage);
const editor = initEditor(root, stage, selection);
const command = initCommand(root, selection, stage, editor);
initKeybinding(command, editor);
initDrag(root, stage, selection, command, editor);
store.bind(command, editor);
initCopy(root, stage, selection, command, editor, store);

if (process.env.NODE_ENV === 'development') {
    window.root = root;
    window.stage = stage;
    window.selection = selection;
    window.command = command;
    window.editor = editor;
}
