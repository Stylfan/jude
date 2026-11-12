import { cn } from "@/lib/cn";
import { HintIcon } from "./hint-icon";

/**
 * Page structure for the quiet pages around the conversation (profile,
 * account, sign-in): a small uppercase label, titled sections, white
 * panels and settings as rows with the label left and the control right.
 */

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase", className)}
    >
      {children}
    </p>
  );
}

/** A titled block of a page. */
export function Section({
  label,
  hint,
  children,
  id,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="flex flex-col gap-3"
    >
      <h2
        id={id ? `${id}-title` : undefined}
        className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase"
      >
        {label}
        {hint && <HintIcon text={hint} />}
      </h2>
      {children}
    </section>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-hairline-soft bg-surface px-4 sm:px-5", className)}
      {...props}
    />
  );
}

/** A setting: the label (and a short hint) to the left, the control to the right. */
export function SettingRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-2 border-b border-hairline-soft py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 flex-col gap-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[14px] font-medium text-ink">
            {label}
          </label>
        ) : (
          <span className="text-[14px] font-medium text-ink">{label}</span>
        )}
        {hint && <div className="text-[13px] leading-relaxed text-slate">{hint}</div>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">{children}</div>
    </div>
  );
}
