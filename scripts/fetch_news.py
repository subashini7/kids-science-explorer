"""
Fetches RSS feeds from science news sources, categorises articles by topic,
and writes the top-5 per topic to ../news.json.
Run via GitHub Actions daily.
"""

import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import feedparser

# ── Feed sources ──────────────────────────────────────────────────────────────
FEEDS = [
    {"url": "https://www.nasa.gov/feed/",                               "source": "NASA"},
    {"url": "https://www.sciencedaily.com/rss/all.xml",                 "source": "Science Daily"},
    {"url": "https://phys.org/rss-feed/",                               "source": "Phys.org"},
    {"url": "https://www.space.com/feeds/all",                          "source": "Space.com"},
    {"url": "https://earthsky.org/feed/",                               "source": "EarthSky"},
    {"url": "https://rss.scientificamerican.com/scientific-american/",  "source": "Scientific American"},
    {"url": "https://www.newscientist.com/feed/home/",                  "source": "New Scientist"},
    {"url": "https://feeds.nationalgeographic.com/ng/News/News_Main",   "source": "National Geographic"},
    {"url": "https://www.livescience.com/home/feed/",                   "source": "Live Science"},
]

# ── Topic keyword config ──────────────────────────────────────────────────────
TOPICS = {
    "Chemistry": {
        "emoji": "🧪",
        "keywords": [
            "chemistry", "molecule", "atom", "element", "compound", "reaction",
            "protein", "dna", "material", "polymer", "chemical", "enzyme",
            "drug", "pharmaceutical", "nanoparticle", "crystal", "catalyst",
            "periodic table", "ion", "bond", "acid", "base", "carbon dioxide",
            "hydrogen", "oxygen", "nitrogen", "bacteria", "virus", "gene",
        ],
    },
    "Space & Astronomy": {
        "emoji": "🚀",
        "keywords": [
            "space", "nasa", "planet", "star", "galaxy", "rocket", "astronaut",
            "moon", "mars", "orbit", "telescope", "comet", "asteroid", "solar",
            "cosmos", "universe", "satellite", "spacecraft", "mission", "nebula",
            "supernova", "black hole", "exoplanet", "jupiter", "saturn", "hubble",
            "webb", "iss", "launch", "aurora",
        ],
    },
    "Animals & Nature": {
        "emoji": "🐾",
        "keywords": [
            "animal", "species", "wildlife", "bird", "whale", "lion", "tiger",
            "insect", "plant", "forest", "marine", "evolution", "habitat",
            "extinction", "mammal", "reptile", "fish", "coral", "biodiversity",
            "migration", "predator", "fossil", "dinosaur", "shark", "octopus",
            "bee", "butterfly", "wolf", "elephant", "gorilla",
        ],
    },
    "Earth & Climate": {
        "emoji": "🌍",
        "keywords": [
            "climate", "earth", "weather", "ocean", "glacier", "carbon",
            "temperature", "storm", "sea level", "drought", "flood",
            "atmosphere", "earthquake", "volcano", "renewable", "environment",
            "greenhouse", "arctic", "ice sheet", "ozone", "wildfire",
            "deforestation", "pollution", "hurricane", "typhoon", "tornado",
        ],
    },
    "Technology & Inventions": {
        "emoji": "🤖",
        "keywords": [
            "robot", "artificial intelligence", " ai ", "computer", "technology",
            "invention", "engineer", "battery", "electric", "quantum",
            "semiconductor", "software", "digital", "internet", "drone",
            "innovation", "machine learning", "3d print", "chip", "processor",
            "augmented", "virtual reality", "autonomous", "solar panel",
            "spacecraft", "nanotechnology",
        ],
    },
    "Physics": {
        "emoji": "⚡",
        "keywords": [
            "physics", "force", "motion", "gravity", "energy", "wave",
            "light", "quantum", "particle", "electron", "proton", "neutron",
            "photon", "relativity", "thermodynamics", "magnetism", "electricity",
            "friction", "acceleration", "velocity", "nuclear", "radiation",
            "laser", "optics", "pressure", "sound", "vibration", "heat",
            "momentum", "superconductor", "plasma", "fusion", "fission",
            "electromagnetic", "higgs", "neutrino", "dark matter", "dark energy",
        ],
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────
TAG_RE = re.compile(r"<[^>]+>")
WS_RE  = re.compile(r"\s+")

def strip_html(text: str) -> str:
    text = TAG_RE.sub(" ", text or "")
    return WS_RE.sub(" ", text).strip()

def truncate(text: str, max_chars: int = 220) -> str:
    text = strip_html(text)
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:") + "…"

def score_text(text: str, keywords: list[str]) -> int:
    low = text.lower()
    return sum(1 for kw in keywords if kw in low)

def parse_date(entry) -> str:
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def recency_bonus(date_str: str) -> int:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        delta = (datetime.now(timezone.utc) - dt).days
        if delta <= 3:   return 5
        if delta <= 7:   return 3
        if delta <= 14:  return 1
    except Exception:
        pass
    return 0

# ── Main ──────────────────────────────────────────────────────────────────────
def fetch_all() -> list[dict]:
    articles = []
    for feed_cfg in FEEDS:
        try:
            feed = feedparser.parse(feed_cfg["url"])
            for entry in feed.entries[:30]:
                title   = strip_html(entry.get("title", ""))
                summary = truncate(entry.get("summary", entry.get("description", "")))
                url     = entry.get("link", "")
                date    = parse_date(entry)
                if not title or not url:
                    continue
                articles.append({
                    "title":   title,
                    "summary": summary,
                    "url":     url,
                    "source":  feed_cfg["source"],
                    "date":    date,
                })
        except Exception as exc:
            print(f"  Warning: could not fetch {feed_cfg['url']}: {exc}", file=sys.stderr)
    print(f"Fetched {len(articles)} articles from {len(FEEDS)} feeds.", file=sys.stderr)
    return articles

def categorise(articles: list[dict]) -> dict:
    # Give each article a score per topic; assign to best-scoring topic.
    buckets: dict[str, list] = {t: [] for t in TOPICS}
    for art in articles:
        combined = f"{art['title']} {art['summary']}".lower()
        best_topic, best_score = None, 0
        for topic, cfg in TOPICS.items():
            s = score_text(combined, cfg["keywords"])
            if s > best_score:
                best_score, best_topic = s, topic
        if best_topic and best_score > 0:
            art["_score"] = best_score + recency_bonus(art["date"])
            buckets[best_topic].append(art)

    result = {}
    for topic, cfg in TOPICS.items():
        sorted_arts = sorted(buckets[topic], key=lambda a: a["_score"], reverse=True)
        top5 = [{k: v for k, v in a.items() if k != "_score"} for a in sorted_arts[:5]]
        result[topic] = {"emoji": cfg["emoji"], "articles": top5}
    return result

def main():
    out_path = Path(__file__).parent.parent / "news.json"
    print("Fetching RSS feeds…", file=sys.stderr)
    articles = fetch_all()
    print("Categorising…", file=sys.stderr)
    topics = categorise(articles)
    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "topics":  topics,
    }
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    total = sum(len(v["articles"]) for v in topics.values())
    print(f"Done. {total} articles written to {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
