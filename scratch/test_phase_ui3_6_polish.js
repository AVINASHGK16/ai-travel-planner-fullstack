/**
 * Automated Verification Suite for UI-3.6 Product-Wide UX Consistency, Interaction Polish & Visual Cohesion
 * ROAMLY — Product Polish Pass
 * 
 * Verifies:
 * 1. Zero window.confirm() or window.alert() calls across the entire frontend codebase
 * 2. AppHeader: Direct frictionless logout without blocking browser dialogs, focus-visible states
 * 3. AppSidebar: Decoupled active navigation states for Explore (/) vs Plan (/plan), min-h-[44px] touch targets, aria-current
 * 4. Dashboard: In-app accessible delete confirmation Modal instead of native window.confirm()
 * 5. HeroSearch: Standard Button primitive adoption, accessible voice search controls, focus rings
 * 6. CTA & Token Hierarchy: Primary Blue (#2563EB), AI Violet (#7C3AED), Secondary Outline, Destructive Red
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'src');

console.log('====================================================');
console.log('🧪 Running UI-3.6 UX Consistency & Polish Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

function getAllFiles(dir, exts = ['.js', '.jsx']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFrontendFiles = getAllFiles(FRONTEND_DIR);

// ── 1. ZERO BLOCKING NATIVE DIALOGS ──────────────────────────────────────────

runTest('1.1: Zero window.alert() or alert() calls across all frontend source files', () => {
  for (const file of allFrontendFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const hasAlert = /(?:window\.)?alert\s*\(/g.test(content);
    assert(!hasAlert, `Found alert() in ${path.relative(ROOT_DIR, file)}`);
  }
});

runTest('1.2: Zero window.confirm() or confirm() calls across all frontend source files', () => {
  for (const file of allFrontendFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const hasConfirm = /(?:window\.)?confirm\s*\(/g.test(content);
    assert(!hasConfirm, `Found confirm() in ${path.relative(ROOT_DIR, file)}`);
  }
});

// ── 2. APPHEADER UX & ACCESSIBILITY ──────────────────────────────────────────

runTest('2.1: AppHeader handles logout directly without browser dialog', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'shell', 'AppHeader.jsx'), 'utf-8');
  assert(!content.includes('confirm('), 'AppHeader must not use confirm()');
  assert(content.includes('logout()'), 'AppHeader must call logout()');
  assert(content.includes("navigate('/')"), 'AppHeader must redirect to / on logout');
});

runTest('2.2: AppHeader controls have focus-visible ring styles for accessibility', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'shell', 'AppHeader.jsx'), 'utf-8');
  assert(content.includes('focus-visible:ring-blue-500'), 'AppHeader interactive controls must have focus-visible rings');
});

// ── 3. APPSIDEBAR NAVIGATION PRECISION ───────────────────────────────────────

runTest('3.1: AppSidebar cleanly decouples isExploreActive (/) from isPlanActive (/plan)', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'shell', 'AppSidebar.jsx'), 'utf-8');
  assert(content.includes("isExploreActive = location.pathname === '/'"), 'Must define isExploreActive for Home/Explore route');
  assert(content.includes("isPlanActive = location.pathname.startsWith('/plan')"), 'Must define isPlanActive for /plan routes');
  assert(content.includes("isActive: isExploreActive"), 'Destinations item must bind to isExploreActive');
});

runTest('3.2: AppSidebar implements min-h-[44px] touch target sizing and aria-current', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'shell', 'AppSidebar.jsx'), 'utf-8');
  assert(content.includes('min-h-[44px]'), 'Navigation buttons must meet 44px min touch target');
  assert(content.includes("aria-current={item.isActive ? 'page' : undefined}"), 'Must set accessible aria-current attribute');
});

// ── 4. DASHBOARD IN-APP DELETION MODAL ───────────────────────────────────────

runTest('4.1: Dashboard implements accessible Modal confirmation for deleting trips', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'Dashboard.jsx'), 'utf-8');
  assert(!content.includes('window.confirm'), 'Dashboard must not use window.confirm');
  assert(content.includes('tripToDelete'), 'Dashboard must manage tripToDelete state');
  assert(content.includes('<Modal'), 'Dashboard must render Roamly Modal primitive for confirmation');
  assert(content.includes('Delete Trip Itinerary'), 'Modal title must be clear and reassuring');
  assert(content.includes('variant="danger"'), 'Delete button must use danger variant');
  assert(content.includes('variant="outline"'), 'Cancel button must use outline variant');
});

// ── 5. HEROSEARCH PRIMITIVE & CTA ALIGNMENT ──────────────────────────────────

runTest('5.1: HeroSearch adopts Roamly Button primitive for primary submit action', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'HeroSearch.jsx'), 'utf-8');
  assert(content.includes("import { Button } from './ui/Button'"), 'HeroSearch must import Button primitive');
  assert(content.includes('<Button'), 'HeroSearch must render Button component');
  assert(content.includes('type="submit"'), 'Button must be type submit');
  assert(content.includes('variant="primary"'), 'Button must use primary variant');
  assert(content.includes('size="lg"'), 'Button must use size lg');
});

runTest('5.2: HeroSearch voice search controls have accessible aria-labels', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'HeroSearch.jsx'), 'utf-8');
  assert(content.includes('aria-label="Voice search for starting location"'), 'Must have accessible label for from voice');
  assert(content.includes('aria-label="Voice search for destination"'), 'Must have accessible label for to voice');
});

// ── 6. BUTTON & CTA DESIGN SYSTEM SYSTEM ─────────────────────────────────────

runTest('6.1: Button primitive implements required variants (primary, secondary, outline, ghost, ai, danger)', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'ui', 'Button.jsx'), 'utf-8');
  assert(content.includes('bg-blue-600'), 'Primary variant must use #2563EB');
  assert(content.includes('bg-purple-600'), 'AI variant must use #7C3AED');
  assert(content.includes('bg-red-600'), 'Danger variant must use #DC2626');
  assert(content.includes('focus-visible:ring-2'), 'Must have focus-visible ring styles');
});

runTest('6.2: Modal primitive implements focus trapping, Escape handling and backdrop blur', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'ui', 'Modal.jsx'), 'utf-8');
  assert(content.includes('getTabbableElements'), 'Modal must trap focus');
  assert(content.includes("e.key === 'Escape'"), 'Modal must handle Escape key');
  assert(content.includes('backdrop-blur'), 'Modal backdrop must use blur token');
});

console.log('====================================================');
console.log(`🏁 UI-3.6 Results: ${passedTests}/${totalTests} tests passed`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
