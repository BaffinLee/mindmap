import { Node } from "../type";
import { exportPng } from "./export";

const minScale = 0.2;
const maxScale = 2;
const minScroll = {
    v: 100,
    h: 100,
};
const maxScroll = {
    v: Math.floor(window.innerWidth * 0.667),
    h: Math.floor(window.innerHeight * 0.667),
};
const limitArea = { v: 60, h: 60 };
const edgeGap = { v: 20, h: 20 };

export function initStage(root: Node, store: any) {
    const content = document.querySelector('.content') as HTMLElement;
    const container = document.querySelector('.container') as HTMLElement;
    const percentage = document.querySelector('.percentage') as HTMLElement;
    const exportBtn = document.querySelector('.export') as HTMLElement;
    const themeBtn = document.querySelector('.theme') as HTMLElement;
    const fullscreenBtn = document.querySelector('.fullscreen') as HTMLElement;
    const hScrollBar = document.querySelector('.h-scroller .scroll-bar') as HTMLElement;
    const vScrollBar = document.querySelector('.v-scroller  .scroll-bar') as HTMLElement;

    let scale = 1;
    let translate = { x: 0, y: 0 };
    let scroll = {
        v: { width: 100, left: 0 },
        h: { height: 100, top: 0 },
    };

    const handlePinch = (event: WheelEvent) => {
        const delta = Math.max(Math.abs(event.deltaY), 30) * (event.deltaY > 0 ? 1 : -1);
        const diff = - (delta / 100) * 0.2;
        const newScale = limitScale(scale + diff);
        if (newScale === scale) return;
        const newTranslate = limitTranslate(newScale, {
            x: translate.x + (event.clientX / newScale) - (event.clientX / scale),
            y: translate.y + (event.clientY / newScale) - (event.clientY / scale),
        });
        translate = newTranslate;
        scale = newScale;
        render();
    };

    const handlePan = (event: WheelEvent) => {
        const newTranslate = limitTranslate(scale, {
            x: translate.x - event.deltaX,
            y: translate.y - event.deltaY,
        });
        translate = newTranslate;
        render();
    };

    const center = (r: boolean = true) => {
        const rect = container.getBoundingClientRect();
        translate.x = rect.width < root.width * scale + limitArea.v * 2 ? limitArea.v : (rect.width - root.width * scale) / 2;
        translate.x /= scale;
        translate.y = (rect.height - (root.contentY + root.contentHeight / 2) * 2 * scale) / 2;
        translate.y /= scale;
        r && render();
    };

    const centerNode = (node: Node, r: boolean = true) => {
        const rect = container.getBoundingClientRect();
        translate.x = rect.width / 2 - node.x * scale - node.contentWidth / 2 * scale;
        translate.x /= scale;
        translate.y = rect.height / 2 - node.y * scale - node.contentHeight / 2 * scale;
        translate.y /= scale;
        r && render();
    };

    const scrollNodeIntoViewIfNeeded = (node: Node, r: boolean = true) => {
        const rect = container.getBoundingClientRect();
        const nodeRect = {
            left: (node.x + translate.x) * scale,
            top: (node.y + translate.y) * scale,
            width: node.contentWidth * scale,
            height: node.contentHeight * scale,
        };
        // left
        if (nodeRect.left <= 0) {
            translate.x += (edgeGap.v - nodeRect.left) / scale;
        }
        // right
        if (nodeRect.left + nodeRect.width >= rect.width) {
            translate.x -= (nodeRect.left - rect.width + nodeRect.width + edgeGap.v) / scale;
        }
        // top
        if (nodeRect.top <= 0) {
            translate.y += (edgeGap.h - nodeRect.top) / scale;
        }
        // bottom
        if (nodeRect.top + nodeRect.height >= rect.height) {
            translate.y -= (nodeRect.top - rect.height + nodeRect.height + edgeGap.h) / scale;
        }
        r && render();
    };

    const limitScale = (s: number) => {
        return Math.max(minScale, Math.min(s, maxScale));
    };

    const limitTranslate = (s: number, t: { x: number; y: number }) => {
        const rect = {
            x: t.x * s,
            y: t.y * s,
            width: root.width * s,
            height: root.height * s,
        };
        return {
            x: Math.max(- (rect.width - limitArea.v), Math.min(window.innerWidth - limitArea.v, rect.x)) / s,
            y: Math.max(- (rect.height - limitArea.h), Math.min(window.innerHeight - limitArea.h, rect.y)) / s,
        };
    };

    const handleScrollBarMouseDown = (event: MouseEvent, isVertical: boolean) => {
        if (event.button !== 0) {
            return;
        }

        let mousePos = { x: event.clientX, y: event.clientY };
        const handleMouseMove = (event: MouseEvent) => {
            const pos = { x: event.clientX, y: event.clientY };
            setScroll({
                left: isVertical ? scroll.v.left + pos.x - mousePos.x : undefined,
                top: !isVertical ? scroll.h.top + pos.y - mousePos.y : undefined,
            });
            mousePos = pos;
        };

        const target = isVertical ? vScrollBar : hScrollBar;
        const handleMouseUp = (event: MouseEvent) => {
            target.classList.remove('dragging');
            document.body.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        target.classList.add('dragging');
        document.body.classList.add('dragging');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
    const handleVScrollBarMouseDown = (event: MouseEvent) => handleScrollBarMouseDown(event, true);
    const handleHScrollBarMouseDown = (event: MouseEvent) => handleScrollBarMouseDown(event, false);

    const calcScroll = () => {
        const scaleRatio = (scale - minScale) / (maxScale - minScale);
        scroll.v.width = minScroll.v + (maxScroll.v - minScroll.v) * scaleRatio;
        scroll.h.height = minScroll.h + (maxScroll.h - minScroll.h) * scaleRatio;
        const xRatio = (translate.x * scale + (root.width * scale) - limitArea.v) / ((root.width * scale) + window.innerWidth - limitArea.v * 2);
        const yRatio = (translate.y * scale + (root.height * scale) - limitArea.h) / ((root.height * scale) + window.innerHeight - limitArea.h * 2);
        scroll.v.left = (1 - xRatio) * (window.innerWidth - scroll.v.width);
        scroll.h.top = (1 - yRatio) * (window.innerHeight - scroll.h.height);
    };

    const setScroll = (s: { left?: number, top?: number }, r: boolean = true) => {
        const t = { x: translate.x, y: translate.y };
        if (s.left !== undefined) {
            t.x = translate.x - (s.left - scroll.v.left) * ((root.width * scale) + window.innerWidth - limitArea.v * 2) / (scale * (window.innerWidth - scroll.v.width));
        }
        if (s.top !== undefined) {
            t.y = translate.y - (s.top - scroll.h.top) * ((root.height * scale) + window.innerHeight - limitArea.h * 2) / (scale * (window.innerHeight - scroll.h.height));
        }
        translate = limitTranslate(scale, t);
        !r && calcScroll();
        r && render();
    };

    const render = () => {
        calcScroll();
        content.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
        percentage.textContent = `${Math.floor(scale * 100)}%`;
        vScrollBar.style.width = `${scroll.v.width}px`;
        vScrollBar.style.transform = `translateX(${scroll.v.left}px)`;
        hScrollBar.style.height = `${scroll.h.height}px`;
        hScrollBar.style.transform = `translateY(${scroll.h.top}px)`;
    };

    const handleContainerWheel = (event: WheelEvent) => {
        event.preventDefault();
        if (event.ctrlKey) {
            handlePinch(event);
        } else {
            handlePan(event);
        }
    };

    const handleContainerMouseDown = (event: MouseEvent) => {
        if (event.button !== 1) {
            return;
        }

        let mousePos = { x: event.clientX, y: event.clientY };

        const handleMouseMove = (event: MouseEvent) => {
            const pos = { x: event.clientX, y: event.clientY };
            const newTranslate = limitTranslate(scale, {
                x: translate.x + (pos.x - mousePos.x) / scale,
                y: translate.y + (pos.y - mousePos.y) / scale,
            });
            mousePos = pos;
            translate = newTranslate;
            render();
        };

        const handleMouseUp = (event: MouseEvent) => {
            document.body.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.body.classList.add('dragging');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handlePercentageClick = () => {
        scale = 1;
        center();
    };

    const handleExportClick = async (event: MouseEvent) => {
        const url = await exportPng(!event.shiftKey, !event.ctrlKey && !event.metaKey);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindmap_export_${Date.now()}.png`;
        a.target = '_blank';
        a.click();
    };

    const changeTheme = (theme: 'dark' | 'light') => {
        document.body.classList.remove(`${theme === 'dark' ? 'light' : 'dark'}-theme`);
        document.body.classList.add(`${theme}-theme`);
        store.setTheme(theme);
    };

    const handleSwitchTheme = () => {
        const theme = store.getTheme();
        changeTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleFullscreen = () => {
        if (document.fullscreenElement || document.fullscreen) {
            document.exitFullscreen();
            fullscreenBtn.setAttribute('tooltip', 'Enter fullscreen');
        } else {
            document.documentElement.requestFullscreen();
            fullscreenBtn.setAttribute('tooltip', 'Exit fullscreen');
        }
    };

    container.addEventListener('wheel', handleContainerWheel);
    container.addEventListener('mousedown', handleContainerMouseDown);
    percentage.addEventListener('click', handlePercentageClick);
    exportBtn.addEventListener('click', handleExportClick);
    themeBtn.addEventListener('click', handleSwitchTheme);
    fullscreenBtn.addEventListener('click', handleFullscreen);
    hScrollBar.addEventListener('mousedown', handleHScrollBarMouseDown);
    vScrollBar.addEventListener('mousedown', handleVScrollBarMouseDown);

    changeTheme(store.getTheme());
    center();

    return {
        center,
        render,
        centerNode,
        scrollNodeIntoViewIfNeeded,
        getScale: () => scale,
        getTranslate: () => translate,
        getScroll: () => ({ left: scroll.v.left, top: scroll.h.top }),
        setScale: (s: number, r: boolean = true) => {
            scale = limitScale(s);
            r && render();
        },
        setTranslate: (t: { x: number, y: number }, r: boolean = true) => {
            translate = limitTranslate(scale, t);
            r && render();
        },
        setScroll,
        destroy: () => {
            container.removeEventListener('wheel', handleContainerWheel);
            container.removeEventListener('mousedown', handleContainerMouseDown);
            percentage.removeEventListener('click', handlePercentageClick);
            exportBtn.removeEventListener('click', handleExportClick);
            themeBtn.removeEventListener('click', handleSwitchTheme);
            fullscreenBtn.removeEventListener('click', handleFullscreen);
            hScrollBar.removeEventListener('mousedown', handleHScrollBarMouseDown);
            vScrollBar.removeEventListener('mousedown', handleVScrollBarMouseDown);
        },
    };
}