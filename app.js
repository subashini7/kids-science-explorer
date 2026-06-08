const TOPIC_COLORS = {
  'Chemistry':               'chem',
  'Space & Astronomy':       'space',
  'Animals & Nature':        'animals',
  'Earth & Climate':         'earth',
  'Technology & Inventions': 'tech',
  'Physics':                 'physics',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function buildArticleHTML(article) {
  const title = article.title || 'Untitled';
  const summary = article.summary || '';
  const source = article.source || '';
  const date = formatDate(article.date);
  const url = article.url || '#';

  return `
    <div class="article-item">
      <a class="article-title" href="${url}" target="_blank" rel="noopener">${title}</a>
      ${summary ? `<p class="article-summary">${summary}</p>` : ''}
      <span class="article-meta">${source}${date ? ' · ' + date : ''}</span>
    </div>`;
}

function buildTopicCard(topicName, topicData) {
  const colorClass = TOPIC_COLORS[topicName] || 'space';
  const emoji = topicData.emoji || '🔬';
  const articles = topicData.articles || [];

  const articlesHTML = articles.length > 0
    ? articles.map(buildArticleHTML).join('')
    : '<p class="no-articles">No recent articles — check back soon! 🔍</p>';

  return `
    <div class="topic-card">
      <div class="topic-header ${colorClass}">
        <span class="topic-emoji">${emoji}</span>
        <span class="topic-name">${topicName}</span>
      </div>
      <div class="topic-articles">${articlesHTML}</div>
    </div>`;
}

async function loadNews() {
  const loading = document.getElementById('loading');
  const errorState = document.getElementById('error-state');
  const grid = document.getElementById('topics-grid');
  const lastUpdated = document.getElementById('last-updated');

  try {
    const res = await fetch('news.json?v=' + Date.now());
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();

    const topics = data.topics || {};
    const keys = Object.keys(topics);

    if (keys.length === 0) {
      throw new Error('empty');
    }

    grid.innerHTML = keys.map(k => buildTopicCard(k, topics[k])).join('');

    if (data.updated) {
      lastUpdated.textContent = '⏱ Last updated: ' + formatDate(data.updated);
    }

    loading.style.display = 'none';
    grid.style.display = 'grid';
  } catch (err) {
    loading.style.display = 'none';
    errorState.style.display = 'block';
  }
}

loadNews();
