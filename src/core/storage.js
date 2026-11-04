// Storage & Configuration Manager for TornCore Suite

const STORAGE_KEY = 'torncore_settings';

export const DEFAULT_SETTINGS = {
  apiKey: '',
  enabledModules: {
    vault: true,
    bazaarGuard: true,
    travel: true,
    cityScanner: true,
    crimes: true,
    hospital: true,
    gymTimer: true,
  },
  vaultChips: [1000000, 5000000, 10000000], // $1M, $5M, $10M
  vaultKeepCash: 20000, // Keep $20k
  bazaarCashThreshold: 100000, // $100k
  travelCarryCapacity: 29, // 15 + 10 suitcase + 4 perks
};

function getRaw(key) {
  try {
    if (typeof GM_getValue !== 'undefined') {
      return GM_getValue(key, null);
    }
    return localStorage.getItem(key);
  } catch (e) {
    return localStorage.getItem(key);
  }
}

function setRaw(key, val) {
  try {
    if (typeof GM_setValue !== 'undefined') {
      GM_setValue(key, val);
      return;
    }
    localStorage.setItem(key, val);
  } catch (e) {
    localStorage.setItem(key, val);
  }
}

export function loadSettings() {
  const raw = getRaw(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      enabledModules: {
        ...DEFAULT_SETTINGS.enabledModules,
        ...(parsed.enabledModules || {}),
      },
    };
  } catch (e) {
    console.error('[TornCore] Error reading settings:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  setRaw(STORAGE_KEY, JSON.stringify(settings));
}

export function isModuleEnabled(moduleName) {
  const s = loadSettings();
  return s.enabledModules[moduleName] !== false;
}
