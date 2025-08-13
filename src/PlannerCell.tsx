import React, { useRef } from "react";
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
  const len = text.length;
  const sizeClass = len < 40 ? "text-base" : len < 120 ? "text-sm" : "text-xs";

  return (
    <div className="group relative h-12 border-l border-b border-gray-200 p-1">
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
        className={`h-full w-full outline-none leading-snug whitespace-pre-wrap ${sizeClass} ${
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
