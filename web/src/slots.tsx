import { useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import type { RuntimeInfo } from "./bridge";
import type { ExampleMeta } from "./data/catalog";

/** 传给交互示例 Demo 组件的标准上下文参数 */
export interface DemoSlotProps {
  runtime: RuntimeInfo;
  theme: string;
}

/** 宿主可扩展的侧边栏分组定义 */
export interface NavGroupSlot {
  id: string;
  label: string;
  icon: string;
  items: string[];
}

/** 关于页附加的键值信息行 */
export interface AboutHostRow {
  label: string;
  value: ReactNode;
}

/** 前端预留插槽集合：供不同语言宿主（Go / Rust / Python / C# / C++ 等）或自定义前端模块注入 */
export interface PlaygroundSlots {
  /** 主窗口标题栏右侧自定义操作区（位于搜索框之后） */
  titlebarActions?: (ctx: { runtime: RuntimeInfo }) => ReactNode;
  /** 侧边栏导航列表顶部自定义区域 */
  sidebarHeader?: (ctx: { runtime: RuntimeInfo; collapsed: boolean }) => ReactNode;
  /** 侧边栏底部主题切换器上方自定义区域 */
  sidebarFooterBeforeTheme?: (ctx: { runtime: RuntimeInfo; collapsed: boolean }) => ReactNode;
  /** 概览页 Hero 区域附加内容（例如宿主徽章、快捷入口） */
  overviewHeroExtra?: (ctx: { runtime: RuntimeInfo }) => ReactNode;
  /** 关于页宿主信息卡片附加条目 */
  aboutHostRows?: (ctx: { runtime: RuntimeInfo }) => AboutHostRow[];
  /** 额外注册的侧边栏导航分组 */
  customNavGroups?: NavGroupSlot[];
  /** 额外注册的示例元数据（按 kind 索引） */
  customExamples?: Record<string, ExampleMeta>;
  /** 额外注册的交互式 Demo 渲染组件（按 kind 索引） */
  customDemos?: Record<string, ComponentType<DemoSlotProps>>;
}

declare global {
  interface Window {
    __JADE_PLAYGROUND_SLOTS__?: Partial<PlaygroundSlots>;
  }
}

let slots: PlaygroundSlots = {};
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function mergeSlots(base: PlaygroundSlots, patch: Partial<PlaygroundSlots>): PlaygroundSlots {
  return {
    ...base,
    ...patch,
    customNavGroups: patch.customNavGroups ?? base.customNavGroups,
    customExamples: patch.customExamples
      ? { ...base.customExamples, ...patch.customExamples }
      : base.customExamples,
    customDemos: patch.customDemos
      ? { ...base.customDemos, ...patch.customDemos }
      : base.customDemos,
  };
}

/** 注册或合并前端插槽扩展（可在应用初始化时或由宿主注入脚本调用） */
export function registerPlaygroundSlots(patch: Partial<PlaygroundSlots>): void {
  slots = mergeSlots(slots, patch);
  emit();
}

/** 重置已注册的插槽（主要用于测试隔离） */
export function resetPlaygroundSlots(): void {
  slots = {};
  emit();
}

/** 获取当前已解析的插槽集合（同时合并 window.__JADE_PLAYGROUND_SLOTS__ 全局注入） */
export function getPlaygroundSlots(): PlaygroundSlots {
  if (typeof window !== "undefined" && window.__JADE_PLAYGROUND_SLOTS__) {
    return mergeSlots(slots, window.__JADE_PLAYGROUND_SLOTS__);
  }
  return slots;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React Hook：订阅并返回最新前端插槽配置 */
export function usePlaygroundSlots(): PlaygroundSlots {
  return useSyncExternalStore(subscribe, getPlaygroundSlots, getPlaygroundSlots);
}
