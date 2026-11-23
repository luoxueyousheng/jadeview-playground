import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, useReducedMotionConfig } from "motion/react";
import { FADE, SLIDE } from "../lib/motion";
import { ChevronIcon } from "./ui";
import { MotionScrollArea, ScrollArea } from "./ScrollArea";

export interface SelectItem { label: string; value: string; icon?: string }

export function Select({ items, value, label, disabled, title, menuMaxHeight, searchable, menuZIndex, onPick }: {
  items: ReadonlyArray<SelectItem>; value: string; label: string; disabled?: boolean; title?: string;
  menuMaxHeight?: number;
  /** 弹层顶部带输入框：选项多（产业、货物）时直接打字过滤，不用一屏屏滚 */
  searchable?: boolean;
  /** 下拉在模态框里时抬高：`.menu` 的默认层级低于 `.modal-host`，不抬会被模态盖住 */
  menuZIndex?: number;
  onPick: (value: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useRef({ text: "", at: 0 });
  /** 中文输入法是否正在组词（组词期间不过滤，见输入框的 composition 处理） */
  const composing = useRef(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, shown: false });
  const opened = open && !disabled && items.length > 0;
  /*
   * 过滤只在弹层里做，不改 `items`：`active` 与 `pick` 都按过滤后的列表走，
   * 命中与否只看选项文字本身（中文直接 includes，不需要拼音）。
   */
  const needle = query.trim().toLocaleLowerCase();
  const visible = needle
    ? items.filter(item => item.label.toLocaleLowerCase().includes(needle))
    : items;
  /** 当前选中项：触发器要显示它的图标，而不只是父组件传进来的文字 */
  const selected = items.find(item => item.value === value);
  const close = (restore = false) => { setOpen(false); setQuery(""); if (restore) triggerRef.current?.focus({ preventScroll: true }); };
  const show = (last = false) => {
    setQuery("");
    setActive(Math.max(0, last ? items.length - 1 : items.findIndex(item => item.value === value)));
    search.current = { text: "", at: 0 }; setPos(old => ({ ...old, shown: false })); setOpen(true);
  };
  /**
   * 上一次变化是不是用户自己点的选项。
   *
   * 早先只有"用户点了选项"才补间，是为了避开切仓库时列表"先空后满"造成的两次抽动。
   * 那个空档现在已经在数据层解决（`useWarehouseCargo` 保留上一座仓库的选项、
   * `WarehouseCard` 空档期整套定格），标签不会再中途跳一次，
   * 所以这里恢复成"宽度变了就补间"——切仓库切到货名不同的一栏也有过渡。
   * 只保留一条兜底：**选项列表为空时不补间**（那是"数据还没到"的占位文案）。
   */
  const pick = (index: number) => {
    const item = visible[index];
    if (item) { close(true); onPick(item.value); }
  };
  useEffect(() => { if (disabled || !items.length) setOpen(false); }, [disabled, items.length]);
  // 过滤条件一变就把高亮拉回第一条：否则还指着上次的第 20 项，而列表只剩 3 项
  useEffect(() => { setActive(0); }, [needle]);

  /*
   * 触发器宽度跟随内容，切换选项时补间过去。
   *
   * 宽度不能交给 CSS 过渡：内容自适应的 `width: auto` 没有可插值的起点。
   * 所以 label 一变就在绘制前量一次（此时元素已按新内容布局，用户还看不到），
   * 再把宽度钉回旧值、由 motion 补到新值；动画结束清掉内联宽度，元素回到 auto，
   * 字体或系统缩放变化后依然能自适应。
   *
   * 只对「宽度由内容决定」的触发器有意义：被 flex 拉满的（城市选择器）
   * 两次量到的值一样，这里直接返回，不插手布局。
   */
  const naturalWidth = useRef<number | null>(null);
  const widthAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const reduceMotion = useReducedMotionConfig();
  useLayoutEffect(() => {
    const node = triggerRef.current;
    if (!node) return;
    /*
     * 这个 effect 跑在 DOM 更新**之后**、绘制之前：此刻元素已经按新文字排好，
     * `offsetWidth` 就是新宽度。只有在上一轮宽度补间还没结束时，内联宽度
     * 才会盖住内容宽度——这时先把它读出来，当作这次的起点，避免中途跳一下。
     */
    const running = node.offsetWidth;
    widthAnimation.current?.stop();
    node.style.width = "";
    const next = node.offsetWidth;
    /*
     * 隐藏的标签页里量到 0：不能记成"内容宽度是 0"，否则下次显示再切换货物
     * 会从 0 撑开。等它真正进布局（下次 label 变化）再开始记录。
     */
    if (!next) return;
    const previous = naturalWidth.current;
    naturalWidth.current = next;
    /*
     * 选项列表为空 = 标签是"数据还没到"的占位文案（切存档、读失败）。
     * 这种变化不补间，直接跟过去；有真实选项时（含切仓库后货名变化）照常补间。
     */
    if (previous === null || previous === next || reduceMotion || !items.length) return;
    node.style.width = `${running === next ? previous : running}px`;
    widthAnimation.current = animate(node, { width: next }, {
      ...SLIDE,
      onComplete: () => { node.style.width = ""; },
    });
  }, [label, value, reduceMotion, items.length]);
  useLayoutEffect(() => {
    const trigger = triggerRef.current, menu = menuRef.current;
    if (!opened || !trigger || !menu) return;
    const rect = trigger.getBoundingClientRect(), size = menu.getBoundingClientRect();
    /*
     * 弹层至少和触发器等宽。
     * `.menu` 自身是内容自适应（min-width 108px），遇到「锯木厂」这种短选项就会缩成
     * 一条比触发器窄的窄缝，鼠标要往回够才能点，看着也别扭。下拉的弹层比触发器窄没有任何好处。
     */
    const width = Math.max(rect.width, size.width);
    const below = rect.bottom + 6;
    setPos({ top: below + size.height <= window.innerHeight - 8 ? below : Math.max(8, rect.top - 6 - size.height),
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), width, shown: true });
  }, [opened, items.length]);
  useLayoutEffect(() => {
    if (!opened || !pos.shown) return;
    // 可搜索时焦点在输入框上；否则直接落到当前项，方向键立刻可用
    if (searchable) { inputRef.current?.focus({ preventScroll: true }); return; }
    const option = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[Math.min(active, visible.length - 1)];
    option?.focus({ preventScroll: true });
    /*
     * 只滚菜单自己，绝不用 `scrollIntoView`。
     *
     * `scrollIntoView` 会挑"最近的可滚动祖先"——菜单没溢出时那个祖先就是文档，
     * 于是按方向键会滚一下页面，而下面的全局滚动监听把"菜单外的滚动"当成
     * "用户滚走了"直接关闭下拉：现象就是**按 ↓ 菜单消失**。
     */
    const menu = menuRef.current;
    if (menu && option) {
      const top = option.offsetTop;
      const bottom = top + option.offsetHeight;
      if (top < menu.scrollTop) menu.scrollTop = top;
      else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
    }
  }, [opened, pos.shown, active, visible.length, searchable]);
  useEffect(() => {
    if (!opened) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) close();
    };
    const resize = () => close(true);
    const scroll = (event: Event) => {
      // 菜单自己的滚动（方向键换项时会有）不算"用户滚走了"
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      close(true);
    };
    const focus = (event: FocusEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && event.target !== triggerRef.current) close();
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("focusin", focus);
    window.addEventListener("resize", resize); window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", focus);
      window.removeEventListener("resize", resize); window.removeEventListener("scroll", scroll, true);
    };
  }, [opened]);
  const listMaxHeight = typeof window === "undefined" ? menuMaxHeight ?? 320
    : Math.min(menuMaxHeight ?? 320, window.innerHeight - 16);
  const move = (delta: number) => setActive(previous =>
    (previous + delta + visible.length) % Math.max(1, visible.length));
  return <>
    <button ref={triggerRef} id={id + "-trigger"} type="button" className="select" title={title}
      aria-haspopup="listbox" aria-expanded={opened} aria-controls={opened ? id + "-list" : undefined}
      disabled={disabled || !items.length} onClick={() => opened ? close() : show()}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); event.stopPropagation();
          // 已展开时方向键应移动当前项；再调 show() 会把菜单重置，看起来像被关掉
          if (opened) { move(event.key === "ArrowUp" ? -1 : 1); return; }
          show(event.key === "ArrowUp");
        }
      }}>
      {selected?.icon
        ? <img className="select__item-icon" src={selected.icon} alt="" width={16} height={16} draggable={false} />
        : null}
      <span>{label}</span><ChevronIcon />
    </button>
    {typeof document !== "undefined" && createPortal(<AnimatePresence>
      {opened && <MotionScrollArea enabled={!searchable} ref={menuRef} id={id + "-list"} role="listbox" tabIndex={-1} aria-label={title || label}
      /*
       * 进出场走 motion，和项目其它浮层一致（`FADE`）。
       * 用 `AnimatePresence` 包住，是因为关闭时元素要先播 `exit` 再卸载——
       * 直接 `{opened && …}` 条件渲染会立刻移除节点，退出动画永远看不到。
       */
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={FADE}
      aria-activedescendant={opened && visible[Math.min(active, visible.length - 1)] ? `${id}-opt-${Math.min(active, visible.length - 1)}` : undefined}
      data-focus-owner={id + "-trigger"} className="menu"
      style={{ top: pos.top, left: pos.left, visibility: pos.shown ? "visible" : "hidden",
        minWidth: pos.width || undefined, zIndex: menuZIndex,
        // 可搜索时滚动条交给里面的列表，搜索框不跟着滚走
        ...(searchable ? {} : { maxHeight: listMaxHeight, overflowY: "auto" as const }) }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
        if (event.key === "Tab") { close(true); return; }
        // 过滤到一条不剩时只剩"关掉"有意义，别去算 0 取模
        if (!visible.length) return;
        // 输入框里 Home/End 该移动光标，只有不可搜索时才当下拉导航用
        const next = event.key === "ArrowDown" ? (active + 1) % visible.length
          : event.key === "ArrowUp" ? (active + visible.length - 1) % visible.length
          : !searchable && event.key === "Home" ? 0
          : !searchable && event.key === "End" ? visible.length - 1 : null;
        if (next !== null) { event.preventDefault(); event.stopPropagation(); setActive(next); return; }
        // 空格在输入框里要能打出来，只有不可搜索时才当"确认"
        if (event.key === "Enter" || (!searchable && event.key === " ")) {
          event.preventDefault(); event.stopPropagation(); pick(active); return;
        }
        if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault(); event.stopPropagation();
          const now = Date.now(); const text = (now - search.current.at < 700 ? search.current.text : "") + event.key;
          search.current = { text, at: now };
          const found = visible.findIndex(item => item.label.toLocaleLowerCase().startsWith(text.toLocaleLowerCase()));
          if (found >= 0) setActive(found);
        }
      }}>
      {searchable && <div className="menu__search">
        <input ref={inputRef} type="text" value={query} placeholder="搜索…" aria-label={`搜索${title || label}`}
          spellCheck={false} autoComplete="off"
          /*
           * 中文输入法：拼音阶段不要过滤。
           * 打「famuyingdi」时 value 一直是拼音字母，列表会被滤成空的，看起来像"没这个产业"；
           * 等上屏（compositionend）再拿最终文本过滤。
           */
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={event => { composing.current = false; setQuery(event.currentTarget.value); }}
          onChange={event => { if (!composing.current) setQuery(event.target.value); }} />
      </div>}
      <ScrollArea enabled={searchable} className={searchable ? "menu__list" : undefined}
        style={searchable ? { maxHeight: listMaxHeight - 44, overflowY: "auto" } : undefined}>
        {visible.map((item, index) => <button key={item.value} id={`${id}-opt-${index}`} type="button" role="option" aria-selected={item.value === value}
          tabIndex={-1}
          /*
           * 两个状态要分开画：
           *   `--on`     = 已经选中的值（常驻，表示"当前是这个"）
           *   `--active` = 键盘/鼠标正在指的那一项（跟着方向键走）
           * 之前只有 `--on`，方向键改了 `active` 却没有任何视觉变化，
           * 看起来就是"按键切不过去"——其实选中项在变，只是看不见。
           */
          className={[
            "menu__item",
            item.value === value ? "menu__item--on" : "",
            index === active ? "menu__item--active" : "",
          ].filter(Boolean).join(" ")}
          data-active={index === active || undefined}
          onPointerEnter={() => setActive(index)} onClick={() => pick(index)}>
          {item.icon && <img className="select__item-icon" src={item.icon} alt="" width={18} height={18} draggable={false} />}{item.label}
        </button>)}
        {searchable && !visible.length && <p className="menu__empty">没有匹配的选项</p>}
      </ScrollArea>
    </MotionScrollArea>}
    </AnimatePresence>, document.body)}
  </>;
}
