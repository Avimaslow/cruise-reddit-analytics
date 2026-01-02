import { useEffect, useState } from "react";
import { CruiseApi } from "../../api/cruiseApi";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Stat } from "../../components/ui/Stat";
import PortCharts from "./PortCharts";

function sentimentColor(label) {
  if (label === "neg") return "text-orange-400";
  if (label === "pos") return "text-emerald-400";
  return "text-zinc-300";
}

export default function PortPanel({ portId }) {
  const [summary, setSummary] = useState(null);
  const [themes, setThemes] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!portId) return;

    let alive = true;
    setLoading(true);
    Promise.all([
      CruiseApi.portSummary(portId),
      CruiseApi.portThemes(portId, 15, 30),
      CruiseApi.portFeed(portId, 25, 260),
    ])
      .then(([s, t, f]) => {
        if (!alive) return;
        setSummary(s);
        setThemes(t);
        setFeed(f);
      })
      .catch(console.error)
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [portId]);

  return (
    <Card className="h-full">
      <CardHeader
        title={portId ? `Port: ${portId}` : "Select a port"}
        subtitle="Aggregated from Reddit comments with sentiment + severity scoring."
        right={loading ? <Spinner /> : null}
      />
      <CardBody className="space-y-4">
        {!portId ? (
          <div className="text-sm text-zinc-400">Select a port on the map or from search.</div>
        ) : !summary ? (
          <div className="text-sm text-zinc-400">No data yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Mentions" value={summary.sentiment?.mentions ?? 0} />
              <Stat
                label="Avg Sentiment"
                value={(summary.sentiment?.avg_sentiment ?? 0).toFixed(2)}
                sub="VADER compound"
              />
              <Stat
                label="Avg Severity"
                value={(summary.sentiment?.avg_severity ?? 0).toFixed(2)}
                sub="neg-only heuristic"
              />
              <Stat
                label="Neg / Neu / Pos"
                value={`${summary.sentiment?.neg_count ?? 0} / ${summary.sentiment?.neu_count ?? 0} / ${summary.sentiment?.pos_count ?? 0}`}
              />
            </div>

            <PortCharts sentiment={summary.sentiment} />

            <div className="grid grid-cols-1 gap-3">
              <div className="text-sm font-semibold">Top negative themes</div>
              <div className="space-y-2">
                {themes.map(t => (
                  <div
                    key={t.theme_label}
                    className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="text-sm">{t.theme_label}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-3">
                      <span>n={t.n}</span>
                      <span>avg={t.avg_sent?.toFixed(2)}</span>
                      <span className="text-orange-400">neg={t.neg_count ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="text-sm font-semibold">Worst experiences (high severity)</div>
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {feed.map(item => (
                  <div key={item.object_id} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-semibold ${sentimentColor(item.sentiment_label)}`}>
                        {item.sentiment_label?.toUpperCase()} • severity {Number(item.severity_score ?? 0).toFixed(2)}
                      </div>
                      {item.permalink ? (
                        <a className="text-xs text-zinc-400 hover:text-zinc-200" href={item.permalink} target="_blank">
                          Reddit
                        </a>
                      ) : null}
                    </div>
                    <div className="text-sm text-zinc-200 mt-2 leading-relaxed">
                      {item.preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
