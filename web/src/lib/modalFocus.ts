import { useLayoutEffect, useRef } from "react";

const SELECTOR = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';
const stack: HTMLElement[] = [];
const locks = new Map<HTMLElement, { count: number; previous: boolean }>();
function visible(element: HTMLElement) {
  return !element.closest('[inert], [hidden], [aria-hidden="true"]') && !element.matches(':disabled')
    && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}
function owns(root: HTMLElement, node: Node | null): boolean {
  if (!node) return false;
  if (root.contains(node)) return true;
  const popup = node instanceof Element ? node.closest<HTMLElement>('[data-focus-owner]') : null;
  const owner = popup?.dataset.focusOwner ? document.getElementById(popup.dataset.focusOwner) : null;
  return !!owner && root.contains(owner);
}
function background(root: HTMLElement) {
  const blocked: HTMLElement[] = [];
  let branch: HTMLElement = root;
  while (branch.parentElement) {
    const parent = branch.parentElement;
    for (const sibling of parent.children) {
      if (!(sibling instanceof HTMLElement) || sibling === branch
        || sibling.matches('script, style, link, .toast-host, [role="tooltip"], .sheet-backdrop, .startup__drag, [data-modal-window-drag]') || owns(root, sibling)) continue;
      const lock = locks.get(sibling) ?? { count: 0, previous: sibling.inert };
      lock.count++; locks.set(sibling, lock); sibling.inert = true; blocked.push(sibling);
    }
    if (parent === document.body) break;
    branch = parent;
  }
  return () => {
    for (const element of blocked) {
      const lock = locks.get(element);
      if (lock && --lock.count === 0) { element.inert = lock.previous; locks.delete(element); }
    }
  };
}

let releaseBackground = () => {};
function isolateTop() {
  releaseBackground();
  const top = stack.at(-1);
  releaseBackground = top ? background(top) : () => {};
}

/** Body portals identify their trigger with data-focus-owner. Native dialogs retain their own focus behavior. */
export function useModalFocus<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const ref = useRef<T>(null);
  const escape = useRef(onEscape);
  escape.current = onEscape;
  useLayoutEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stack.push(root);
    isolateTop();
    const top = () => stack.at(-1) === root && !document.querySelector('dialog:modal');
    const focusRoot = () => root.focus({ preventScroll: true });
    focusRoot();
    const onFocus = (event: FocusEvent) => { if (top() && !owns(root, event.target as Node)) focusRoot(); };
    const onKey = (event: KeyboardEvent) => {
      if (!top() || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); escape.current?.(); return;
      }
      if (event.key !== "Tab") return;
      if (!root.contains(document.activeElement) && owns(root, document.activeElement)) return;
      const items = [...root.querySelectorAll<HTMLElement>(SELECTOR)].filter(element => element.tabIndex >= 0 && visible(element));
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); focusRoot(); return; }
      if (!root.contains(document.activeElement) || document.activeElement === root) {
        event.preventDefault(); (event.shiftKey ? last! : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last!.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("focusin", onFocus); document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocus); document.removeEventListener("keydown", onKey);
      const wasTop = stack.at(-1) === root;
      const index = stack.indexOf(root); if (index >= 0) stack.splice(index, 1);
      isolateTop();
      if (wasTop && previous?.isConnected && visible(previous)) previous.focus({ preventScroll: true });
      else if (wasTop) stack.at(-1)?.focus({ preventScroll: true });
    };
  }, [active]);
  return ref;
}
