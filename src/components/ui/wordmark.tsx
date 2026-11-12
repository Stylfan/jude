/**
 * The mark: two thin rings that overlap, two people in a conversation,
 * with a sand point where they meet, and the name in spaced capitals.
 * Decorative to assistive technology; the link around it carries the name.
 */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true">
        <circle cx="9" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="17" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="10" r="1.9" fill="var(--color-bronze)" />
      </svg>
      <span className="text-[13px] font-semibold tracking-[0.32em]">JUDE</span>
    </span>
  );
}
