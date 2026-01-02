import { useEffect, useMemo, useState } from "react";
import { CruiseApi } from "../../api/cruiseApi";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Stat } from "../../components/ui/Stat";
import LineLogo from "./LineLogo";

export default function LinePanel({ lineId, lines }) {
  const lineName = useMemo(() => {
    const found = (lines || []).find(l => l.id === lineId);
    return found?.name || lineId;
  }, [lines, lineId]);

  const [summary, setSummary] = useState(null);
  const [themes, setThemes] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lineId) return;
    let alive = true;
    setLoading(true);

    Promise.all([
      CruiseApi.lineSummary(lineId),
      CruiseApi.lineThemes(lineId, 15, 30),
      CruiseApi.lineFeed(lineId, 25, 260),
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
  }, [lineId]);

  return (
    <Card>
      <CardHeader
        title={lineId ? `Line: ${lineName}` : "Select a cruise line"}
        subtitle="Aggregated from comments where cruise line was detected."
        right={loading ? <Spinner /> : null}
      />
      <CardBody className="space-y-4">
        {!lineId ? (
          <div className="text-sm text-zinc-400">Pick a line to see its signal.</div>
        ) : (
          <>
            <LineLogo title={lineName} />

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Mentions" value={summary?.sentiment?.mentions ?? 0} />
              <Stat label="Avg Sentiment" value={(summary?.sentiment?.avg_sentiment ?? 0).toFixed(2)} />
              <Stat label="Avg Severity" value={(summary?.sentiment?.avg_severity ?? 0).toFixed(2)} />
              <Stat
                label="Neg / Neu / Pos"
                value={`${summary?.sentiment?.neg_count ?? 0} / ${summary?.sentiment?.neu_count ?? 0} / ${summary?.sentiment?.pos_count ?? 0}`}
              />
            </div>

            <div>
              <div className="text-sm font-semibold">Top negative themes</div>
              <div className="space-y-2 mt-2">
                {themes.map(t => (
                  <div key={t.theme_label} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 flex justify-between">
                    <div className="text-sm">{t.theme_label}</div>
                    <div className="text-xs text-zinc-400">n={t.n} avg={t.avg_sent?.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">Worst experiences</div>
              <div className="space-y-2 mt-2 max-h-[360px] overflow-auto pr-1">
                {feed.map(item => (
                  <div key={item.object_id} className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                    <div className="flex justify-between">
                      <div className="text-xs text-zinc-400">
                        {item.sentiment_label} • severity {Number(item.severity_score ?? 0).toFixed(2)}
                      </div>
                      {item.permalink ? (
                        <a className="text-xs text-zinc-400 hover:text-zinc-200" href={item.permalink} target="_blank">
                          Reddit
                        </a>
                      ) : null}
                    </div>
                    <div className="text-sm mt-2">{item.preview}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ships section placeholder */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4">
              <div className="text-sm font-semibold">Ships (next)</div>
              <div className="text-sm text-zinc-400 mt-2">
                To show ships for this line, we need a data source:
                <ul className="list-disc ml-5 mt-2 text-zinc-400">
                  <li>Either scrape a curated ship list per line into your DB, or</li>
                  <li>Add an API endpoint like <code className="text-zinc-200">/lines/{`{line_id}`}/ships</code></li>
                </ul>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
