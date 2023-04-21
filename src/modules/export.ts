export async function exportPng(
    withBackground: boolean = true,
    withPadding: boolean = true,
): Promise<string> {
    const content = document.querySelector('.content') as HTMLElement;

    const padding = withPadding ? { x: 20, y: 20 } : { x: 0, y: 0 };
    const width = content.clientWidth + padding.x * 2;
    const height = content.clientHeight + padding.y * 2;

    const contentCopy = content.cloneNode(true) as HTMLElement;
    contentCopy.querySelector('.drag-line').remove();
    contentCopy.removeAttribute('style');
    const style = document.createElement('style');
    style.innerHTML = `
        .content {
            position: absolute;
            top: 0;
            left: 0;
            width: ${width}px;
            height: ${height}px;
            padding: ${padding.y}px ${padding.y}px;
            z-index: 1;
            transform-origin: 0 0;
            ${withBackground ? 'background-color: #fff;' : ''}
        }
        .map {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: visible;
        }
        .line {
            position: absolute;
            top: ${padding.y}px;
            left: ${padding.x}px;
            width: ${width}px;
            height: ${height}px;
            overflow: visible;
        }
        .node {
            position: absolute;
            max-width: 300px;
            min-height: 36px;
            width: max-content;
            height: max-content;
            border: 2px solid transparent;
            color: #333;
            background-color: #eee;
            border-radius: 6px;
            padding: 5px 10px;
            font-size: 14px;
            line-height: 22px;
            box-sizing: border-box;
            cursor: pointer;
            user-select: none;
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .node:empty:before {
            content: attr(placeholder);
            color: #999;
        }
        .node.central {
            padding: 8px 12px;
            font-size: 20px;
            line-height: 30px;
            color: #fff;
            background-color: #395bff;
        }
        .node.central:empty:before {
            color: #ccc;
        }
        .node.main {
            font-size: 16px;
            line-height: 26px;
            background-color: #eee;
        }
        .node.normal {
            background-color: #fff;
        }
    `;
    contentCopy.prepend(style);

    const svg = domToSvg(contentCopy, width, height);
    const png = await svgToPng(svg);

    return png;
}

function domToSvg(dom: HTMLElement, width: number, height: number) {
    const parser = new XMLSerializer();
    const xhtml = parser.serializeToString(dom);
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <foreignObject x="0" y="0" width="${width}" height="${height}" style="overflow: visible;">${xhtml}</foreignObject>
    </svg>`;
    return svg;
}

function svgToUrl(svg: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const fileReader = new FileReader();
        fileReader.onload = () => {
            resolve(fileReader.result as string);
        };
        fileReader.onabort = event => {
            console.error('read file abort', event);
            reject(event);
        };
        fileReader.onerror = event => {
            console.error('read file error', event);
            reject(event);
        };
        fileReader.readAsDataURL(blob);
    });
}

async function svgToPng(svg: string): Promise<string> {
    const url = await svgToUrl(svg);
    const image = new Image();
    image.setAttribute('crossorigin', 'anonymous');
    await loadImage(image, url);

    const ratio = window.devicePixelRatio || 1;
    const imgWidth = image.naturalWidth || image.width;
    const imgHeight = image.naturalHeight || image.height;
    const drawWidth = imgWidth * ratio;
    const drawHeight = imgHeight * ratio;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('get context of canvas failed');
        }

        ctx.scale(ratio, ratio);
        ctx.drawImage(image, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        if (dataUrl.length < 10) {
            throw new Error('image is too large to export');
        }

        return dataUrl;
    } catch (e) {
        console.error('draw image error', e);
        throw e;
    }
}

function loadImage(image: HTMLImageElement, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = e => {
            console.error('loading image error', e);
            reject(e);
        };
        image.onabort = e => {
            console.error('loading image abort', e);
            reject(e);
        };
        image.src = url;
        image.complete && resolve();
    });
}
