function HelpCard({ title, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_30%),linear-gradient(180deg,#020617,#081225_45%,#0f172a)] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 lg:px-6">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.70))] p-8">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
            Help & Methodology
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            How to read the Cruise Port Intelligence Map
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-300">
            This page is designed for recruiters, teammates, and first-time users who need a fast
            explanation of what the dashboard shows, how the scores are produced, and how to interpret
            the different panels.
          </p>
        </div>

        <HelpCard title="What this product is">
          <p>
            This dashboard turns Reddit cruise discussion into a location-based intelligence product.
            It connects cruise ports, cruise lines, and ships to traveler discussion, then summarizes
            that discussion using sentiment, severity, keyword themes, and engagement data.
          </p>
          <p>
            The map is only one part of the product. Some posts mention a cruise line or a ship without
            naming a port, so the dashboard also surfaces line and ship intelligence underneath the map.
          </p>
        </HelpCard>

        <HelpCard title="How to use the dashboard">
          <p>
            Start on the map to explore ports spatially. Click a marker to open port-level detail,
            compare ports side by side, and inspect trends over time. Use the filter rail to narrow
            by region, cruise line, sentiment, search term, or date range.
          </p>
          <p>
            If a Reddit thread does not mention a port directly, look at the line and ship panels
            under the map. Those sections preserve insight even when destination extraction is sparse.
          </p>
        </HelpCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <HelpCard title="Avg Sentiment vs Avg Severity">
            <p>
              These two metrics are related, but they are not the same thing. <code>Avg Sentiment</code> is
              the average emotional tone of the matched Reddit discussion. Higher values mean more positive
              discussion. Lower values mean more negative discussion.
            </p>
            <p>
              <code>Avg Severity</code> measures complaint intensity. It is meant to answer a different
              question: when people are unhappy, how serious do those complaints sound? A discussion can have
              mildly negative sentiment but low severity if people are only slightly annoyed. It can also have
              a modest sentiment drop and high severity if the conversation includes words tied to cancellations,
              theft, illness, dirty conditions, or refund problems.
            </p>
            <p>
              In plain English: sentiment tells you whether people sound happy or unhappy, while severity tells
              you how intense the negative experience sounds.
            </p>
          </HelpCard>

          <HelpCard title="Sentiment">
            <p>
              Sentiment is calculated with VADER. Each matched post or comment gets a continuous
              compound score from -1 to 1, plus a label of positive, neutral, or negative.
            </p>
            <p>
              Port-level average sentiment is the mean of those sentiment scores across the matched data
              slice. Higher values mean discussion trends more favorable. Lower values mean discussion
              trends more complaint-heavy.
            </p>
          </HelpCard>

          <HelpCard title="Severity">
            <p>
              Severity is a complaint-intensity heuristic, not just negative sentiment. Only negative
              texts receive non-zero severity.
            </p>
            <p>
              It combines absolute negative sentiment strength with explicit issue keywords such as
              refund, delayed, dirty, food poisoning, theft, or canceled. Higher severity means a
              stronger complaint signal.
            </p>
          </HelpCard>

          <HelpCard title="Port Pulse">
            <p>
              Port Pulse is a composite score intended to summarize attention and engagement for a port.
              It blends four post-level inputs:
            </p>
            <p>
              post mentions, average Reddit score, average comment count, and average post sentiment.
            </p>
            <p>
              A high Port Pulse means that a port is not only being discussed, but that the related
              Reddit posts are drawing attention and interaction.
            </p>
          </HelpCard>

          <HelpCard title="Spike Detection">
            <p>
              Spike detection looks for a sharp increase in monthly discussion. A month is flagged as
              a spike when discussion rises by at least 10 mentions and reaches at least 1.5x the
              previous month.
            </p>
            <p>
              A spike does not automatically mean something is good or bad. It only means traveler
              attention rose noticeably.
            </p>
          </HelpCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <HelpCard title="Traveler Concern">
            <p>
              Traveler Concern is driven primarily by comment-level theme data. Comments are where people
              usually describe operational pain points in detail, so concerns are not based only on post titles.
            </p>
            <p>
              The dashboard groups comment themes tied to a port and surfaces the most negative recurring
              theme labels. Examples include <code>embarkation_lines</code>, <code>excursions</code>,
              <code>cleanliness</code>, and <code>safety_security</code>.
            </p>
            <p>
              If there is not enough concern-theme data in the current filter slice, the UI falls back
              to the strongest keyword. If there is still no signal, it shows a softer empty-state message.
            </p>
          </HelpCard>

          <HelpCard title="Traveler Favorite">
            <p>
              Traveler Favorite works the same way, but on the positive side. It surfaces recurring themes
              that appear often and trend more positive in the selected slice.
            </p>
            <p>
              Examples include <code>food_dining</code>, <code>cabin_room</code>, or sometimes
              <code>excursions</code>. The same theme can be a favorite in one port and a concern in another,
              depending on how people talk about it.
            </p>
          </HelpCard>
        </div>

        <HelpCard title="Theme Composition Snapshot">
          <p>
            Theme Composition Snapshot is a volume view. It shows the highest-frequency theme labels tied to
            the selected port. It answers the question: what do people talk about most here?
          </p>
          <p>
            This panel is not automatically positive or negative. A theme appears because it is common, not
            because it is good or bad.
          </p>
        </HelpCard>

        <HelpCard title="Cruise lines, ships, and why they matter">
          <p>
            Not every cruise-related Reddit post names a destination. Some users talk about a ship,
            a cruise line, onboard service, or casino offers without ever naming a port.
          </p>
          <p>
            That is why the dashboard includes under-map intelligence panels for cruise lines and ships.
            Those sections make sure useful data is still visible even when destination extraction is incomplete.
          </p>
        </HelpCard>

        <HelpCard title="Why this matters to a recruiter">
          <p>
            This project is not just a visualization. It shows product thinking, entity extraction,
            rule-based NLP, sentiment scoring, SQL analytics, API design, and front-end interaction design.
          </p>
          <p>
            Framed correctly, it is a location-based traveler intelligence platform rather than a simple
            “Reddit dashboard.”
          </p>
        </HelpCard>
      </div>
    </div>
  );
}
