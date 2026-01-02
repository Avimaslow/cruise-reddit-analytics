export function Button({ className = "", variant = "primary", ...props }) {
  const base = "px-3 py-2 rounded-xl text-sm font-medium border transition";
  const styles =
    variant === "ghost"
      ? "bg-transparent border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40"
      : "bg-orange-500/90 border-orange-500/50 hover:bg-orange-500 text-zinc-950";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
