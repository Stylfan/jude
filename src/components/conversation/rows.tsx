"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The front page's building blocks, phone first (design/forside-2a.html):
 * sections that fold open, and open rows on the paper with the label on
 * the left and the answer on the right, separated by hairlines. Text is
 * typed straight into the row; a choice folds out as round buttons right
 * under it, with "+ Tilføj" for a word of your own.
 */

export function Fold({
  num,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  num: string;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className="border-t border-hairline last-of-type:border-b">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="grid w-full grid-cols-[34px_1fr_18px] items-center py-4 text-left"
      >
        <span className="text-[15px] font-medium text-bronze">{num}</span>
        <span>
          <span className="block text-[16.5px] leading-snug">{title}</span>
          {summary && <span className="block text-[12.5px] text-slate">{summary}</span>}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={cn(
            "size-4 text-slate transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="-mb-3 text-[11px] font-medium tracking-[0.14em] text-bronze uppercase">
      {children}
    </p>
  );
}

const ROW = "grid min-h-[50px] items-center gap-4 border-b border-hairline";

export function TextRow({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  numeric?: boolean;
  maxLength: number;
}) {
  return (
    <label className={cn(ROW, "grid-cols-[auto_1fr] focus-within:border-ink")}>
      <span className="text-[14.5px] text-slate">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={numeric ? "numeric" : "text"}
        autoComplete="off"
        maxLength={maxLength}
        className="w-full min-w-0 bg-transparent py-3 text-right text-[16px] outline-none placeholder:text-[#a9a198]"
      />
    </label>
  );
}

export type Choice = { value: string; label: string; disabled?: boolean };

export function PickRow({
  label,
  shown,
  choices,
  selected,
  onPick,
  multi,
  addLabel,
  addPlaceholder,
  empty,
}: {
  label: string;
  /** What the row shows on the right. */
  shown: string;
  /** Shown, faint, while nothing is chosen. */
  empty: string;
  choices: Choice[];
  selected: string[];
  /** A choice, or a word of the person's own from "+ Tilføj". */
  onPick: (value: string) => void;
  multi?: boolean;
  addLabel?: string;
  addPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [word, setWord] = useState("");
  const id = useId();

  const pick = (value: string) => {
    onPick(value);
    if (!multi) setOpen(false);
  };
  const add = () => {
    const w = word.trim();
    if (!w) return;
    pick(w.charAt(0).toUpperCase() + w.slice(1));
    setWord("");
    setAdding(false);
  };

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(ROW, "w-full grid-cols-[auto_1fr] text-left")}
      >
        <span className="text-[14.5px] text-slate">{label}</span>
        <span className="flex items-center justify-end gap-2.5 text-right text-[16px]">
          <span className={cn("truncate", !shown && "text-[#a9a198]")}>{shown || empty}</span>
          <span
            aria-hidden
            className={cn(
              "size-[7px] shrink-0 border-r-[1.5px] border-b-[1.5px] border-line transition-transform motion-reduce:transition-none",
              open ? "rotate-45" : "-rotate-45",
            )}
          />
        </span>
      </button>
      {open && (
        <div id={id} className="flex flex-wrap gap-2 border-b border-hairline pt-2.5 pb-3.5">
          {choices.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={c.disabled}
              aria-pressed={selected.includes(c.value)}
              onClick={() => pick(c.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors",
                selected.includes(c.value)
                  ? "border-ink bg-ink text-paper"
                  : "border-line hover:bg-sand/60",
                c.disabled && "cursor-default border-dashed text-[#b3aca3] hover:bg-transparent",
              )}
            >
              {c.label}
            </button>
          ))}
          {addLabel &&
            (adding ? (
              <input
                autoFocus
                value={word}
                maxLength={40}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                  if (e.key === "Escape") setAdding(false);
                }}
                onBlur={add}
                placeholder={addPlaceholder}
                className="w-44 border-b-[1.5px] border-ink bg-transparent px-0.5 py-1 text-[14px] outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-full border border-dashed border-bronze px-3.5 py-1.5 text-[13.5px] text-bronze-deep"
              >
                {addLabel}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
