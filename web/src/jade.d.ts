import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    /** JadeView 的可拖拽区域（无边框 / 覆盖层标题栏窗口）。 */
    "jade-region-drag"?: string;
    /** 排除在拖拽区域之外的交互控件。 */
    "jade-region-no-drag"?: string;
    /** 允许元素内出现原生右键菜单。 */
    "jade-allow-contextmenu"?: string;
  }
}
