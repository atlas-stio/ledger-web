/**
 * 基础iframe打印（不带内置样式，只负责把dom塞进iframe打印）
 * @param {HTMLElement} printDom - 要打印的DOM节点
 * @param {string} styleStr - 完整css字符串
 * @param {string} title - 打印窗口标题
 */
export function printByIframeBase(printDom, styleStr = "", title = "打印") {
    if (!printDom) return;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;width:0;height:0;left:-9999px;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    iframeDoc.write(`<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>${title}</title><style>${styleStr}</style></head>
      <body>${printDom.outerHTML}</body>
    </html>`);
    iframeDoc.close();
    iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 100);
    };
}

/**
 * 记账报表专用打印（封装好内置样式，直接调用）
 * @param {HTMLElement} printDom
 * @param {string} extraStyle - 追加额外样式
 */
export function ePrinter(printDom, extraStyle = "") {
    const baseStyle = `@page {size: A4 portrait;margin: 12mm;}`;
    const fullStyle = baseStyle + extraStyle;
    printByIframeBase(printDom, fullStyle, "打印");
}
