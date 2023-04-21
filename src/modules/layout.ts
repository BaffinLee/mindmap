import { Node, Rect } from "../type";

const marginRight = 100;
const marginTop = 20;

export function layout(root: Node) {
    calcSizeAndRelativePos(root, 1);
    calcAbsolutePos(root);
}

export function mergeRect(rects: Rect[]): Rect {
    let res = { minX: Number.MAX_VALUE, minY: Number.MAX_VALUE, maxX: 0, maxY: 0 };
    rects.forEach((rect, index) => {
        res.minX = Math.min(rect.left, res.minX);
        res.minY = Math.min(rect.top, res.minY);
        res.maxX = Math.max(rect.left + rect.width, res.maxX);
        res.maxY = Math.max(rect.top + rect.height, res.maxY);
    });
    return {
        top: res.minY,
        left: res.minX,
        width: res.maxX - res.minX,
        height: res.maxY - res.minY,
    };
}

function calcAbsolutePos(node: Node, parent?: Node, index?: number) {
    if (!parent) {
        node.x = 0;
        node.y = node.contentY;
    } else if (parent.height <= parent.contentHeight && parent.children.length) {
        // TODO: 考虑父节点高于子节点累计高度且有多个 child 的场景
        node.x = parent.x + parent.contentWidth + marginRight;
        node.y = parent.y + (parent.height - node.height) / 2 + node.contentY;
    } else if (index === 0) {
        node.x = parent.x + parent.contentWidth + marginRight;
        node.y = parent.y - parent.contentY + node.contentY;
    } else {
        const before = parent.children[index - 1];
        node.x = parent.x + parent.contentWidth + marginRight;
        node.y = before.y - before.contentY + before.height + marginTop + node.contentY;
    }
    node.children.forEach((child, i) => calcAbsolutePos(child, node, i));
}

function calcSizeAndRelativePos(node: Node, level: number) {
    calcNodeSize(node, level);
    calcNodeRelativePos(node);
}

function calcNodeSize(node: Node, level: number) {
    calcContentSize(node, level);
    node.width = 0;
    node.height = 0;
    node.children.forEach((child, index) => {
        calcSizeAndRelativePos(child, level + 1);
        node.width = Math.max(node.width, node.contentWidth + marginRight + child.width);
        node.height += (index > 0 ? marginTop : 0) + child.height;
    });
    node.width = Math.max(node.width, node.contentWidth);
    node.height = Math.max(node.height, node.contentHeight);
}

function calcNodeRelativePos(node: Node) {
    node.contentX = 0;
    if (node.height <= node.contentHeight) {
        node.contentY = 0;
    } else if (node.children.length) {
        if (node.children.length === 1) {
            const child = node.children[0];
            node.contentY = child.contentY + (child.contentHeight / 2) - (node.contentHeight / 2);
        } else {
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            const firstCenterY = firstChild.contentY + (firstChild.contentHeight / 2);
            const lastCenterY = node.height - lastChild.height + lastChild.contentY + (lastChild.contentHeight / 2);
            node.contentY = firstCenterY + ((lastCenterY - firstCenterY) / 2) - (node.contentHeight / 2);
        }
    } else {
        node.contentY = 0;
    }
}

const dom = document.createElement('div');
document.querySelector('.container').appendChild(dom);

function calcContentSize(node: Node, level: number) {
    dom.className = 'node example ' + (level === 1 ? 'central' : (level === 2 ? 'main' : 'normal'));
    dom.setAttribute('placeholder', 'Type something');
    dom.innerText = node.text;
    node.contentWidth = dom.offsetWidth;
    node.contentHeight = dom.offsetHeight;
}
