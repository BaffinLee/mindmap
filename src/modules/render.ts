import { Node, Point } from "../type";

export function render(root: Node) {
    const mapContainer = document.createDocumentFragment();
    const lineContainer = document.createDocumentFragment();
    const content = document.querySelector('.content') as HTMLElement;
    const map = document.querySelector('.map') as HTMLElement;
    const line = document.querySelector('.line') as SVGElement;
    map.innerHTML = '';
    line.innerHTML = '';
    content.style.width = root.width + 'px';
    content.style.height = root.height + 'px';
    renderNode(root, 1, mapContainer, lineContainer);
    map.appendChild(mapContainer);
    line.appendChild(lineContainer);
}

function renderNode(node: Node, level: number, mapContainer: DocumentFragment, lineContainer: DocumentFragment) {
    const dom = document.createElement('div');
    dom.id = node.id;
    dom.className = 'node ' + (level === 1 ? 'central' : (level === 2 ? 'main' : 'normal'));
    dom.style.top = node.y + 'px';
    dom.style.left = node.x + 'px';
    dom.setAttribute('placeholder', 'Type something');
    dom.innerText = node.text;
    if (process.env.NODE_ENV === 'development') (dom as any).node = node;
    node.el = dom;
    mapContainer.appendChild(dom);
    node.children.forEach(child => {
        renderNode(child, level + 1, mapContainer, lineContainer);
        renderLine(child, node, lineContainer);
    });
}

function renderLine(node: Node, parent: Node, lineContainer: DocumentFragment) {
    const start = { x: parent.x + parent.contentWidth, y: parent.y + (parent.contentHeight / 2) };
    const end = { x: node.x, y: node.y + (node.contentHeight / 2) };
    lineContainer.appendChild(getLine(start, end, parent.id, node.id));
}

export function getLine(start: Point, end: Point, startId: string, endId: string) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke', '#395bff');
    path.setAttribute('stroke-linecap', 'round');
    return setPath(path, start, end, startId, endId);
}

export function setPath(path: SVGPathElement, start: Point, end: Point, startId: string, endId: string) {
    path.id = `${startId}-${endId}`;
    path.setAttribute('d', `M ${start.x} ${start.y} C ${start.x + 50} ${start.y} ${end.x - 50} ${end.y} ${end.x} ${end.y}`);
    return path;
}

export function unsetPath(path: SVGPathElement) {
    path.removeAttribute('d');
    path.removeAttribute('id');
    return path;
}

export function getNodeIdByDom(el: Element) {
    const node = el.closest && el.closest('.node');
    return (node && node.id) || null;
}
