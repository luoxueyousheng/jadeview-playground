import type { ReactNode } from "react";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconOverview = () => <Glyph><path d="m2.5 9 7.5-6 7.5 6M4.5 8v8.5h4v-5h3v5h4V8" /></Glyph>;
export const IconAbout = () => <Glyph><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5m0-8.2v.1" /></Glyph>;
const IconWindow = () => <Glyph><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" /><path d="M2.5 7.5h15" /></Glyph>;
const IconLayout = () => <Glyph><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" /><path d="M8.5 3.5v13m0-6.5h9" /></Glyph>;
const IconResources = () => <Glyph><path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h4l2 2h6A1.5 1.5 0 0 1 17.5 8v6.5A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5Z" /></Glyph>;
const IconIPC = () => <Glyph><path d="M3 6h14m-3-3 3 3-3 3M17 14H3m3-3-3 3 3 3" /></Glyph>;
const IconSystem = () => <Glyph><rect x="2.5" y="3.5" width="15" height="11" rx="1.5" /><path d="M7 17.5h6m-3-3v3" /></Glyph>;
const IconPermissions = () => <Glyph><path d="M10 2.8 4 5.5v3.9c0 3.5 2.4 6.1 6 7.8 3.6-1.7 6-4.3 6-7.8V5.5Zm-2.3 7.4 1.5 1.5 3-3" /></Glyph>;
const IconMenus = () => <Glyph><rect x="3.5" y="3.5" width="13" height="13" rx="1.5" /><path d="M6.5 7h7m-7 3h7m-7 3h4" /></Glyph>;

export const GroupIcons: Record<string, () => ReactNode> = {
  windowing: IconWindow,
  layout: IconLayout,
  data: IconResources,
  communication: IconIPC,
  system: IconSystem,
  permissions: IconPermissions,
  menus: IconMenus,
};
