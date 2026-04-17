export function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block bg-primary text-primary-foreground px-3 py-1 text-[10px] tracking-[0.25em] uppercase">
      {label}
    </span>
  );
}
