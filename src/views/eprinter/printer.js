/**
 * 基础iframe打印
 * @param {HTMLElement} printDom - 要打印的DOM节点
 * @param {string} styleStr - 完整css字符串
 * @param {string} title - 打印窗口标题
 */
export function printByIframeBase(printDom, styleStr, title = "打印") {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;

    const htmlStr = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>${styleStr}</style></head>
    <body>${printDom.outerHTML}</body>
    </html>`;

    iframeDoc.open();
    iframeDoc.write(htmlStr);
    iframeDoc.close();

    console.log("[iframe DOM]", iframeDoc.documentElement.outerHTML);

    const doPrint = () => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            console.error("打印失败", e);
        } finally {
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }
    };

    if (iframe.contentWindow.document.readyState === "complete") {
        doPrint();
    } else {
        iframe.onload = doPrint;
    }
}

/**
 * 记账报表专用打印
 * @param {HTMLElement} printDom
 * @param {string} extraStyle - 追加额外样式
 */
export function ePrinter(printDom, extraStyle = "") {
    const baseStyle = `
@page{size:A4 portrait;margin:12mm}
@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:3px}}
`;
    const fullStyle = baseStyle + extraStyle;
    printByIframeBase(printDom, fullStyle, "打印");
}
