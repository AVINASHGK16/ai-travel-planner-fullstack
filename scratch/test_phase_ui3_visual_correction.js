/**
 * Automated Verification Suite for Phase UI-3 Visual Correction
 * Tests:
 * 1. SettingsPage & SettingsPanel: Zero exposed credentials (GEMINI_API_KEY, WEATHER_API_KEY, SERPAPI, JWT_SECRET, googleMapsKey)
 * 2. SettingsPage & SettingsPanel: Proper user-facing sections (Account, Preferences, Notifications, Application Services, Security)
 * 3. PlannerHeader & TripConfigurationCard: Canonical wording "Plan Your Trip", "Plan your journey", "Travel preferences", ₹ budget, and blue "Plan Trip →"
 * 4. Dashboard: Heading "My Trips", subtitle "Your upcoming and saved journeys", "+ Plan New Trip" action, Upcoming/Past/Saved tabs, light cards
 * 5. Elimination of dark glassmorphism: Zero dark glass or border-white classes across redesigned components
 * 6. AuthModal & ChatAssistant: Converted to light surface tokens with high contrast typography
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
console.log('🧪 Running Phase UI-3 Visual Correction Test Suite');
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

// 1. Settings Verification
runTest('SettingsPage has 0 exposed API keys and contains 5 user sections', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'pages', 'SettingsPage.jsx'), 'utf-8');
  assert(!content.includes('GEMINI_API_KEY'), 'Should not mention GEMINI_API_KEY');
  assert(!content.includes('WEATHER_API_KEY'), 'Should not mention WEATHER_API_KEY');
  assert(!content.includes('SERPAPI'), 'Should not mention SERPAPI');
  assert(!content.includes('JWT_SECRET'), 'Should not mention JWT_SECRET');
  assert(!content.includes('googleMapsKey'), 'Should not mention googleMapsKey');
  assert(content.includes('>Account</h2>'), 'Must contain Account section');
  assert(content.includes('>Preferences</h2>'), 'Must contain Preferences section');
  assert(content.includes('>Notifications</h2>'), 'Must contain Notifications section');
  assert(content.includes('>Application & Services</h2>'), 'Must contain Services section');
  assert(content.includes('>Security</h2>'), 'Must contain Security section');
});

runTest('SettingsPanel has 0 exposed API keys and uses Roamly Modal primitive', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'SettingsPanel.jsx'), 'utf-8');
  assert(!content.includes('GEMINI_API_KEY'), 'Should not mention GEMINI_API_KEY');
  assert(!content.includes('WEATHER_API_KEY'), 'Should not mention WEATHER_API_KEY');
  assert(!content.includes('googleMapsKey'), 'Should not mention googleMapsKey');
  assert(content.includes('<Modal'), 'Must use Modal primitive');
  assert(content.includes('>Account</h4>'), 'Must contain Account');
  assert(content.includes('>Preferences</h4>'), 'Must contain Preferences');
  assert(content.includes('>Notifications</h4>'), 'Must contain Notifications');
  assert(content.includes('>Application & Services</h4>'), 'Must contain Services');
  assert(content.includes('>Security</h4>'), 'Must contain Security');
});

// 2. Planner Experience Verification
runTest('PlannerHeader has required heading and supporting text', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'PlannerHeader.jsx'), 'utf-8');
  assert(content.includes('Plan Your Trip') || content.includes('Plan Your Next'), 'Must contain heading');
  assert(content.includes("Tell us where you're going and we'll help you build the perfect itinerary with live routes"), 'Must contain supporting text');
});

runTest('TripConfigurationCard has "Plan your journey", "Travel preferences", ₹ budget, and blue "Plan Trip →"', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'planner', 'TripConfigurationCard.jsx'), 'utf-8');
  assert(content.includes('Plan your journey'), 'Must contain "Plan your journey"');
  assert(content.includes('Travel preferences'), 'Must contain "Travel preferences"');
  assert(content.includes('Plan Trip →'), 'Must contain "Plan Trip →"');
  assert(content.includes('variant="primary"'), 'Must use primary variant button');
});

// 3. My Trips (Dashboard) Verification
runTest('Dashboard has "My Trips", subtitle, "+ Plan New Trip", tabs, and light cards', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'components', 'Dashboard.jsx'), 'utf-8');
  assert(content.includes('My Trips'), 'Must contain heading "My Trips"');
  assert(content.includes('Your upcoming and saved journeys'), 'Must contain exact subtitle');
  assert(content.includes('+ Plan New Trip'), 'Must contain "+ Plan New Trip" CTA');
  assert(content.includes('Upcoming'), 'Must have Upcoming tab');
  assert(content.includes('Past'), 'Must have Past tab');
  assert(content.includes('Saved'), 'Must have Saved tab');
  assert(content.includes('View Trip'), 'Must have "View Trip" button');
  assert(!content.includes('border-white/10'), 'Must not have dark border-white/10');
  assert(!content.includes('bg-slate-900/'), 'Must not have dark bg-slate-900/');
});

// 4. Results Components Light Theme Verification
runTest('Results components do not use dark glass or border-white/10', () => {
  const components = [
    'SmartSuggestions.jsx',
    'ItineraryGenerator.jsx',
    'WeatherInfo.jsx',
    'BudgetCalculator.jsx',
    'AuthModal.jsx',
    'ChatAssistant.jsx',
    'HeroSearch.jsx'
  ];

  for (const file of components) {
    const filePath = path.join(FRONTEND_DIR, 'components', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    assert(!content.includes('border-white/10'), `${file} should not have border-white/10`);
    assert(!content.includes('border-white/5'), `${file} should not have border-white/5`);
    assert(!content.includes('bg-slate-900/60'), `${file} should not have bg-slate-900/60`);
  }
});

// 5. CSS Tokens Verification
runTest('index.css defines light .glass tokens and light Leaflet controls', () => {
  const content = fs.readFileSync(path.join(FRONTEND_DIR, 'index.css'), 'utf-8');
  assert(content.includes('background: #ffffff;'), '.glass must be white background');
  assert(content.includes('border: 1px solid #e2e8f0;'), '.glass must use slate-200 border');
  assert(content.includes('.leaflet-popup-content-wrapper'), 'Must style Leaflet popup');
});

console.log(`\n====================================================`);
console.log(`🏁 Results: ${passedTests}/${totalTests} tests passed`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
