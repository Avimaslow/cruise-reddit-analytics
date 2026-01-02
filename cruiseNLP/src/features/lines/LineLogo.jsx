import { useEffect, useState } from "react";
import { fetchWikipediaThumbnail } from "../../api/wikiApi";

export default function LineLogo({ title }) {
  const [data, setData] = useState({ thumb: null, extract: "" });

  useEffect(() => {
    let alive = true;
    if (!title) return;
    fetchWikipediaThumbnail(title).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [title]);

  if (!title) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/40 flex items-center justify-center">
        {data.thumb ? (
          <img src={data.thumb} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-xs text-zinc-500">N/A</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div className="text-xs text-zinc-500 line-clamp-2">
          {data.extract ? data.extract : "Wikipedia summary unavailable (add backend proxy for reliability)."}
        </div>
      </div>
    </div>
  );
}
