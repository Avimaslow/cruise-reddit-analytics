
# Cruise Reddit Analytics

A scalable data ingestion and analysis pipeline that collects, deduplicates, and continuously backfills Reddit discussions about cruise lines, ships, and passenger experiences for downstream analytics and NLP.

---

## Overview

Cruise Reddit Analytics is a data engineering and analytics project focused on understanding passenger sentiment and recurring themes across major cruise lines using Reddit data.

The project ingests posts and comments from multiple cruise-related subreddits, stores them in a structured database, and prepares the data for sentiment analysis, topic modeling, and comparative analytics across cruise lines.

Rather than attempting to “scrape all of Reddit,” the system is designed around Reddit’s API constraints and implements a repeatable ingestion strategy that maximizes accessible data and grows incrementally over time.

---

## Key Features

- **Maximum-coverage Reddit ingestion**
  - Collects posts using multiple listing strategies:
    - `new`, `hot`, `rising`
    - `top` (day / week / month / year / all-time)
  - Ensures high historical coverage within API limits

- **Scalable comment ingestion**
  - Expands comment trees safely using `replace_more`
  - Caps comment ingestion per post to prevent runaway threads
  - Re-ingests comments only when posts are new or actively changing

- **Deduplication & upserts**
  - Primary-key–based upserts prevent duplicate posts or comments
  - Pipeline is fully re-runnable without data corruption

- **Structured storage**
  - SQLite database with indexed tables for:
    - posts
    - comments
  - Optimized for downstream SQL analytics and NLP workflows

- **Reproducible data generation**
  - Large datasets (CSV exports, databases) are generated locally
  - No large files or secrets committed to GitHub

---

## Data Sources

The pipeline ingests data from publicly available Reddit subreddits, including:

- `r/Cruise`, `r/Cruises` (mixed cruise discussions)
- `r/royalcaribbean`
- `r/CarnivalCruiseFans`
- `r/NCL`
- `r/MSCCruises`
- `r/CelebrityCruises`
- `r/dcl` (Disney Cruise Line)
- `r/PrincessCruises`
- `r/VirginVoyages`

Additional subreddits can be added easily via configuration.

---

## Project Structure

```

scraping/
├── run_ingest.py          # Main entry point
├── settings.py            # Subreddit config and ingestion parameters
├── reddit_client.py       # Reddit API client (PRAW)
├── db.py                  # SQLite schema and upsert logic
├── ingest_posts.py        # Post ingestion logic
├── ingest_comments.py     # Comment ingestion logic
├── export_csv.py          # Optional CSV exports
├── requirements.txt
└── README.md

````

---

## Setup

### 1. Create a virtual environment
```bash
python -m venv .venv
source .venv/bin/activate
````

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file based on `.env.example`:

```bash
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=cruise-reddit-analytics:v0.1 (by u/yourusername)
```

---

## Running the Ingestion Pipeline

```bash
python run_ingest.py
```

This will:

* Ingest posts from configured subreddits
* Ingest comments for new or recently active posts
* Store results in `cruise_reddit.db`
* Optionally export CSVs to `exports/`

---

## Data Management

Large generated files are **not committed to GitHub**, including:

* SQLite databases
* CSV exports

These files are listed in `.gitignore` and can be regenerated locally at any time by running the pipeline.

This follows standard best practices for data engineering projects.

---

## Intended Analyses (Next Steps)

Planned downstream analyses include:

* Sentiment and severity scoring of posts and comments
* Ship and port entity extraction
* Cross–cruise-line comparison dashboards
* Identification of recurring complaint themes
* Ranking ships and lines by positive/negative sentiment

---

## Why This Project Matters

This project demonstrates:

* Realistic handling of third-party API constraints
* Scalable data ingestion design
* Clean separation between data generation and version control
* A strong foundation for NLP and analytics work

It is designed to be extensible into production-style analytics and machine learning workflows.

---

## License

This project is for educational and research purposes. Reddit data is subject to Reddit’s API Terms of Service.



