// Rate-Limited Torn API Client with Sliding-Window Protection & TTL Cache
import { loadSettings } from './storage.js';

const CACHE_PREFIX = 'torncore_api_cache_';
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CALLS_PER_WINDOW = 80; // Conservative buffer under Torn's 100/min limit

let callTimestamps = [];

function checkRateLimit() {
  const now = Date.now();
  callTimestamps = callTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  return callTimestamps.length < MAX_CALLS_PER_WINDOW;
}

function recordCall() {
  callTimestamps.push(Date.now());
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { timestamp, ttl, data } = JSON.parse(raw);
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

export function setCached(key, data, ttlMs = 5 * 60 * 1000) {
  try {
    const payload = {
      timestamp: Date.now(),
      ttl: ttlMs,
      data,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch (e) {
    console.warn('[TornCore] LocalStorage cache write failed:', e);
  }
}

/**
 * Fetch from Torn API with caching and rate limiting
 * @param {string} endpoint e.g. 'user', 'torn', 'market'
 * @param {string} selections e.g. 'bars,profile' or 'items'
 * @param {number} ttlMs Cache duration in milliseconds (default: 5 min)
 * @param {string} id Optional target ID
 */
export async function fetchTornApi(endpoint, selections = '', ttlMs = 5 * 60 * 1000, id = '') {
  const settings = loadSettings();
  const apiKey = settings.apiKey?.trim();

  if (!apiKey) {
    return { error: { code: 2, error: 'No API key configured in TornCore settings' } };
  }

  const cacheKey = `${endpoint}_${id}_${selections}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  if (!checkRateLimit()) {
    console.warn('[TornCore] Rate limit safeguard engaged (>80 calls/min). Request throttled.');
    return { error: { code: -1, error: 'TornCore client rate-limit engaged to protect account' } };
  }

  try {
    recordCall();
    const url = `https://api.torn.com/${endpoint}/${id}?selections=${encodeURIComponent(selections)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from Torn API`);
    }
    const json = await response.json();
    if (json.error) {
      console.warn('[TornCore] Torn API returned error:', json.error);
      return json;
    }

    setCached(cacheKey, json, ttlMs);
    return json;
  } catch (err) {
    console.error('[TornCore] Fetch error:', err);
    return { error: { code: -2, error: err.message } };
  }
}
