import { MutableRefObject, useLayoutEffect } from "react";

/**
 * Auto-fits the font size inside an element to prevent overflow.
 * It shrinks (or grows back) between min..max, watching:
 *  - text changes
 *  - container resize (e.g., window size, column width changes)
 */
export function useAutoFit(
  ref: MutableRefObject<HTMLElement | null>,
  deps: unknown[] = [],
  opts: { min?: number; max?: number; step?: number; lineHeight?: number; paddingPx?: number } = {}
) {
  const { min = 10, max = 16, step = 1, lineHeight = 1.15, paddingPx = 2 } = opts;

  useLayoutEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const parent = el.parentElement as HTMLElement | null;
    if (!parent) return;

    // one pass fit using a simple downscale loop (fast for tiny ranges)
    const fit = () => {
      // start big, shrink as needed
      let size = max;
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = `${lineHeight}`;
      // make sure long words wrap
      el.style.whiteSpace = "pre-wrap";
      el.style.wordBreak = "break-word";
      el.style.overflow = "hidden";

      const maxH = Math.max(0, parent.clientHeight - paddingPx);
      const maxW = Math.max(0, parent.clientWidth - paddingPx);

      // shrink while overflowing
      // guard against infinite loop with a small floor
      while (size > min && (el.scrollHeight > maxH || el.scrollWidth > maxW)) {
        size -= step;
        el.style.fontSize = `${size}px`;
      }
      // Optional grow-back pass: if there's lots of free space and text changed
      while (size < max && el.scrollHeight <= maxH && el.scrollWidth <= maxW) {
        const test = size + step;
        el.style.fontSize = `${test}px`;
        if (el.scrollHeight > maxH || el.scrollWidth > maxW) {
          el.style.fontSize = `${size}px`;
          break;
        }
        size = test;
      }
    };

    // Run once now
    fit();

    // Watch size changes of the cell
    const ro = new ResizeObserver(() => fit());
    ro.observe(parent);

    // Watch text changes inside the contentEditable
    const mo = new MutationObserver(() => fit());
    mo.observe(el, { childList: true, characterData: true, subtree: true });

    // Also refit on next frame in case layout hasn’t settled
    const raf = requestAnimationFrame(fit);

    return () => {
      ro.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
