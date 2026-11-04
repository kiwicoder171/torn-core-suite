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

export function initVaultHelper() {
  const inputs = new Set();

  // 1. Faction Armory: specifically target the "DEPOSIT MONEY" button and its input
  const allButtons = Array.from(document.querySelectorAll('input[type="submit"], button, .btn'));
  const depositMoneyBtn = allButtons.find(b =>
    /DEPOSIT\s+MONEY/i.test(b.value || b.textContent || '')
  );

  if (depositMoneyBtn) {
    const parentContainer = depositMoneyBtn.closest('form, div, span');
    if (parentContainer) {
      const cashInput = parentContainer.querySelector('input[type="text"], input[type="number"]');
      if (cashInput) inputs.add(cashInput);
    }
  }

  // 2. Property Vault: target property vault deposit inputs (excluding item tables)
  document.querySelectorAll(
    'input[name="deposit"], input[id*="deposit" i], input[placeholder*="deposit" i], .deposit-box input'
  ).forEach((el) => {
    // Explicitly exclude any item list rows or armory weapon/armor/med tables
    if (el.closest('tr, .item-list, [class*="items" i], [data-item]')) return;

    const parent = el.closest('form, .deposit-box, [class*="deposit" i], .cont-gray');
    if (parent) {
      inputs.add(el);
    }
  });

  inputs.forEach((input) => {
    // Avoid double injection
    if (input.parentElement && input.parentElement.querySelector('.torncore-vault-chips')) return;
    if (input.previousElementSibling && input.previousElementSibling.classList.contains('torncore-vault-chips')) return;
    if (input.closest('.torncore-chip-container')) return;

    const settings = loadSettings();
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'torncore-chip-container torncore-vault-chips';
    chipsContainer.style.marginBottom = '6px';

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
      if (cash > 0) {
        setInputValue(input, cash);
      } else {
        setInputValue(input, 0);
      }
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

    // Insert directly before the cash input element or its container row
    const targetRow = input.closest('form, div') || input;
    if (targetRow && targetRow !== input && targetRow.parentElement) {
      targetRow.parentElement.insertBefore(chipsContainer, targetRow);
    } else {
      input.parentNode.insertBefore(chipsContainer, input);
    }
  });
}
