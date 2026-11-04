// UI Components, Modal Settings, and Consistent Theme Styles for TornCore Suite
import { loadSettings, saveSettings } from './storage.js';

const STYLES = `
/* TornCore Design System */
.torncore-chip-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0;
  align-items: center;
}

.torncore-chip {
  background: rgba(35, 41, 55, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.torncore-chip:hover {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(96, 165, 250, 0.5);
  color: #ffffff;
  transform: translateY(-1px);
}

.torncore-chip:active {
  transform: translateY(0);
}

.torncore-chip.accent {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(52, 211, 153, 0.4);
  color: #6ee7b7;
}

.torncore-chip.accent:hover {
  background: rgba(16, 185, 129, 0.35);
  border-color: rgba(52, 211, 153, 0.7);
  color: #a7f3d0;
}

.torncore-banner-alert {
  background: linear-gradient(90deg, rgba(220, 38, 38, 0.92) 0%, rgba(185, 28, 28, 0.95) 100%);
  color: #ffffff;
  border-bottom: 2px solid #f87171;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  z-index: 99999;
}

.torncore-card {
  background: #1f2430;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px 14px;
  margin: 10px 0;
  color: #cbd5e1;
  font-size: 12px;
}

.torncore-card-header {
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 4px;
}

/* Floating Settings Button */
#torncore-menu-btn {
  position: fixed;
  bottom: 72px;
  right: 20px;
  z-index: 999999;
  background: #0f172a;
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition: all 0.2s;
  font-size: 14px;
}

#torncore-menu-btn:hover {
  background: #1e293b;
  color: #f8fafc;
  border-color: rgba(96, 165, 250, 0.5);
  transform: scale(1.05);
}

/* Modal Overlay */
.torncore-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.torncore-modal {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  width: 440px;
  max-width: 90vw;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.torncore-modal-head {
  padding: 14px 18px;
  background: #1e293b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.torncore-modal-title {
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.torncore-modal-body {
  padding: 16px 18px;
  max-height: 70vh;
  overflow-y: auto;
}

.torncore-form-group {
  margin-bottom: 14px;
}

.torncore-form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 4px;
}

.torncore-input {
  width: 100%;
  box-sizing: border-box;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 7px 10px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
}

.torncore-input:focus {
  border-color: #3b82f6;
}

.torncore-checkbox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.torncore-checkbox-row span {
  font-size: 13px;
  color: #cbd5e1;
}

.torncore-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.torncore-btn:hover {
  background: #1d4ed8;
}

.torncore-btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
}
`;

export function injectGlobalStyles() {
  if (document.getElementById('torncore-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'torncore-styles';
  styleEl.textContent = STYLES;
  (document.head || document.documentElement).appendChild(styleEl);
}

export function initSettingsUI() {
  injectGlobalStyles();
  if (document.getElementById('torncore-menu-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'torncore-menu-btn';
  btn.title = 'TornCore Suite Settings';
  btn.innerHTML = '⚙';
  btn.onclick = openSettingsModal;
  document.body.appendChild(btn);
}

export function openSettingsModal() {
  const existing = document.getElementById('torncore-modal-overlay');
  if (existing) existing.remove();

  const settings = loadSettings();

  const overlay = document.createElement('div');
  overlay.id = 'torncore-modal-overlay';
  overlay.className = 'torncore-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'torncore-modal';

  const modules = [
    { key: 'vault', label: 'Vault Quick-Fill Chips' },
    { key: 'bazaarGuard', label: 'Bazaar Open / Cash Guard' },
    { key: 'travel', label: 'Travel Profit & Tarmac Max-Fill' },
    { key: 'cityScanner', label: 'City Map Item Scanner' },
    { key: 'crimes', label: 'Crimes 2.0 Cracking Matcher' },
    { key: 'hospital', label: 'Zero-Waste Med-Out Calculator' },
    { key: 'gymTimer', label: 'Gym 15-Minute Happy Reset Timer' },
  ];

  let moduleCheckboxes = modules
    .map(
      (m) => `
    <div class="torncore-checkbox-row">
      <span>${m.label}</span>
      <input type="checkbox" id="torncore-toggle-${m.key}" ${settings.enabledModules[m.key] !== false ? 'checked' : ''} />
    </div>
  `
    )
    .join('');

  modal.innerHTML = `
    <div class="torncore-modal-head">
      <span class="torncore-modal-title">⚙ TornCore QoL Suite Settings</span>
      <span style="cursor:pointer; color:#94a3b8; font-size:16px;" id="torncore-modal-close">&times;</span>
    </div>
    <div class="torncore-modal-body">
      <div class="torncore-form-group">
        <label>Torn API Key (Public/Minimal Access)</label>
        <input type="password" id="torncore-api-key" class="torncore-input" value="${settings.apiKey || ''}" placeholder="Enter 16-character Torn API key" />
        <small style="color:#64748b; font-size:11px; display:block; margin-top:3px;">
          Stored locally in your browser. Used for safe profile & item checks.
        </small>
      </div>

      <div class="torncore-form-group">
        <label>Bazaar Cash Risk Threshold ($)</label>
        <input type="number" id="torncore-bazaar-threshold" class="torncore-input" value="${settings.bazaarCashThreshold || 100000}" />
      </div>

      <div class="torncore-form-group">
        <label>Travel Max Carry Capacity</label>
        <input type="number" id="torncore-travel-capacity" class="torncore-input" value="${settings.travelCarryCapacity || 29}" />
      </div>

      <div style="font-weight:700; color:#f8fafc; font-size:12px; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">
        Active Modules
      </div>
      ${moduleCheckboxes}

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
        <button id="torncore-save-btn" class="torncore-btn">Save Changes</button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('torncore-modal-close').onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  document.getElementById('torncore-save-btn').onclick = () => {
    const updated = loadSettings();
    updated.apiKey = document.getElementById('torncore-api-key').value.trim();
    updated.bazaarCashThreshold = parseInt(document.getElementById('torncore-bazaar-threshold').value, 10) || 100000;
    updated.travelCarryCapacity = parseInt(document.getElementById('torncore-travel-capacity').value, 10) || 29;

    for (const m of modules) {
      const el = document.getElementById(`torncore-toggle-${m.key}`);
      if (el) updated.enabledModules[m.key] = el.checked;
    }

    saveSettings(updated);
    overlay.remove();
  };
}
