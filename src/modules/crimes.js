// Crimes 2.0 Cracking Word Matcher & Sub-Crime Advice Overlay

// Curated Torn Cracking Wordlist (lengths 4 - 12)
export const TORN_CRACKING_DICTIONARY = [
  // 4 letters
  'BANK', 'BOMB', 'CASH', 'COIN', 'COLD', 'DARK', 'DOOR', 'FIRE', 'GOLD', 'HACK', 'HERO', 'IRON', 'JAIL', 'KILL', 'LOCK', 'LOOT', 'MASK', 'MINE', 'OPEN', 'PASS', 'SAFE', 'SHOT', 'SWAT', 'TRAP', 'VAULT', 'WIRE',
  // 5 letters
  'AGENT', 'ALARM', 'ALERT', 'ARMOR', 'BLADE', 'BOUNTY', 'BRAIN', 'BRUTE', 'BURGLAR', 'CIPHER', 'CLOAK', 'CRIME', 'DEATH', 'DRUGS', 'ENEMY', 'FIGHT', 'FORCE', 'FRAUD', 'GHOST', 'GUARD', 'HEIST', 'KNIFE', 'LASER', 'MONEY', 'NINJA', 'PISTOL', 'POWER', 'RADAR', 'REBEL', 'RIFLE', 'ROGUE', 'SECRET', 'SHADOW', 'SMOKE', 'SNIPER', 'STEAL', 'THIEF', 'TRACK', 'UNDER', 'VIRUS', 'WATCH',
  // 6 letters
  'ATTACK', 'BULLET', 'CAMERA', 'CASINO', 'COMBAT', 'COPTER', 'CORRUPT', 'CREDIT', 'CYBER', 'DAMAGE', 'DANGER', 'DEPUTY', 'DOLLAR', 'ESCAPE', 'FELONY', 'FORGER', 'FROZEN', 'GANGS', 'HACKER', 'HIJACK', 'HUNTER', 'ILLEGAL', 'IMPACT', 'JAILER', 'LEADER', 'LETHAL', 'MEDICS', 'MURDER', 'OFFICE', 'OUTLAW', 'PATROL', 'PHANTOM', 'PRISON', 'RANSOM', 'RESCUE', 'REVENGE', 'ROBBER', 'ROCKET', 'RUNNER', 'SAFETY', 'SCOUTS', 'SECRET', 'SERIAL', 'SERVER', 'SHADOW', 'SHIELD', 'SILENT', 'SNIPER', 'STEALTH', 'STRIKE', 'SYSTEM', 'TARGET', 'THREAT', 'TRACER', 'VICTIM', 'WARRIOR', 'WEAPON',
  // 7 letters
  'ARSENAL', 'ASSAULT', 'BANDITS', 'BATTERY', 'BOMBING', 'BURGLARY', 'CAPTURE', 'CHOPPER', 'COMMAND', 'CONSPIR', 'COUNTER', 'CRACKER', 'CRIMINAL', 'DEFENSE', 'DESTROY', 'DIGITAL', 'DYNAMITE', 'ESPIONAGE', 'EXPLODE', 'FACTION', 'FIREARM', 'FORGERY', 'GANGSTER', 'GRENADE', 'HOSTAGE', 'JUSTICE', 'KIDNAPPING', 'LOCKPICK', 'MACHINE', 'MANSION', 'MILITIA', 'MISSION', 'NETWORK', 'OFFICER', 'OUTLAWS', 'PAYROLL', 'PURSUIT', 'RADICAL', 'RAIDERS', 'RANSOMS', 'ROBBERY', 'ROCKETS', 'SECURITY', 'SMUGGLE', 'SOLDIER', 'SPECIAL', 'STALKER', 'STEALTH', 'TACTICAL', 'TERROR', 'TRACKER', 'TRIGGER', 'TROUBLE', 'VANDAL', 'VIOLENT', 'WARFARE', 'WITNESS',
  // 8 letters
  'ALLIANCE', 'AMBUSHED', 'ASSASSIN', 'BLACKMAIL', 'BREAKOUT', 'CASUALTY', 'COERCION', 'CRITICAL', 'CYBERNET', 'DEADLOCK', 'DISASTER', 'DISGUISE', 'EXPLOSION', 'EXTORTION', 'FIGHTERS', 'FIREWALL', 'FORENSIC', 'FUGITIVE', 'HANDCUFF', 'HEAVYARM', 'INCIDENT', 'INTRUDER', 'INVASION', 'LOCKDOWN', 'MASTERY', 'MERCENARY', 'OFFENDER', 'OVERKILL', 'PARANOIA', 'PASSWORD', 'PROTOCOL', 'REACTION', 'REVOLVER', 'RUNAWAYS', 'SABOTAGE', 'SENTINEL', 'SHOTGUNS', 'SHUTDOWN', 'SMUGGLER', 'SURVIVAL', 'SUSPECTS', 'SYNDICATE', 'TACTICAL', 'TERMINAL', 'TERRORIST', 'TREASURY', 'TRESPASS', 'UNDERDOG', 'VANDALISM', 'WARRIORS',
  // 9 letters
  'AMBULANCE', 'ARRESTING', 'AUTONOMOUS', 'BLACKMAIL', 'CASUALTIES', 'CONFIDENTIAL', 'CONVICTION', 'CONVICTED', 'CORRUPTION', 'CRACKDOWN', 'DETECTIVE', 'ENCRYPTION', 'EXECUTION', 'EXPLOSIVE', 'FIREARMS', 'GANGSTERS', 'HARDDRIVE', 'INFILTRATE', 'INTERCEPT', 'INVESTIGATE', 'MERCENARY', 'MILITARY', 'NIGHTSTICK', 'OBSERVERS', 'ORGANIZED', 'PARALYZED', 'PUNISHMENT', 'REVOLUTION', 'SANCTION', 'SATELLITE', 'SECURITY', 'TERRORISM', 'VIGILANTE', 'VIOLATION',
  // 10 letters
  'BLACKMARKET', 'BREAKTHROUGH', 'CONSPIRACY', 'CONTROLLED', 'CRIMINALITY', 'CYBERSPACE', 'DESTRUCTION', 'DISPATCHED', 'DOMINATION', 'EXPLOSIVES', 'EXTINCTION', 'INFILTRATOR', 'INTERROGATOR', 'LOCKSMITHS', 'MANSLAUGHTER', 'PATROLLING', 'PUNISHABLE', 'RESISTANCE', 'RETALIATION', 'SURVEILLANCE', 'TERMINATED', 'VULNERABLE'
];

/**
 * Filter dictionary matching a known pattern, e.g. "C _ M P _ T _ R" -> regex /^C.MP.T.R$/i
 */
export function matchCrackingWords(pattern) {
  if (!pattern) return [];
  const clean = pattern.replace(/\s+/g, '');
  const regexStr = '^' + clean.replace(/_/g, '.') + '$';
  const regex = new RegExp(regexStr, 'i');
  return TORN_CRACKING_DICTIONARY.filter(word => regex.test(word));
}

export function initCrimesHelper() {
  const crimesRoot = document.querySelector('#crimes-root, .crimes-app, .crimes-container');
  if (!crimesRoot) return;

  detectCrackingModule(crimesRoot);
  injectSubcrimeGuide(crimesRoot);
}

function detectCrackingModule(root) {
  // Look for cracking letter cells
  const letterCells = root.querySelectorAll('.character-input, .character___, .letter___, [class*="character"]');
  if (!letterCells || letterCells.length === 0) return;

  // Build pattern
  let pattern = '';
  letterCells.forEach(cell => {
    const text = cell.textContent.trim().toUpperCase();
    if (text && text.length === 1 && /[A-Z]/.test(text)) {
      pattern += text;
    } else {
      pattern += '_';
    }
  });

  if (pattern.length < 3) return;

  const matches = matchCrackingWords(pattern);
  let card = document.getElementById('torncore-cracking-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'torncore-cracking-card';
    card.className = 'torncore-card';
    root.prepend(card);
  }

  card.innerHTML = `
    <div class="torncore-card-header">
      <span style="color:#60a5fa;">💻 Crimes 2.0 Cracking Word Matches [${pattern}]</span>
      <span style="font-size:10px; color:#94a3b8;">${matches.length} candidate words</span>
    </div>
    <div class="torncore-chip-container">
      ${matches.length > 0
        ? matches.slice(0, 10).map(m => `<span class="torncore-chip accent">${m}</span>`).join('')
        : '<span style="color:#94a3b8; font-size:11px;">No exact dictionary match. Keep guessing letters!</span>'
      }
    </div>
  `;
}

function injectSubcrimeGuide(root) {
  if (document.getElementById('torncore-crime-advisory')) return;

  const hour = new Date().getUTCHours();
  let timeAdvice = 'Daytime: Standard detection rates across city targets.';
  if (hour >= 22 || hour <= 5) {
    timeAdvice = '🌙 Night Hours: Cemeteries & Unlit Alleys have reduced guard presence.';
  }

  const advisory = document.createElement('div');
  advisory.id = 'torncore-crime-advisory';
  advisory.className = 'torncore-card';
  advisory.style.margin = '6px 0';
  advisory.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
      <span><strong>Crime Advisory:</strong> ${timeAdvice}</span>
      <span style="color:#94a3b8;">TCT: ${hour.toString().padStart(2, '0')}:00</span>
    </div>
  `;
  root.prepend(advisory);
}
