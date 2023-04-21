import { initCommand, CommandName } from './command';
import { initEditor } from './editor';
import { getNodeIdByDom } from './render';
import { KeyCode } from '../type';

export interface HotKey {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    keyCode: number;
}

export const IsMac = window.navigator.userAgent.indexOf('Macintosh') !== -1;

export const SystemCtrlKey = IsMac ? 'metaKey' : 'ctrlKey';

export function initKeybinding(
    command: ReturnType<typeof initCommand>,
    editor: ReturnType<typeof initEditor>,
) {
    const execCommand = (event: KeyboardEvent, commandName: CommandName, preventDefault: boolean = true) => {
        if (command.canExecute(commandName)) {
            preventDefault && event.preventDefault();
            command.execute(commandName);
            return true;
        }
        return false;
    };

    const handleEnter = (event: KeyboardEvent) => {
        if (editor.isEditing()) {
            editor.blurEditor();
            event.preventDefault();
        } else {
            execCommand(event, CommandName.CreateSibling);
        }
    };

    const handleEsc = (event: KeyboardEvent) => {
        if (editor.isEditing()) {
            editor.blurEditor();
            event.preventDefault();
        }
    };

    const handleTab = (event: KeyboardEvent) => {
        if (editor.isEditing()) {
            editor.blurEditor();
            event.preventDefault();
        } else {
            execCommand(event, CommandName.CreateChild);
        }
    };

    const handleDelete = (event: KeyboardEvent) => {
        if (!editor.isEditing()) {
            execCommand(event, CommandName.DeleteNode);
        }
    };

    const handleSpace = (event: KeyboardEvent) => {
        if (!editor.isEditing()) {
            execCommand(event, CommandName.FocusEditor);
        }
    };

    const keyHandlerMap = {
        // tab
        [normalizeHotKey({ keyCode: KeyCode.Tab })]: handleTab,
        // enter
        [normalizeHotKey({ keyCode: KeyCode.Enter })]: handleEnter,
        [normalizeHotKey({ keyCode: KeyCode.NumpadEnter })]: handleEnter,
        // delete
        [normalizeHotKey({ keyCode: KeyCode.Delete })]: handleDelete,
        [normalizeHotKey({ keyCode: KeyCode.Backspace })]: handleDelete,
        // space
        [normalizeHotKey({ keyCode: KeyCode.Space })]: handleSpace,
        // esc
        [normalizeHotKey({ keyCode: KeyCode.Esc })]: handleEsc,
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        const key = normalizeHotKey(event);
        const keyHandler = keyHandlerMap[key];
        keyHandler && keyHandler(event);
    };

    document.addEventListener('keydown', handleKeyDown);

    return {
        destroy: () => {
            document.removeEventListener('keydown', handleKeyDown);
        },
    };
}

function normalizeHotKey(key: HotKey) {
    return `${key.metaKey ? 1 : 0}-${key.ctrlKey ? 1 : 0}-${key.shiftKey ? 1 : 0}-${key.altKey ? 1 : 0}-${key.keyCode}`;
}
