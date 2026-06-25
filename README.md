# 🔭 Science Explorer

A kid-friendly science news website for curious minds aged 6–12. It pulls the latest discoveries from top science sources, sorts them into six topic categories, and lets kids ask an AI science tutor anything they're curious about.

## Features

- **Daily Science News** — Aggregates RSS feeds from NASA, National Geographic, Science Daily, Phys.org, New Scientist, and more. Updated automatically every day via GitHub Actions.
- **Six Topic Categories** — Chemistry 🧪, Space & Astronomy 🚀, Animals & Nature 🐾, Earth & Climate 🌍, Technology & Inventions 🤖, Physics ⚡
- **Ask Dr. Science** — A chat page powered by Groq (Llama 3.1 8B) that answers science questions in simple, age-appropriate language with a fun fact at the end of every answer.
- **No backend** — Fully static HTML/CSS/JS. The only server-side logic is the daily GitHub Actions workflow that commits a fresh `news.json`.

## How it works

```
GitHub Actions (daily 6 AM PT)
  └─ scripts/fetch_news.py
       ├─ Fetches RSS from 9 science sources
       ├─ Scores each article against topic keywords
       ├─ Picks top 5 per topic (with recency bonus)
       └─ Writes news.json → committed back to repo

index.html + app.js
  └─ Loads news.json at page open → renders topic cards

ask.html + ask.js
  └─ Sends question to Groq API → streams Dr. Science reply
     (user provides their own Groq API key, stored in localStorage)
```

## Setup

1. Fork or clone the repo.
2. Enable GitHub Pages (Settings → Pages → Deploy from `main` branch root).
3. The `fetch-news.yml` workflow runs daily and keeps `news.json` fresh — no secrets needed for the news feed.
4. For the **Ask Dr. Science** page, visitors enter their own [Groq API key](https://console.groq.com) (free tier available). The key is stored only in their browser's `localStorage`.

## Running the news fetcher locally

```bash
cd scripts
pip install -r requirements.txt
python fetch_news.py
```

This writes `news.json` to the project root. Open `index.html` in a browser to see the result.

## Project structure

```
├── index.html          # News feed home page
├── ask.html            # Ask Dr. Science chat page
├── app.js              # News rendering logic
├── ask.js              # Groq chat logic
├── style.css           # Shared styles
├── news.json           # Auto-generated daily news data
└── scripts/
    ├── fetch_news.py   # RSS fetcher + categoriser
    └── requirements.txt
```
