/** The Prelegal wordmark; `light` is for use on the navy primary background. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-heading font-semibold tracking-tight ${light ? "text-surface" : "text-primary"}`}>
      <span
        className={`grid size-7 place-items-center rounded-md text-body font-semibold ${light ? "bg-surface text-primary" : "bg-primary text-surface"}`}
      >
        P
      </span>
      Prelegal
    </span>
  );
}
