// Vault & Faction Bank Quick-Fill Deposit Chips
import { loadSettings } from '../core/storage.js';

function getLiquidCash() {
  // Check common Torn top-bar money elements
  const moneyEl = document.querySelector('#user-money, [data-money], .money___vgW');
  if (moneyEl) {
    const raw = moneyEl.getAttribute('data-money') || moneyEl.textContent;
    const clean = raw.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    if (!isNaN(num)) return num;
  }
  return 0;
}

function formatMoney(amount) {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}k`;
  return `$${amount.toLocaleString()}`;
}

function setInputValue(input, val) {
  input.value = val;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();
}

function isInvalidTarget(input) {
  if (!input) return true;
  // Strictly ignore header, search inputs, navigation, chat, forums
  if (input.closest('#header-root, header, nav, .header, #search, [class*="header" i], [id*="header" i]')) return true;
  if (/search/i.test(input.placeholder || input.name || input.id || '')) return true;
  // Strictly ignore item tables, inventory tables, chat inputs
  if (input.closest('tr, table, tbody, .item-list, [class*="items" i], [data-item], #chatRoot')) return true;
  // Strictly ignore submit/button/hidden
  if (input.type === 'submit' || input.type === 'button' || input.type === 'hidden') return true;
  return false;
}

function injectChipsForInput(input) {
  // Avoid duplicate injection in this container
  const parentBox = input.closest('form, .cont-gray, [class*="deposit" i]') || input.parentElement;
  if (parentBox && parentBox.querySelector('.torncore-vault-chips')) return;
  if (input.parentElement && input.parentElement.querySelector('.torncore-vault-chips')) return;

  const settings = loadSettings();
  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'torncore-chip-container torncore-vault-chips';
  chipsContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin:6px 0 6px 0; align-items:center;';

  // Standard increment chips
  settings.vaultChips.forEach((amount) => {
    const chip = document.createElement('span');
    chip.className = 'torncore-chip';
    chip.textContent = `+${formatMoney(amount)}`;
    chip.title = `Pre-fill ${amount.toLocaleString()}`;
    chip.onclick = (e) => {
      e.preventDefault();
      const currentVal = parseInt(input.value.replace(/[^0-9]/g, ''), 10) || 0;
      setInputValue(input, currentVal + amount);
    };
    chipsContainer.appendChild(chip);
  });

  // Max Cash chip
  const maxChip = document.createElement('span');
  maxChip.className = 'torncore-chip accent';
  maxChip.textContent = 'Max Cash';
  maxChip.title = 'Pre-fill all liquid cash in hand';
  maxChip.onclick = (e) => {
    e.preventDefault();
    const cash = getLiquidCash();
    setInputValue(input, cash > 0 ? cash : 0);
  };
  chipsContainer.appendChild(maxChip);

  // Keep $20k chip
  const keepChip = document.createElement('span');
  keepChip.className = 'torncore-chip';
  const keepAmount = settings.vaultKeepCash || 20000;
  keepChip.textContent = `Keep ${formatMoney(keepAmount)}`;
  keepChip.title = `Pre-fill cash minus ${formatMoney(keepAmount)}`;
  keepChip.onclick = (e) => {
    e.preventDefault();
    const cash = getLiquidCash();
    const depositVal = Math.max(0, cash - keepAmount);
    setInputValue(input, depositVal);
  };
  chipsContainer.appendChild(keepChip);

  // Position chips directly above the input row
  const form = input.form || input.closest('form');
  if (form) {
    if (input.parentElement && input.parentElement !== form && input.parentElement.parentElement === form) {
      form.insertBefore(chipsContainer, input.parentElement);
    } else {
      form.insertBefore(chipsContainer, form.firstChild);
    }
  } else if (input.parentElement) {
    if (input.parentElement.parentElement && input.parentElement.children.length <= 4) {
      input.parentElement.parentElement.insertBefore(chipsContainer, input.parentElement);
    } else {
      input.parentElement.insertBefore(chipsContainer, input);
    }
  }
}

export function initVaultHelper() {
  // Clean up any old stray chips from header or search bar
  document.querySelectorAll('#header-root .torncore-vault-chips, header .torncore-vault-chips, nav .torncore-vault-chips').forEach(c => c.remove());

  // Search candidate text inputs
  const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'));

  for (const input of allInputs) {
    if (isInvalidTarget(input)) continue;

    let isMoneyDeposit = false;

    // Check ancestors up to 4 levels for money deposit clues
    let container = input.parentElement;
    for (let depth = 0; depth < 4 && container && container !== document.body; depth++) {
      const text = container.textContent || '';
      if (/DEPOSIT\s+MONEY/i.test(text) || /and a balance of\s+\$/i.test(text) || (text.includes('balance of') && text.includes('$'))) {
        // Exclude Points deposit column
        if (!/DEPOSIT\s+POINTS/i.test(input.parentElement?.textContent || '') && !/points/i.test(input.name || input.id || '')) {
          isMoneyDeposit = true;
          break;
        }
      }
      container = container.parentElement;
    }

    // Property Vault on properties.php
    if (!isMoneyDeposit && window.location.href.includes('properties.php')) {
      if (input.name === 'deposit' || /deposit/i.test(input.id || '') || input.closest('#properties-vault, .vault-cont')) {
        isMoneyDeposit = true;
      }
    }

    if (isMoneyDeposit) {
      injectChipsForInput(input);
    }
  }
}
