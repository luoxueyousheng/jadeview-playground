import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotionConfig as useReducedMotion } from "motion/react";
import { FADE, SLIDE } from "../lib/motion";
import { ChevronIcon } from "./ui";

/** In-card disclosure, using the same Motion transitions as Sheet. */
export function Disclosure({ title, hint, tooltip, trailing, prominent = false, defaultOpen = false, children }: {
  /** 标题。允许是节点——比如"正在确认存档"时放一个加载动画（见 `AccountCard`）。 */
  title: ReactNode;
  hint?: string;
  /** 悬浮在标题（+金额）上的补充说明。挂在内层文字上，不占按钮的点击语义。 */
  tooltip?: string;
  /** 标题右侧的次要信息（如账单时间 / 笔数），排在箭头之前。 */
  trailing?: ReactNode;
  prominent?: boolean;
  /** 首次渲染就展开（「常用」页的账单默认要能看到明细）。 */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div className="disclosure">
      <button type="button" className="disclosure__trigger" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(value => !value)}>
        <span className={`disclosure__label${prominent ? " disclosure__label--amount" : ""}`} title={tooltip}>
          {title}
        </span>
        {trailing ? <span className="disclosure__trailing">{trailing}</span> : null}
        {hint ? <span className="disclosure__hint">{hint}</span> : null}
        <motion.span className="disclosure__chevron" animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : FADE}>
          <ChevronIcon />
        </motion.span>
      </button>
      <div id={id} aria-hidden={!open} inert={!open}>
        <AnimatePresence initial={false}>
          {open ? <motion.div key="content" className="disclosure__body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} aria-hidden={!open} inert={!open}
            transition={reduceMotion ? { duration: 0 } : { height: SLIDE, opacity: FADE }}>
            {children}
          </motion.div> : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
