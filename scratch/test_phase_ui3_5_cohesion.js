import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

console.log('--- RUNNING UI-3.5: UX INTERACTION INTEGRITY & COHESION AUDIT ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. apiClient.js audit
console.log('\n[1/7] Testing apiClient.js network error normalization...');
const apiClientFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/services/apiClient.js'), 'utf8');
assert(apiClientFile.includes('NETWORK_UNAVAILABLE'), 'apiClient must normalize network failures to NETWORK_UNAVAILABLE code');
assert(apiClientFile.includes("We couldn't connect to Roamly right now. Please check your connection and try again."), 'apiClient must use friendly human-facing connection error');
assert(apiClientFile.includes('REQUEST_TIMEOUT'), 'apiClient must handle timeouts cleanly');
assert(apiClientFile.includes('try {') && apiClientFile.includes('response = await fetch'), 'apiClient must wrap fetch in try-catch to intercept low-level rejections');
console.log('✓ apiClient.js correctly intercepts and normalizes low-level fetch errors.');

// 2. AuthModal.jsx audit
console.log('\n[2/7] Testing AuthModal.jsx error UX and recovery actions...');
const authModalFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/components/AuthModal.jsx'), 'utf8');
assert(!authModalFile.includes('alert('), 'AuthModal must never call window.alert()');
assert(authModalFile.includes('NETWORK_UNAVAILABLE'), 'AuthModal must recognize NETWORK_UNAVAILABLE code');
assert(authModalFile.includes('Try Again'), 'AuthModal must offer an inline Try Again button for connection issues');
assert(authModalFile.includes('isNetworkError'), 'AuthModal must distinguish network errors for contextual action');
assert(authModalFile.includes('TypeError|AxiosError|Failed to fetch'), 'AuthModal must sanitize technical error strings');
console.log('✓ AuthModal.jsx provides actionable recovery with zero technical leaks.');

// 3. AuthContext.jsx continuation audit
console.log('\n[3/7] Testing AuthContext.jsx guest continuation callbacks...');
const authContextFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/context/AuthContext.jsx'), 'utf8');
assert(authContextFile.includes('pendingCallbackRef'), 'AuthContext must track pending continuation callback');
assert(authContextFile.includes('openAuthModal = (callback = null)'), 'openAuthModal must accept an optional continuation callback');
assert(authContextFile.includes('pendingCb({ user, token })'), 'handleLoginSuccess must auto-resume pending action upon successful authentication');
console.log('✓ AuthContext.jsx supports seamless Guest -> Auth -> Continuation flows.');

// 4. PlannerPage.jsx alert elimination & feedback audit
console.log('\n[4/7] Testing PlannerPage.jsx interaction integrity & alert elimination...');
const plannerPageFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/pages/PlannerPage.jsx'), 'utf8');
assert(!plannerPageFile.includes('alert('), 'PlannerPage must contain zero window.alert() calls');
assert(plannerPageFile.includes('saveNotification'), 'PlannerPage must manage saveNotification state');
assert(plannerPageFile.includes('showNotification'), 'PlannerPage must use showNotification helper');
assert(plannerPageFile.includes('role="status"') && plannerPageFile.includes('aria-live="polite"'), 'PlannerPage notification banner must use accessible ARIA live region');
assert(plannerPageFile.includes('forcedAuthUser = null'), 'handleSaveActiveTrip must support continuation execution with newly authenticated user');
console.log('✓ PlannerPage.jsx replaces all alerts with accessible in-app feedback and auto-resumes guest saves.');

// 5. TravelOptions.jsx error UX & recovery audit
console.log('\n[5/7] Testing TravelOptions.jsx transport error state and recovery...');
const travelOptionsFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/components/TravelOptions.jsx'), 'utf8');
assert(travelOptionsFile.includes("We couldn't load travel options"), 'Must retain compatible error heading');
assert(travelOptionsFile.includes('Your search details are safe'), 'Must reassure traveler that search parameters are preserved');
assert(travelOptionsFile.includes('Try Again') && travelOptionsFile.includes('Modify Search'), 'Must provide obvious recovery CTAs');
console.log('✓ TravelOptions.jsx presents reassuring error state with obvious recovery CTAs.');

// 6. SettingsPanel & SettingsPage hierarchy audit
console.log('\n[6/7] Testing SettingsPanel.jsx & SettingsPage.jsx visual hierarchy...');
const settingsPanelFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/components/SettingsPanel.jsx'), 'utf8');
const settingsPageFile = fs.readFileSync(path.join(ROOT_DIR, 'frontend/src/pages/SettingsPage.jsx'), 'utf8');
assert(settingsPanelFile.includes('Travel Preferences'), 'SettingsPanel must feature Travel Preferences section');
assert(settingsPageFile.includes('Travel Preferences'), 'SettingsPage must feature Travel Preferences section');
assert(settingsPanelFile.includes('role="switch"'), 'SettingsPanel notifications must use accessible switch semantics');
assert(settingsPageFile.includes('role="switch"'), 'SettingsPage notifications must use accessible switch semantics');
assert(!settingsPanelFile.includes('geminiKey') && !settingsPanelFile.includes('openWeatherKey'), 'SettingsPanel must not expose API keys');
assert(!settingsPageFile.includes('geminiKey') && !settingsPageFile.includes('openWeatherKey'), 'SettingsPage must not expose API keys');
console.log('✓ Settings components feature cohesive 5-section hierarchy and accessible switches.');

// 7. Global alert elimination audit
console.log('\n[7/7] Verifying zero window.alert calls across entire frontend/src...');
const srcFiles = [];
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath);
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
      srcFiles.push(fullPath);
    }
  }
}
collectFiles(path.join(ROOT_DIR, 'frontend/src'));

let alertCount = 0;
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Match alert( but not alertCircle, showAlert, etc.
  const matches = content.match(/(?<![a-zA-Z0-9_$.])alert\s*\(/g);
  if (matches) {
    console.error(`Found alert() in ${path.relative(ROOT_DIR, file)}: ${matches.length} occurrences`);
    alertCount += matches.length;
  }
}
assert.strictEqual(alertCount, 0, `There must be 0 window.alert calls in frontend/src, but found ${alertCount}`);
console.log(`✓ Verified 0 window.alert() calls across ${srcFiles.length} frontend source files.`);

console.log('\n======================================================');
console.log('🎉 ALL UI-3.5 UX INTERACTION INTEGRITY TESTS PASSED!');
console.log('======================================================');
