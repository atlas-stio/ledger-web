/**
 * 基础iframe打印
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
// export function printByIframeBase(printDom, styleStr = "", title = "打印") {
//     if (!printDom) return;
//     console.log("==== 打印样式字符串 ====");
//     console.log(styleStr); // 重点：看这里有没有完整css，有没有被截断
//     const iframe = document.createElement("iframe");
//     iframe.style.cssText = "position:fixed;top:10px;left:10px;width:900px;height:1100px;z-index:9999;";
//     document.body.appendChild(iframe);

//     const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
//     iframeDoc.write(`<!DOCTYPE html>
//     <html><head>
//         <meta charset="UTF-8">
//         <title>${title}</title>
//         <style>${styleStr}</style>
//     </head>
//     <body>${printDom.outerHTML}</body>
//     </html>`);
//     iframeDoc.close();
// }
// export function printByIframeBase(printDom, styleStr = "", title = "打印") {
//     if (!printDom) return;

//     // 拼接完整html
//     const html = `<!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <title>${title}</title>
//         <style>${styleStr}</style>
//     </head>
//     <body>${printDom.outerHTML}</body>
//     </html>`;

//     const iframe = document.createElement("iframe");
//     // 重点：srcdoc，不用document.write
//     iframe.srcdoc = html;
//     iframe.style.cssText = "position:absolute;width:0;height:0;left:-9999px;";
//     document.body.appendChild(iframe);

//     const iframeWin = iframe.contentWindow;
//     let printed = false;
//     const doPrint = () => {
//         if (printed) return;
//         printed = true;
//         iframeWin.focus();
//         iframeWin.print();
//         setTimeout(() => {
//             iframe.remove();
//         }, 1000);
//     };
//     iframe.onload = doPrint;
//     setTimeout(doPrint, 400);
// }
// export function printByIframeBase(printDom, styleStr = "", title = "打印") {
//     if (!printDom) return;

//     const html = `<!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <title>${title}</title>
//         <style>${styleStr}</style>
//     </head>
//     <body>${printDom.outerHTML}</body>
//     </html>`;

//     const iframe = document.createElement("iframe");
//     iframe.srcdoc = html;
//     // ✅ 重点：放在可视区域内，但是透明度0，不能移出屏幕
//     iframe.style.cssText = `
//         position: fixed;
//         top: 0;
//         left: 0;
//         width: 800px;
//         height: 1100px;
//         opacity: 0;
//         pointer-events: none;
//         z-index: -9999;
//     `;
//     document.body.appendChild(iframe);

//     const iframeWin = iframe.contentWindow;
//     let printed = false;
//     const doPrint = () => {
//         if (printed) return;
//         printed = true;
//         iframeWin.focus();
//         iframeWin.print();
//         setTimeout(() => {
//             iframe.remove();
//         }, 1000);
//     };
//     iframe.onload = doPrint;
//     setTimeout(doPrint, 400);
// }
// export function printByIframeBase(printDom, styleStr = "", title = "打印") {
//     if (!printDom) return;

//     const html = `<!DOCTYPE html>
//   <html>
//   <head>
//       <meta charset="UTF-8">
//       <title>${title}</title>
//       <style>${styleStr}</style>
//   </head>
//   <body>${printDom.outerHTML}</body>
//   <script>
//         // 强制等所有样式加载、强制布局
//         function triggerPrint(){
//             // 强制回流
//             document.body.offsetHeight;
//             window.print();
//         }
//         // 给足够长的时间，低版本chrome解析css慢
//         window.onload = function(){
//             setTimeout(triggerPrint, 500);
//         }
//   </script>
//   </html>`;

//     const printWin = window.open("", "_blank", "width=900,height=1200,scrollbars=yes");
//     if (!printWin) {
//         alert("弹窗被拦截，请允许此网站弹出窗口！");
//         return;
//     }

//     printWin.document.open();
//     printWin.document.write(html);
//     printWin.document.close();

//     // 打印弹窗出来后，延时关闭窗口，不能马上关
//     printWin.addEventListener("afterprint", () => {
//         setTimeout(() => {
//             printWin.close();
//         }, 200);
//     });
// }

/**
 * 记账报表专用打印
 * @param {HTMLElement} printDom
 * @param {string} extraStyle - 追加额外样式
 */
export function ePrinter(printDom, extraStyle = "") {
    const baseStyle = `@page{size: A4 portrait;margin: 12mm;}`;
    const fullStyle = baseStyle + extraStyle;
    printByIframeBase(printDom, fullStyle, "打印");
}
