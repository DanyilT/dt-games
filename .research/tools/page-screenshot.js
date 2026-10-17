/**
 * Bounce: a screenshot of the page as it is now, taken inside the page (paste into the Browser pane's console, or run
 * with its javascript tool): the DOM, each element with its computed style, and each canvas as a picture of itself, in
 * an SVG foreignObject, drawn on a canvas the size of the window and saved through nocache-server.py (PUT /__save/).
 *
 *     await pageScreenshot('desktop-screenshot.png')
 */
window.pageScreenshot = async function pageScreenshot(name, scale = 1) {
    const width = innerWidth;
    const height = innerHeight;

    // A copy of an element and everything in it, with its computed style written on it
    function copy(element) {
        if (element.nodeType === Node.TEXT_NODE) return document.createTextNode(element.textContent);
        if (element.nodeType !== Node.ELEMENT_NODE) return null;
        if (element.tagName === 'SCRIPT' || element.tagName === 'NOSCRIPT') return null;
        let clone;
        if (element.tagName === 'CANVAS') {
            clone = document.createElement('img');
            clone.src = element.toDataURL('image/png');
        } else {
            clone = element.cloneNode(false);
        }
        const style = getComputedStyle(element);
        let text = '';
        for (const property of style) text += `${property}:${style.getPropertyValue(property)};`;
        clone.setAttribute('style', text);
        for (const child of element.childNodes) {
            const copied = copy(child);
            if (copied) clone.appendChild(copied);
        }
        return clone;
    }

    const body = copy(document.body);
    body.style.margin = '0';
    // The page as it's scrolled now
    const wrapper = document.createElement('div');
    wrapper.setAttribute('style', `width:${width}px;height:${height}px;overflow:hidden;background:${getComputedStyle(document.body).backgroundColor}`);
    const inner = document.createElement('div');
    inner.setAttribute('style', `transform:translate(${-scrollX}px,${-scrollY}px)`);
    inner.appendChild(body);
    wrapper.appendChild(inner);
    const xhtml = new XMLSerializer().serializeToString(wrapper);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const response = await fetch(`/__save/${name}`, { method: 'PUT', body: blob });
    return `${name}: ${canvas.width} × ${canvas.height}, ${blob.size} bytes, ${response.status}`;
};
