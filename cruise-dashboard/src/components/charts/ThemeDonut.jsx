/* =========================
   3) ThemeDonut.jsx (RESPONSIVE + SAFE LABELS)
   - ResponsiveContainer so it never overflows
   - Uses top N themes (default 8) + “Other”
   - Legend bottom to avoid width overflow
   ========================= */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

export default function ThemeDonut({ themes, topN = 8 }) {
  const rows = Array.isArray(themes) ? themes : [];

  const cleaned = rows
    .map((t) => ({
      name: t?.theme_label || "—",
      value: Number(t?.n ?? 0),
    }))
    .filter((d) => d.value > 0);

  const sorted = [...cleaned].sort((a, b) => b.value - a.value);

  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const otherValue = rest.reduce((acc, r) => acc + r.value, 0);

  const data = otherValue > 0 ? [...top, { name: "Other", value: otherValue }] : top;

  const palette = [
    "rgba(96,165,250,0.85)",
    "rgba(249,115,22,0.85)",
    "rgba(239,68,68,0.85)",
    "rgba(20,184,166,0.85)",
    "rgba(234,179,8,0.85)",
    "rgba(167,139,250,0.85)",
    "rgba(34,197,94,0.85)",
    "rgba(244,63,94,0.85)",
    "rgba(161,161,170,0.75)",
  ];

  const safeData = data.length ? data : [{ name: "No data", value: 1 }];

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
            innerRadius="55%"
            outerRadius="88%"
            cx="50%"
            cy="45%"
            stroke="rgba(63,63,70,0.9)"
            strokeWidth={1}
          >
            {safeData.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>

          <Legend
            verticalAlign="bottom"
            height={52}
            wrapperStyle={{
              fontSize: 12,
              color: "rgba(161,161,170,1)",
              lineHeight: "16px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
