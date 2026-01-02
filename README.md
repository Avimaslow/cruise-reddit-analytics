
#  Cruise Reddit Analytics

**AI-Powered Cruise Sentiment, Port, Line & Ship Intelligence**

Cruise Reddit Analytics is a full-stack data analytics platform that ingests large-scale Reddit discussion data about cruises and transforms it into **actionable insights about ports, cruise lines, and individual ships**.

The project combines **data scraping, NLP, sentiment & severity modeling, SQL analytics, and a modern interactive dashboard** to answer questions like:

* Which ports generate the most complaints?
* How does sentiment differ by cruise line?
* Which ships have the worst passenger experiences — and why?
* What themes dominate negative vs positive discussions?
* How do experiences change over time?

This project is designed to feel like a **real analytics product**, not a toy demo.

---

##   Key Features

###  Port Analytics

* Mentions per port
* Average sentiment & severity
* Theme composition
* Worst passenger experiences (high-severity comments)
* Monthly sentiment & severity trends
* Interactive world map with port selection

###  Cruise Line Analytics

* Line-level sentiment summaries
* Best and worst ports for each cruise line
* Dominant complaint & praise themes
* Most liked vs most severe Reddit comments
* Time-based trend analysis

###  Ship-Level Intelligence

* Per-ship sentiment & severity
* Ports most associated with each ship
* Worst experiences by severity
* Most upvoted passenger feedback
* Theme and trend breakdowns
* Graceful handling of sparse ship data

###  NLP & Scoring

* Sentiment classification (neg / neu / pos)
* Continuous sentiment scores
* Severity scoring (impact-weighted complaints)
* Theme extraction per comment
* Neutral + high-severity logic for complaint detection

###  Interactive Dashboard

* Built with React + Vite
* Responsive, multi-panel analytics layout
* Drill-down navigation:

  * Port → Line → Ship
* Charts, stacks, trends, and ranked lists
* Real-time filtering without page reloads

---

##  Architecture Overview

```
┌──────────────┐
│   Reddit     │
│  (PRAW API)  │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Data Extraction    │
│  + Normalization    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   NLP Processing    │
│  - Sentiment        │
│  - Severity         │
│  - Themes           │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   SQLite Database   │
│  (JSON arrays, SQL) │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   FastAPI Backend   │
│   REST Endpoints    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ React Dashboard     │
│ (Vite + Recharts)   │
└─────────────────────┘
```

---

## 🗄 Database Design

### Core Tables

* `comments` – raw Reddit comments
* `extraction` – normalized entities (ports, ships, cruise lines)
* `nlp_scores` – sentiment, severity, labels
* `themes` – extracted complaint/praise themes

### Key Techniques

* JSON arrays for multi-entity relationships
* `json_each()` joins for ports & ships
* Aggregation by entity + time
* Severity-weighted analytics
* Defensive SQL for missing data

---

##  Backend API (FastAPI)

### Example Endpoints

#### Ports

```
GET /ports
GET /ports/{port_id}
GET /ports/{port_id}/themes
GET /ports/{port_id}/trend
GET /ports/{port_id}/feed
```

#### Cruise Lines

```
GET /lines/{line_id}
GET /lines/{line_id}/ports
GET /lines/{line_id}/themes
GET /lines/{line_id}/trend
GET /lines/{line_id}/top-comments
GET /lines/{line_id}/worst-comments
```

#### Ships

```
GET /ships/{ship_id}
GET /ships/{ship_id}/ports
GET /ships/{ship_id}/themes
GET /ships/{ship_id}/trend
GET /ships/{ship_id}/top-comments
GET /ships/{ship_id}/worst-comments
```

---

##  Frontend (React Dashboard)

* **React + Vite**
* TailwindCSS
* Recharts for visualization
* Leaflet for interactive maps
* Client-side routing with React Router
* Robust error handling (`Promise.allSettled`)
* Responsive, overflow-safe layouts

---

##  Getting Started

### 1 Clone the repo

```bash
git clone https://github.com/Avimaslow/cruise-reddit-analytics.git
cd cruise-reddit-analytics
```

---

### 2 Backend setup

```bash
cd cruiseNLP
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run API:

```bash
python -m uvicorn cruiseNLP.api.app:app --reload --port 8000
```

---

### 3 Frontend setup

```bash
cd cruise-dashboard
npm install
npm run dev
```

Open:

```
http://localhost:5173
```

---

##  Data Sources

* Reddit cruise-related subreddits
* Public Reddit metadata (scores, timestamps)
* Wikipedia thumbnails (client-side, optional)

All scraping is done **lightly and responsibly** for analysis purposes only.

---

##  Design Philosophy

This project intentionally:

* prioritizes **real data messiness**
* handles **missing or ambiguous entities**
* avoids fake “perfect” datasets
* treats neutral-high-severity complaints as meaningful signals
* balances statistical rigor with visual clarity

It is built to feel like something an **actual cruise analytics or insights team** might use internally.

---

##  What Makes This Project Interesting

* Real-world NLP on noisy social data
* Complex SQL with JSON joins
* Severity-aware sentiment analysis
* Multi-entity drill-down analytics
* Product-quality dashboard UX
* Thoughtful handling of partial or sparse data

---

##  Future Enhancements

* Ship → Cruise line cross-analysis
* Port-level geo heatmaps
* Theme clustering & similarity
* User-submitted reviews
* Model explainability for severity scoring
* Deployment (Railway / Fly.io / Vercel)

---

## Author

**Avi Maslow**
Computer Science @ Columbia University
Data analytics, NLP, and systems engineering

GitHub: [https://github.com/Avimaslow](https://github.com/Avimaslow)


