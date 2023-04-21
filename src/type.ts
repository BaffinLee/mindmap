export interface Node {
    id: string;
    text: string;
    children: Node[];
    depth: number;
    index: number;
    el?: HTMLElement;
    map: { [id: string]: Node };
    parent: Node | null;
    prev: () => Node | null;
    next: () => Node | null;
    prevCross: () => Node | null;
    nextCross: () => Node | null;
    x: number;
    y: number;
    // content 左上角基于自身（包含子节点的宽高的左上角）的相对定位
    contentX: number;
    contentY: number;
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
}

export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

export enum Direction {
    Left = 'left',
    Right = 'right',
    Up = 'up',
    Down = 'down',
}

export enum KeyCode {
    A = 65,
    Left = 37,
    Up = 38,
    Right = 39,
    Down = 40,
    Tab = 9,
    Enter = 13,
    NumpadEnter = 108,
    Space = 32,
    Delete = 46,
    Backspace = 8,
    Esc = 27,
}
