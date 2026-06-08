const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const KEY_STORE = 'science_explorer_groq_key';

const SYSTEM_PROMPT = `You are "Dr. Science", a friendly and enthusiastic science teacher for kids aged 6–12 years old.

When answering questions:
- Use simple, everyday words that children understand
- Compare science concepts to things kids know: toys, food, games, animals, everyday objects
- Keep your answer to 3–5 short sentences
- Be warm, enthusiastic, and encouraging — science is amazing and fun!
- End EVERY answer with a line starting with "🌟 Fun Fact:" followed by one surprising related fact
- If a question is not about science, kindly say: "Great question! I'm Dr. Science so I know lots about nature, space, animals, chemistry, and technology. Can I help you with a science question?"
- Never give scary, violent, or inappropriate content — keep it positive and age-appropriate`;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const apiBanner    = document.getElementById('api-setup-banner');
const apiKeyInput  = document.getElementById('api-key-input');
const saveKeyBtn   = document.getElementById('save-key-btn');
const chatArea     = document.getElementById('chat-area');
const askForm      = document.getElementById('ask-form');
const questionInput = document.getElementById('question-input');
const askBtn       = document.getElementById('ask-btn');
const changeKeyBtn = document.getElementById('change-key-btn');

// ── API key management ────────────────────────────────────────────────────────
function getKey() { return localStorage.getItem(KEY_STORE) || ''; }
function saveKey(k) { localStorage.setItem(KEY_STORE, k.trim()); }
function clearKey() { localStorage.removeItem(KEY_STORE); }

function updateKeyUI() {
  const hasKey = !!getKey();
  apiBanner.style.display   = hasKey ? 'none'  : 'block';
  changeKeyBtn.style.display = hasKey ? 'inline-block' : 'none';
  askBtn.disabled = !hasKey;
  questionInput.placeholder = hasKey
    ? 'Type your science question here...'
    : 'Save your Groq API key above first...';
}

saveKeyBtn.addEventListener('click', () => {
  const val = apiKeyInput.value.trim();
  if (!val.startsWith('gsk_')) {
    apiKeyInput.style.borderColor = '#e53e3e';
    apiKeyInput.placeholder = 'Key should start with gsk_ — try again';
    return;
  }
  saveKey(val);
  apiKeyInput.value = '';
  apiKeyInput.style.borderColor = '';
  updateKeyUI();
});

changeKeyBtn.addEventListener('click', () => {
  clearKey();
  updateKeyUI();
});

// ── Chat rendering ────────────────────────────────────────────────────────────
function clearWelcome() {
  const welcome = chatArea.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
}

function appendMessage(role, text) {
  clearWelcome();
  const label = role === 'user' ? 'You' : 'Dr. Science 🧑‍🔬';
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `
    <span class="chat-msg-label">${label}</span>
    <div class="chat-bubble">${escapeHTML(text)}</div>`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

function appendTyping() {
  clearWelcome();
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <span class="chat-msg-label">Dr. Science 🧑‍🔬</span>
    <div class="chat-bubble typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// ── Groq API call ─────────────────────────────────────────────────────────────
async function askDrScience(question) {
  const key = getKey();
  if (!key) throw new Error('No API key');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: question },
      ],
      max_tokens: 400,
      temperature: 0.75,
    }),
  });

  if (res.status === 401) { clearKey(); updateKeyUI(); throw new Error('Invalid API key — please re-enter your key.'); }
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ── Submit handling ───────────────────────────────────────────────────────────
async function handleQuestion(question) {
  if (!question.trim()) return;

  appendMessage('user', question);
  questionInput.value = '';
  askBtn.disabled = true;

  const typing = appendTyping();

  try {
    const answer = await askDrScience(question);
    removeTyping();
    appendMessage('bot', answer);
  } catch (err) {
    removeTyping();
    const errDiv = document.createElement('div');
    errDiv.className = 'error-msg';
    errDiv.textContent = '😕 ' + (err.message || 'Something went wrong. Please try again!');
    chatArea.appendChild(errDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
  } finally {
    askBtn.disabled = !getKey();
  }
}

askForm.addEventListener('submit', e => {
  e.preventDefault();
  handleQuestion(questionInput.value.trim());
});

document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!getKey()) {
      apiBanner.scrollIntoView({ behavior: 'smooth' });
      apiKeyInput.focus();
      return;
    }
    handleQuestion(btn.dataset.q);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
updateKeyUI();
