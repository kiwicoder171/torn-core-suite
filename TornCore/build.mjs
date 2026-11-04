// Zero-dependency Bundler for TornCore Suite
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = './src';
const DIST_DIR = './dist';
const OUTPUT_FILE = path.join(DIST_DIR, 'TornCore.user.js');

const USER_SCRIPT_HEADER = `// ==UserScript==
// @name         TornCore QoL Suite
// @namespace    https://github.com/kiwicoder171/torn-core-suite
// @version      1.0.1
// @description  Unified, 100% rule-compliant Quality-of-Life & calculation suite for Torn.com
// @author       Kiwi
// @license      MIT
// @match        https://*.torn.com/*
// @match        https://torn.com/*
// @updateURL    https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/TornCore/dist/TornCore.user.js
// @downloadURL  https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/TornCore/dist/TornCore.user.js
// @supportURL   https://github.com/kiwicoder171/torn-core-suite/issues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==
`;

// Topological dependency order for inlining
const MODULE_FILES = [
  'core/storage.js',
  'core/api.js',
  'core/router.js',
  'core/ui.js',
  'modules/vault.js',
  'modules/bazaarGuard.js',
  'modules/travel.js',
  'modules/cityScanner.js',
  'modules/crimes.js',
  'modules/hospital.js',
  'modules/gymTimer.js',
];

function cleanModuleCode(content) {
  // Strip import statements
  let cleaned = content.replace(/^import\s+[^;]+;\s*$/gm, '');
  
  // Transform export statements
  // "export const FOO =" -> "const FOO ="
  // "export function foo(" -> "function foo("
  // "export async function foo(" -> "async function foo("
  // "export class Foo" -> "class Foo"
  cleaned = cleaned.replace(/^export\s+(const|let|var|function|async function|class)\s+/gm, '$1 ');
  
  // Strip default exports or trailing named export blocks e.g. "export { a, b };"
  cleaned = cleaned.replace(/^export\s*\{[^}]*\};\s*$/gm, '');
  cleaned = cleaned.replace(/^export\s+default\s+[^;]+;\s*$/gm, '');

  return cleaned.trim();
}

function cleanMainCode(content) {
  // Strip userscript comments and import statements
  let cleaned = content.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');
  cleaned = cleaned.replace(/^import\s+[^;]+;\s*$/gm, '');
  return cleaned.trim();
}

function build() {
  console.log('[TornCore Build] Bundling source files into', OUTPUT_FILE);

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  let bundledBody = [];

  for (const file of MODULE_FILES) {
    const fullPath = path.join(SRC_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`File missing: ${fullPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    const cleaned = cleanModuleCode(raw);
    bundledBody.push(`// --- Module: ${file} ---\n${cleaned}\n`);
  }

  const mainRaw = fs.readFileSync(path.join(SRC_DIR, 'main.js'), 'utf8');
  const mainCleaned = cleanMainCode(mainRaw);
  bundledBody.push(`// --- Entrypoint: main.js ---\n${mainCleaned}\n`);

  const outputContent = `${USER_SCRIPT_HEADER}
(function() {
  'use strict';

${bundledBody.join('\n').split('\n').map(l => '  ' + l).join('\n')}

})();
`;

  fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`[TornCore Build] Success! Output size: ${(stats.size / 1024).toFixed(2)} KB -> ${OUTPUT_FILE}`);

  // Also generate Tampermonkey-compatible import JSON
  const JSON_OUTPUT_FILE = path.join(DIST_DIR, 'tampermonkey-backup.json');
  const backupPayload = {
    version: 1,
    settings: {},
    scripts: [
      {
        name: "TornCore QoL Suite",
        uuid: "7d0a29e6-e1b8-4754-b4e6-torncore0001",
        options: {
          check_for_updates: true,
          comment: null,
          compatopts_for_requires: true,
          compat_wrappedjsobject: false,
          compat_metadata: false,
          compat_foreach: false,
          compat_powerquest: false,
          notify_updates: false,
          run_at: "document-end"
        },
        meta: {
          name: "TornCore QoL Suite",
          namespace: "https://github.com/kiwi/torncore-suite",
          version: "1.0.0",
          description: "Unified, 100% rule-compliant Quality-of-Life & calculation suite for Torn.com",
          author: "Antigravity",
          matches: ["https://*.torn.com/*", "https://torn.com/*"],
          grants: ["GM_getValue", "GM_setValue"],
          "run-at": "document-end"
        },
        source: outputContent
      }
    ]
  };
  fs.writeFileSync(JSON_OUTPUT_FILE, JSON.stringify(backupPayload, null, 2), 'utf8');
  console.log(`[TornCore Build] Generated Tampermonkey backup JSON: ${JSON_OUTPUT_FILE}`);
}

build();
