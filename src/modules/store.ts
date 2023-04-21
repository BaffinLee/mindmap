import { Node } from '../type';
import { createNode, initCommand } from './command';
import { initEditor } from './editor';
import { visitNode } from './selection';

const LS_KEY = 'mindmap_data';
const THEME_LS_KEY = 'mindmap_theme';

interface PlainNode {
    id: string;
    text: string;
    children: PlainNode[];
}

export function initStore() {
    let root: Node = fetch();
    let title = '';

    if (!root) {
        root = createNode();
        root.children = [
            createNode(root, 0),
            createNode(root, 1),
            createNode(root, 2),
        ];
    }

    updateTitle();

    function fetch() {
        const old = getLocalStorage(LS_KEY);
        if (!old) return;
        return parseJson(old);
    }

    function deserialize(node: PlainNode, replaceId: boolean = false) {
        let r: Node;
        visitNode(node as Node, (n: PlainNode, i, p) => {
            const newNode = createNode(r && p ? r.map[p.id] : null, i, n.text);
            delete newNode.map[newNode.id];
            newNode.id = n.id;
            newNode.map[newNode.id] = newNode;
            if (!r) r = newNode;
        });
        replaceId && visitNode(r, n => { n.id = nanoid() });
        return r;
    }

    function serialize(node: Node) {
        const nodeMap: { [id: string]: PlainNode } = {};
        visitNode(node, (n, i) => {
            const parent = n.parent && nodeMap[n.parent.id];
            const newNode: PlainNode = {
                id: n.id,
                text: n.text,
                children: [],
            };
            nodeMap[n.id] = newNode;
            parent && parent.children.splice(i, 0, newNode);
        });
        return nodeMap[node.id];
    }

    function validate(node: PlainNode) {
        let valid = true;
        const map = {};
        visitNode(node as Node, (node: PlainNode) => {
            if (
                !node ||
                typeof node !== 'object' ||
                !node.id ||
                typeof node.id !== 'string' ||
                map[node.id] ||
                !node.children ||
                !Array.isArray(node.children)
            ) {
                valid = false;
                return false;
            }
            map[node.id] = true;
        });
        return valid;
    }

    function parseJson(json: string, replaceId: boolean = false) {
        try {
            const oldRoot: PlainNode = JSON.parse(json);
            if (validate(oldRoot)) {
                return deserialize(oldRoot, replaceId);
            } else {
                throw new Error('local mindmap data is not valid');
            }
        } catch (e) {
            console.error('parse local mindmap data error', e);
        }
    }

    function toJson(node: Node) {
        return JSON.stringify(serialize(node));
    }

    function save(node: Node) {
        setLocalStorage(LS_KEY, toJson(node));
    }

    function updateTitle() {
        if (title === root.text) return;
        title = root.text;
        document.title = `${title} - mindmap`;
    }

    function handleChange() {
        save(root);
        updateTitle();
    }

    return {
        bind: (command: ReturnType<typeof initCommand>, editor: ReturnType<typeof initEditor>) => {
            editor.onTextChange(handleChange);
            command.onNodeChange(handleChange);
        },
        unbind: (command: ReturnType<typeof initCommand>, editor: ReturnType<typeof initEditor>) => {
            editor.offTextChange(handleChange);
            command.offNodeChange(handleChange);
        },
        root,
        save,
        fetch,
        deserialize,
        serialize,
        validate,
        toJson,
        parseJson,
        getTheme: () => {
            return getLocalStorage(THEME_LS_KEY) === 'dark' ? 'dark' : 'light';
        },
        setTheme: (theme: 'dark' | 'light') => {
            setLocalStorage(THEME_LS_KEY, theme);
        },
    };
}

// copy from https://github.com/ai/nanoid/blob/master/index.browser.js
export function nanoid(size = 8) {
    let id = ''
    let bytes = crypto.getRandomValues(new Uint8Array(size))
    // A compact alternative for `for (var i = 0; i < step; i++)`.
    while (size--) {
        // It is incorrect to use bytes exceeding the alphabet size.
        // The following mask reduces the random byte in the 0-255 value
        // range to the 0-63 value range. Therefore, adding hacks, such
        // as empty string fallback or magic numbers, is unneccessary because
        // the bitmask trims bytes down to the alphabet size.
        let byte = bytes[size] & 63
        if (byte < 36) {
            // `0-9a-z`
            id += byte.toString(36)
        } else if (byte < 62) {
            // `A-Z`
            id += (byte - 26).toString(36).toUpperCase()
        } else if (byte < 63) {
            id += '_'
        } else {
            id += '-'
        }
    }
    return id
}

export function getLocalStorage(key: string, defaultValue: string | null = null): string | null {
    try {
        const val = window.localStorage.getItem(key);
        return val === null ? defaultValue : val;
    } catch (e) {
        console.error('get local storage error', e);
        return defaultValue;
    }
}

export function setLocalStorage(key: string, value: string | null = null) {
    try {
        if (value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, value);
        }
    } catch (e) {
        console.error('set local storage error', e);
    }
}
