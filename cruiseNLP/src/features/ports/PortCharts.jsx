import { Card } from "../../components/ui/Card";
import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";

export default function PortCharts({ sentiment }) {
  const data = [
    { name: "Negative", value: sentiment?.neg_count ?? 0 },
    { name: "Neutral", value: sentiment?.neu_count ?? 0 },
    { name: "Positive", value: sentiment?.pos_count ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-3">
        <div className="text-xs text-zinc-500 mb-2">Sentiment distribution</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={60} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-3">
        <div className="text-xs text-zinc-500 mb-2">Interpretation</div>
        <div className="text-sm text-zinc-300 leading-relaxed">
          This panel shows aggregated signal from <span className="text-zinc-100 font-semibold">Reddit comments</span>.
          Severity is a heuristic emphasizing strong negatives + incident keywords (refunds, sickness, theft, delays).
        </div>
      </Card>
    </div>
  );
}
