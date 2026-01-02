export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-zinc-950/40 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none
                  focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-600 ${className}`}
      {...props}
    />
  );
}
