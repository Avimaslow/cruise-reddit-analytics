/* =========================
   2) SentimentDonut.jsx (RESPONSIVE + NO OVERLAP)
   - Uses ResponsiveContainer so it never overflows
   - Legend at bottom so it doesn’t push width
   - No fixed pixel width hardcoding
   ========================= */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

export default function SentimentDonut({ summary }) {
  const neg = summary?.neg_count ?? 0;
  const neu = summary?.neu_count ?? 0;
  const pos = summary?.pos_count ?? 0;

  const data = [
    { name: "Negative", value: neg, key: "neg" },
    { name: "Neutral", value: neu, key: "neu" },
    { name: "Positive", value: pos, key: "pos" },
  ].filter((d) => d.value > 0);

  // If all zero, still render something stable
  const safeData = data.length ? data : [{ name: "No data", value: 1, key: "none" }];

  const colors = {
    neg: "rgba(239,68,68,0.85)",     // red-500
    neu: "rgba(161,161,170,0.75)",   // zinc-400
    pos: "rgba(34,197,94,0.85)",     // emerald-500
    none: "rgba(82,82,91,0.65)",     // zinc-600
  };

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: "rgba(9,9,11,0.92)",
              border: "1px solid rgba(63,63,70,0.8)",
              borderRadius: 10,
              color: "white",
            }}
            itemStyle={{ color: "white" }}
          />
          <Pie
            data={safeData}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            cx="50%"
            cy="45%"
            stroke="rgba(63,63,70,0.9)"
            strokeWidth={1}
          >
            {safeData.map((entry) => (
              <Cell key={entry.key} fill={colors[entry.key] || colors.none} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={40}
            wrapperStyle={{
              fontSize: 12,
              color: "rgba(161,161,170,1)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
