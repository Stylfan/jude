"use client";

import { cn } from "@/lib/cn";

/**
 * The few form parts of Jude's quiet screens: a labelled field, white with
 * a thin line and a clear focus; a select with a slim arrow; and a row of
 * equal segments for a choice of three.
 */

const FIELD =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-slate/60 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[12.5px] text-slate">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] text-slate">{hint}</p>}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(FIELD, props.className)} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cn(FIELD, "resize-none", props.className)} />;
}

// Set as a style, not a class: the class merger would take an image class for a colour
// and drop the white background.
const ARROW: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%235C6A6F' stroke-width='1.4'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 12px center",
  backgroundRepeat: "no-repeat",
};

export function Select({
  options,
  ...props
}: React.ComponentProps<"select"> & {
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <select
      {...props}
      style={{ ...ARROW, ...props.style }}
      className={cn(FIELD, "appearance-none pr-9", props.className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-slate">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid overflow-hidden rounded-[10px] border border-line bg-surface"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              "py-2.5 text-[13.5px] transition-colors",
              i > 0 && "border-l border-line",
              o.value === value ? "bg-ink text-paper" : "text-ink hover:bg-sand/60",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The one filled button of a screen: full width, at the bottom. */
export function PrimaryButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "w-full rounded-xl bg-ink py-3.5 text-[15px] text-paper transition-colors hover:bg-ink-soft disabled:opacity-50",
        className,
      )}
    />
  );
}

export function QuietButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn("py-1.5 text-[13px] text-slate hover:text-ink", className)}
    />
  );
}
