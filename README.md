# Cruise Port Intelligence Map

Cruise Port Intelligence Map is a full-stack analytics product that turns Reddit cruise discussion into a location-based intelligence layer for ports, cruise lines, and ships.

The core idea is simple:

- scrape cruise-related Reddit posts and comments
- detect ports, cruise lines, and ships mentioned in the text
- score sentiment and complaint severity
- classify recurring themes such as `embarkation_lines`, `excursions`, or `food_dining`
- map those signals to cruise ports in an interactive dashboard

Instead of showing a generic sentiment dashboard, the site is designed to answer questions like:

- What are travelers saying about Cozumel right now?
- Which ports attract the most complaints?
- Which cruise lines are most associated with a destination?
- What concerns come up repeatedly for a given port?
- Which destinations are spiking in discussion volume?


[![Demo](screenshots/map-view.png)](screenshots/Screen%20Recording%202026-04-03%20at%202.53.01%E2%80%AFPM.mov)

---

## What The Site Does

The main experience is a map of cruise ports. Each marker represents a port, and the marker size reflects how many Reddit references were matched to that destination.

When a user clicks a port, the site shows:

- total matched Reddit references
- Port Pulse score
- average sentiment
- associated cruise lines
- theme composition
- monthly trend data
- spike detection
- top posts tied to that port
- traveler concerns and traveler favorites

There are also filters for:

- region
- cruise line
- date range
- sentiment
- search by port name

The app also includes:

- a persistent app header with `Home`, `Help`, and contextual back navigation
- dedicated cruise line detail pages
- dedicated cruise ship detail pages
- under-map cruise line and ship intelligence panels for posts that do not mention a port explicitly

---

## Navigation And Pages

### Home

The home page is the main map experience.

It includes:

- the port map
- the filter rail
- the port leaderboard
- port comparison
- under-map cruise line intelligence
- under-map ship intelligence

### Help

The Help page is written for recruiters, teammates, and first-time users.

It explains:

- what the product does
- how to read the map
- how `Avg Sentiment` differs from `Avg Severity`
- how Port Pulse works
- how spike detection works
- how traveler concerns and favorites are derived

### Cruise Line Detail Pages

Clicking a cruise line card opens a detail page for that line.

These pages show:

- total mentions
- average sentiment
- average severity
- ports most associated with that line
- line-level sentiment mix
- line-level theme composition
- line trend over time
- most liked comments
- worst experience comments

### Cruise Ship Detail Pages

Clicking a ship card opens a detail page for that ship.

These pages show:

- total mentions
- average sentiment
- average severity
- ports most associated with that ship
- ship-level trend data
- sentiment mix
- theme composition
- comment examples

---

## Avg Sentiment vs Avg Severity

These two metrics are intentionally different.

`Avg Sentiment` answers:

- Does the discussion sound positive, mixed, or negative overall?

`Avg Severity` answers:

- When people are unhappy, how intense or serious do those complaints sound?

That means a destination, cruise line, or ship can have:

- low average sentiment but low severity if the complaints are mild
- low average sentiment and high severity if the complaints involve stronger issue language

Examples of stronger severity signals include:

- refund problems
- cancellations
- theft
- dirty conditions
- food poisoning
- long delays

In plain English:

- sentiment tells you mood
- severity tells you complaint intensity

---

## Product Metrics Explained

This section explains exactly what each headline metric or panel means.

### Mentions / References

This is the count of matched Reddit references for a port.

In the current dashboard:

- `mentions` on the map and leaderboard come from comment-level matches
- `post_mentions` is tracked separately for Reddit posts

Why this split exists:

- comments are usually richer for complaints and traveler detail
- posts are stronger for engagement metrics like score and comment count

### Sentiment

Sentiment is calculated with VADER in [`cruiseNLP/NLP/nlp_sentiment.py`](cruiseNLP/NLP/nlp_sentiment.py).

For each text item:

- VADER produces a continuous compound score in `[-1, 1]`
- labels are assigned using standard thresholds:
- `pos` if compound `>= 0.05`
- `neg` if compound `<= -0.05`
- `neu` otherwise

In the port dashboard:

- average sentiment is the mean of `sentiment_score` across matched items
- positive/neutral/negative counts are counts of those labels

Interpretation:

- higher positive score means Reddit text around that port trends more favorable
- negative score means more complaint-heavy or dissatisfied discussion
- values near zero mean mixed or neutral discussion

### Severity

Severity is also calculated in [`cruiseNLP/NLP/nlp_sentiment.py`](cruiseNLP/NLP/nlp_sentiment.py).

Severity is not just “negative sentiment.” It is a complaint intensity heuristic:

- only negative texts receive non-zero severity
- severity combines:
- absolute VADER negativity
- explicit negative keyword hits such as `refund`, `dirty`, `food poisoning`, `stolen`, `delayed`

Formula used:

```text
severity = min(1.0, 0.8 * abs(compound) + 0.05 * keyword_hits)
```

Only negative items contribute to severity. Neutral and positive items get `0.0`.

Interpretation:

- high severity means stronger complaint language and/or stronger issue keywords
- low severity negative items are closer to mild dissatisfaction

### Port Pulse

Port Pulse is a custom composite score used to summarize how visible and engaged a port is.

The score is calculated in [`cruiseNLP/api/app.py`](cruiseNLP/api/app.py) from four post-level inputs:

- `post_mentions`
- `avg_post_score`
- `avg_post_comments`
- `avg_post_sentiment`

Each component is normalized, then combined with weights:

```text
mentions_n   = min(1.0, post_mentions / 250)
score_n      = min(1.0, avg_post_score / 400)
comments_n   = min(1.0, avg_post_comments / 120)
sentiment_n  = ((avg_post_sentiment + 1) / 2), clamped to [0, 1]

Port Pulse =
  0.40 * mentions_n
  0.25 * score_n
  0.20 * comments_n
  0.15 * sentiment_n

final score = Port Pulse * 100
```

Interpretation:

- high pulse means a port is discussed often and those posts tend to get attention
- it is not purely “best port”
- it is closer to “how much traveler conversation and engagement is happening around this destination”

### Traveler Concern

`Traveler Concern` is intended to reflect recurring complaint-oriented discussion for a port.

It is derived primarily from comment-level theme data, not post titles.

How it works:

1. Comments matched to a port are theme-classified.
2. Theme rows are aggregated for that port.
3. Themes with lower average sentiment are treated as concern-oriented.
4. The overview endpoint selects the most negative theme rows as `traveler_concerns`.

Examples:

- `embarkation_lines`
- `excursions`
- `cleanliness`
- `crowds_noise`
- `safety_security`

In the compare cards:

- the UI first tries `traveler_concerns`
- if that is empty, it falls back to the top keyword
- if no keyword exists either, it shows a softer fallback such as `No concern signal in current filter`

Why concerns can be empty:

- narrow filters such as a single cruise line plus a short date range can leave too little comment-theme data
- some ports simply have low volume for that slice

### Traveler Favorite

`Traveler Favorite` is the positive-side analogue of `Traveler Concern`.

How it works:

1. Comments matched to a port are theme-classified.
2. Theme rows are aggregated.
3. Themes with higher average sentiment are treated as positive/favorite-oriented.
4. The overview endpoint selects the strongest positive rows as `traveler_favorites`.

Examples:

- `food_dining`
- `excursions`
- `cabin_room`

Important nuance:

- theme labels are not hardcoded as “good” or “bad”
- the same theme can appear as concern or favorite depending on the underlying average sentiment for that port and filter slice

For example:

- `excursions` may be a favorite for one port
- `excursions` may be a concern for another if people complain about pricing, organization, or quality

### Theme Composition Snapshot

`Theme Composition Snapshot` shows the highest-volume themes tied to the selected port.

It is built from comment-level theme rows and displays the top themes by count.

This answers:

- what people talk about most when they discuss this port

Examples:

- `embarkation_lines`
- `food_dining`
- `excursions`
- `cabin_room`

This is a volume view, not a positivity view. A theme can appear here because it is common, regardless of whether it is being praised or criticized.

### Keyword Clusters

Keyword Clusters show the most frequent theme labels tied to the selected port.

At the moment, “keywords” are derived from the `themes` table rather than from a separate embedding or topic model. So they are best thought of as:

- most frequent matched topics

Examples:

- `food_dining`
- `embarkation_lines`
- `wifi_tech`
- `excursions`

### Cruise Line Share

This panel shows which cruise lines are most associated with a selected port in matched post-level data.

How it works:

- posts tied to the selected port are grouped by inferred cruise line
- each line gets a mention count
- the dashboard also computes percentage share of total line-tagged mentions for that port

Interpretation:

- this is not market share
- it is discussion association within the matched Reddit dataset

### Top Posts / Most Commented / Most Recent

These are post-level explorers for the selected port.

They are pulled from posts whose extracted `port_ids` include the selected destination.

---

## Hosting And Deployment

The codebase can absolutely live on GitHub, and this repository is structured well for that.

For deployment, there are two practical options:

### Option 1: Fully Interactive Deployment

This keeps the current behavior of the app.

- host the frontend separately
- host the FastAPI backend separately
- keep the API live so filters, drill-down pages, and port detail views stay dynamic

Typical setup:

- GitHub for source control
- Vercel or Netlify for the React frontend
- Render, Railway, Fly.io, or a VPS for the FastAPI API

This is the best option if you want recruiters to experience the project exactly as intended.

### Option 2: Static Portfolio Deployment

This is useful if you want to host only the frontend on GitHub Pages.

- precompute analytics into static JSON files
- have the frontend read those JSON files
- keep the interactions, but without a live backend

This still works well as a portfolio project, but it is no longer a live API-backed application.

Views:

- `Top liked` sorts by Reddit score
- `Most commented` sorts by comment count
- `Most recent` sorts by creation time

Each card shows:

- title
- subreddit
- score
- number of comments
- date
- preview text
- associated cruise line if inferred

### Trends Over Time

This panel groups port-level post discussion by month.

For each month the dashboard calculates:

- mention count
- average sentiment
- average severity

Trend rows come from matched post-level port references and are grouped as:

```text
strftime('%Y-%m', datetime(created_utc, 'unixepoch'))
```

Interpretation:

- use this to see whether discussion is rising or falling
- use average sentiment to see whether the tone changes over time

### Spike Detection

Spike detection is a simple month-over-month alert built in [`cruiseNLP/api/app.py`](cruiseNLP/api/app.py).

A month is considered a spike when:

- the previous month had at least one mention
- the current month increases by at least `10` mentions
- the current month is at least `1.5x` the previous month

Logic:

```text
delta = current_mentions - previous_mentions
ratio = current_mentions / max(previous_mentions, 1)

spike if:
  previous_mentions > 0
  and delta >= 10
  and ratio >= 1.5
```

Interpretation:

- spikes highlight sudden increases in traveler attention
- they do not automatically mean a positive or negative event
- a spike might reflect itinerary changes, news, operational issues, viral trip reports, or seasonal interest

---

## Theme Labels Explained

Theme labels are rule-based categories defined in [`cruiseNLP/NLP/theme_classifier.py`](cruiseNLP/NLP/theme_classifier.py).

Each theme contains a curated set of keywords and phrases. Text is normalized, then matched using substring rules.

If a comment contains one or more indicators for a theme, that theme can be attached to the comment.

Examples:

- `embarkation_lines`
  - check-in, terminal, security line, customs, boarding delays, parking, luggage
- `excursions`
  - excursion, shore excursion, tour, snorkeling, ATV, zip line, resort pass
- `food_dining`
  - buffet, MDR, specialty dining, cold food, undercooked food, food poisoning
- `cleanliness`
  - dirty, mold, gross, bugs, bathroom was dirty
- `cabin_room`
  - cabin, stateroom, AC, shower, balcony, bed, noise in room
- `crowds_noise`
  - overcrowded, packed, noisy, long waits, screaming kids
- `wifi_tech`
  - wifi, internet, app crashed, streaming, online check-in
- `health_illness`
  - norovirus, flu, quarantine, seasickness
- `safety_security`
  - unsafe, theft, robbed, harassed, injury

Theme scoring:

- a theme gets a hit count based on keyword matches
- score saturates at `1.0`
- the classifier keeps up to the top 3 themes per text item

This is a rules-based NLP layer, not a transformer topic model. That makes it:

- easy to inspect
- easy to tweak
- deterministic
- good for a portfolio project where interpretability matters

---

## How Ports Are Matched

The project uses a normalized entity extraction layer stored in the `extraction` table.

Relevant fields include:

- `object_type`
- `object_id`
- `cruise_line`
- `ship_ids`
- `port_ids`

Each matched post or comment can map to one or more ports using `port_ids`, which are stored as JSON arrays.

This is what allows the backend to do queries like:

- all comments tied to `cozumel`
- all posts tied to `miami`
- all theme rows attached to `nassau`

---

## Database Design

Core tables:

- `posts`
- `comments`
- `extraction`
- `nlp_scores`
- `themes`

What each table does:

- `posts`
  - raw Reddit post metadata
  - title, selftext, score, comment count, timestamps, subreddit, permalink
- `comments`
  - raw Reddit comment metadata
  - body, score, timestamp, permalink, linked `post_id`
- `extraction`
  - normalized entity mapping layer
  - which ports, ships, and cruise lines were detected
- `nlp_scores`
  - sentiment label
  - continuous sentiment score
  - severity score
- `themes`
  - matched theme labels per text item

Key implementation detail:

- `port_ids` and `ship_ids` are stored as JSON arrays
- SQLite `json_each()` is used to unnest and aggregate them

That makes it easy to ask:

- which ports are most mentioned
- which lines dominate a port
- which ships are associated with a destination

---

## Backend API

The backend is a FastAPI service in `cruiseNLP/api`.

Important endpoints:

### Ports

```bash
GET /ports
GET /ports/intelligence
GET /ports/{port_id}
GET /ports/{port_id}/overview
GET /ports/{port_id}/pulse
GET /ports/{port_id}/themes
GET /ports/{port_id}/keywords
GET /ports/{port_id}/trend
GET /ports/{port_id}/line-shares
GET /ports/{port_id}/posts
```

### Lines

```bash
GET /lines
GET /lines/{line_id}
GET /lines/{line_id}/ports
GET /lines/{line_id}/themes
GET /lines/{line_id}/trend
GET /lines/{line_id}/top-comments
GET /lines/{line_id}/worst-comments
```

### Ships

```bash
GET /ships/{ship_id}
GET /ships/{ship_id}/ports
GET /ships/{ship_id}/themes
GET /ships/{ship_id}/trend
GET /ships/{ship_id}/top-comments
GET /ships/{ship_id}/worst-comments
```

### Supported query filters in the port intelligence view

The main map flow supports:

- `line_id`
- `date_range`

Current date range presets:

- `all`
- `30d`
- `90d`
- `180d`
- `365d`

---

## Frontend

The frontend lives in `cruise-dashboard` and is built with:

- React
- Vite
- TailwindCSS
- Recharts
- Leaflet / React Leaflet

UI sections include:

- headline hero
- filter rail
- port leaderboard
- interactive map
- compare ports panel
- selected port detail panel
- trend chart
- post explorer
- theme composition snapshot

---

## Getting Started

### 1. Clone

```bash
git clone https://github.com/Avimaslow/cruise-reddit-analytics.git
cd cruise-reddit-analytics
```

### 2. Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r cruiseNLP/requirements.txt
uvicorn cruiseNLP.api.app:app --reload --reload-dir cruiseNLP --port 8000
```

Open:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/ports/intelligence?limit=5`

### 3. Frontend

Use an LTS Node version. Node 20 or 22 is recommended.

```bash
cd cruise-dashboard
npm install
npm run dev
```

Open:

- `http://127.0.0.1:5173`

---

## Example Reading Of The Dashboard

If a selected port shows:

- `Traveler Concern: embarkation_lines`
- `Traveler Favorite: food_dining`

that means:

- comment-level discussion tied to that port frequently includes embarkation and terminal-related language, and the average sentiment for that theme trends negative enough to surface as a concern
- food and dining discussion appears often enough and positively enough to surface as a favorite

If a selected port shows a spike:

- discussion volume increased sharply month-over-month
- something about that destination likely caused a sudden rise in traveler attention

If Port Pulse is high:

- the destination has strong Reddit visibility and/or engagement

---

## Design Philosophy

This project is intentionally opinionated:

- it uses real noisy social data
- it favors interpretable scoring over black-box magic
- it tries to feel like a real internal insights tool
- it treats comments as first-class product signals, not just posts

It is meant to look and behave like something a cruise line, travel startup, or traveler-intelligence team could actually use.

---

## Current Limitations

- entity extraction is rule-based, so some port mentions may be missed
- theme classification is keyword-driven, not embedding-based
- Reddit is not a representative sample of all travelers
- line association is inferred and may be incomplete on some records
- date filtering currently uses preset windows instead of custom start/end selection

---
