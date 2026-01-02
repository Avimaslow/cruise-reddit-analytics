/* =========================
   4) TrendLine.jsx (RESPONSIVE + SAFE)
   - ResponsiveContainer to prevent overflow
   - Accepts any array; tries to infer x/y keys
   - If your data has known keys, replace xKey/yKeys
   ========================= */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

function inferKeys(data) {
  const first = data?.[0];
  if (!first || typeof first !== "object") return { xKey: "x", yKeys: ["y"] };

  const keys = Object.keys(first);
  // Guess an x key
  const xKey =
    keys.find((k) => /date|time|day|week|month|bucket/i.test(k)) ||
    keys[0];

  // Guess y keys (numbers excluding x)
  const yKeys = keys
    .filter((k) => k !== xKey)
    .filter((k) => typeof first[k] === "number");

  return { xKey, yKeys: yKeys.length ? yKeys.slice(0, 2) : [keys[1] || "y"] };
}

export default function TrendLine({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const { xKey, yKeys } = inferKeys(rows);

  const safeRows = rows.length ? rows : [{ [xKey]: "—", [yKeys[0]]: 0 }];

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={safeRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(63,63,70,0.35)" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "rgba(161,161,170,0.9)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(63,63,70,0.6)" }}
            tickLine={{ stroke: "rgba(63,63,70,0.6)" }}
          />
          <YAxis
            tick={{ fill: "rgba(161,161,170,0.9)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(63,63,70,0.6)" }}
            tickLine={{ stroke: "rgba(63,63,70,0.6)" }}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(9,9,11,0.92)",
              border: "1px solid rgba(63,63,70,0.8)",
              borderRadius: 10,
              color: "white",
            }}
            itemStyle={{ color: "white" }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 12,
              color: "rgba(161,161,170,1)",
            }}
          />

          {yKeys.map((yk, idx) => (
            <Line
              key={yk}
              type="monotone"
              dataKey={yk}
              dot={false}
              strokeWidth={2}
              stroke={idx === 0 ? "rgba(59,130,246,0.95)" : "rgba(34,197,94,0.95)"}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
