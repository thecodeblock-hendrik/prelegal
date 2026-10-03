/** The Prelegal wordmark: a navy name with an accent-yellow mark. */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${light ? "text-white" : "text-navy"}`}>
      <span className="grid size-7 place-items-center rounded-md bg-accent text-sm font-bold text-navy">P</span>
      Prelegal
    </span>
  );
}
