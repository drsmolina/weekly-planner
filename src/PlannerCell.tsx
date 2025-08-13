import React, { useLayoutEffect, useRef, useState } from "react";
import { Cell } from "./types";

export function PlannerCell({
  value,
  onChange,
  onToggleDone,
}: {
  value: Cell | undefined;
  onChange: (v: Cell) => void;
  onToggleDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const text = value?.text ?? "";
  const done = value?.done ?? false;
  const sizes = ["text-base", "text-sm", "text-xs", "text-[10px]"];
  const [sizeClass, setSizeClass] = useState(sizes[0]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let chosen = sizes[sizes.length - 1];
    for (const size of sizes) {
      el.classList.remove(...sizes);
      el.classList.add(size);
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) {
        chosen = size;
        break;
      }
    }
    el.classList.remove(...sizes);
    setSizeClass(chosen);
  }, [text]);

  return (
    <div className="group relative h-12 border-l border-b border-gray-200 p-1 overflow-hidden">
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition">
        <button
          className={`h-5 w-5 grid place-items-center rounded-full border ${
            done ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500"
          }`}
          title={done ? "Mark as not done" : "Mark done"}
          onClick={onToggleDone}
        >
          ✓
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`h-full w-full overflow-hidden break-words outline-none leading-snug whitespace-pre-wrap ${sizeClass} ${
          done ? "line-through text-gray-400" : "text-gray-800"
        }`}
        onBlur={(e) => onChange({ text: e.currentTarget.innerText.trim(), done })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLDivElement).blur();
          }
        }}
      >
        {text}
      </div>
    </div>
  );
}
