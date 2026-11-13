const PREAMBLE = 'You are Ramble, a friendly and curious AI chatbot created by Marcus Cole. Keep replies warm and conversational, usually 2-4 sentences. Ask a natural follow-up question when it feels right.';
const COHERE_URL = 'https://api.cohere.com/v2/chat';
const COHERE_MODEL = 'command-r-08-2024';
const PAGES_ORIGIN = 'https://mecolejr.github.io';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_BODY_BYTES = 100000;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin === PAGES_ORIGIN) return true;
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  return local && (url.protocol === 'http:' || url.protocol === 'https:');
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
    },
  });
}

function sanitizeHistory(history) {
  const cleaned = [];
  for (const item of history) {
    if (!item || typeof item !== 'object') continue;
    if (item.role !== 'USER' && item.role !== 'CHATBOT') continue;
    if (typeof item.message !== 'string') continue;
    const message = item.message.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!message) continue;
    cleaned.push({ role: item.role, message });
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES);
}

function toCohereMessages(history, message) {
  const messages = [{ role: 'system', content: PREAMBLE }];
  for (const item of history) {
    messages.push({
      role: item.role === 'USER' ? 'user' : 'assistant',
      content: item.message,
    });
  }
  messages.push({ role: 'user', content: message });
  return messages;
}

function replyText(data) {
  const content = data && data.message && typeof data.message === 'object' ? data.message.content : null;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  let text = '';
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') text += block.text;
  }
  return text;
}

function cohereFailure(data, key) {
  const message = data && typeof data.message === 'string' ? data.message.trim() : '';
  if (!message || (key && message.includes(key))) return 'Cohere request failed.';
  return message.slice(0, 300);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (origin && !isAllowedOrigin(origin)) {
      return json({ error: 'Origin not allowed.' }, 403, null);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, origin);
    }

    const declaredLength = Number(request.headers.get('Content-Length') || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return json({ error: 'Request is too large.' }, 413, origin);
    }

    let raw = '';
    try {
      raw = await request.text();
    } catch {
      return json({ error: 'Request body must be JSON.' }, 400, origin);
    }
    if (raw.length > MAX_BODY_BYTES) {
      return json({ error: 'Request is too large.' }, 413, origin);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'Request body must be JSON.' }, 400, origin);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ error: 'Request body must be a JSON object.' }, 400, origin);
    }

    if (typeof payload.message !== 'string' || !payload.message.trim()) {
      return json({ error: 'Message is required.' }, 400, origin);
    }
    const message = payload.message.trim();
    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({ error: 'Message is too long.' }, 400, origin);
    }

    const historyInput = payload.chat_history == null ? [] : payload.chat_history;
    if (!Array.isArray(historyInput)) {
      return json({ error: 'chat_history must be an array.' }, 400, origin);
    }

    const key = env && typeof env.COHERE_API_KEY === 'string' ? env.COHERE_API_KEY.trim() : '';
    if (!key) {
      return json({ error: 'COHERE_API_KEY is not configured.' }, 500, origin);
    }

    let response;
    try {
      response = await fetch(COHERE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + key,
        },
        body: JSON.stringify({
          model: COHERE_MODEL,
          stream: false,
          messages: toCohereMessages(sanitizeHistory(historyInput), message),
        }),
      });
    } catch {
      return json({ error: 'Could not reach Cohere.' }, 502, origin);
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      return json({ error: cohereFailure(data, key) }, 502, origin);
    }

    return json({ text: replyText(data) }, 200, origin);
  },
};
