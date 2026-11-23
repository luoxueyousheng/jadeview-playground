export const DEFAULT_WEB_POPUP = {
  url: "https://jade.run/",
  width: 880,
  height: 670,
};

/** window.open 的尺寸参数用 CSS 像素，JadeView 会按屏幕可用尺寸限制窗口。 */
export function webPopupFeatures(width: number, height: number) {
  return `popup,width=${width},height=${height}`;
}

export function webPopupSource({ url, width, height } = DEFAULT_WEB_POPUP) {
  return `// 在按钮点击处理函数中调用，保留触发弹窗所需的用户操作。
// JadeView 会接管此 HTTP(S) 弹窗。尺寸使用 CSS 像素。
const popup = window.open(
  ${JSON.stringify(url)},
  "_blank",
  ${JSON.stringify(webPopupFeatures(width, height))},
);

// 登录等场景可以继续使用浏览器的 WindowProxy 和 postMessage。
// 如果业务需要读取 window.opener，请保留这里的 opener 关系。`;
}
