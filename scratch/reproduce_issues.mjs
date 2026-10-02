import assert from 'node:assert';
import { normalizeSerpApiOffer } from '../backend/services/serpApiProvider.js';

console.log('====================================================');
console.log('🔍 REPRODUCING PRODUCTION ISSUE A & ISSUE B');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// Current handleApplyAIPrompt resolution logic in PlannerPage.jsx (lines 692-841)
// -----------------------------------------------------------------------------
function currentHandleApplyAIPromptResolution(payload, activeTrip) {
  const promptText = typeof payload === 'string' ? payload : (payload?.promptText || '');
  const currentValues = (typeof payload === 'object' && payload?.currentValues) ? payload.currentValues : {};

  const lower = promptText.toLowerCase();

  let extractedOrigin = '';
  let extractedDestination = '';

  const fromToMatch = promptText.match(/\bfrom\s+([A-Za-z\s]+?)\s+to\s+([A-Za-z\s]+?)(?=\s+(?:for|with|in|on|departing|under|budget|travelers|\d)|$|[.,!?])/i);
  const toMatch = promptText.match(/\b([A-Za-z]+)\s+to\s+([A-Za-z]+)\b/i);

  if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
    extractedOrigin = fromToMatch[1].trim();
    extractedDestination = fromToMatch[2].trim();
  } else if (toMatch && toMatch[1] && toMatch[2]) {
    const candidateOrigin = toMatch[1].trim();
    const candidateDest = toMatch[2].trim();
    const skipWords = ['trip', 'getaway', 'vacation', 'holiday', 'tour', 'welcome', 'go', 'travel', 'plan'];
    if (!skipWords.includes(candidateOrigin.toLowerCase())) {
      extractedOrigin = candidateOrigin;
      extractedDestination = candidateDest;
    } else {
      extractedDestination = candidateDest;
    }
  }

  if (!extractedDestination) {
    const knownDestinations = [
      { key: 'jaipur', name: 'Jaipur' },
      { key: 'goa', name: 'Goa' },
      { key: 'bengaluru', name: 'Bengaluru' },
      { key: 'bangalore', name: 'Bangalore' },
      { key: 'delhi', name: 'Delhi' }
    ];
    for (const dest of knownDestinations) {
      if (lower.includes(dest.key)) {
        extractedDestination = dest.name;
        break;
      }
    }
  }

  // CURRENT LOGIC from PlannerPage.jsx lines 759-760:
  const existingOrigin = (currentValues.from || activeTrip?.from || '').trim();
  const existingDest = (currentValues.to || activeTrip?.to || '').trim();

  let finalOrigin = '';
  let finalDestination = '';

  if (extractedOrigin && extractedDestination) {
    finalOrigin = extractedOrigin;
    finalDestination = extractedDestination;
  } else if (extractedDestination) {
    finalDestination = extractedDestination;
    finalOrigin = existingOrigin || '';
  } else {
    finalOrigin = existingOrigin || '';
    finalDestination = existingDest || '';
  }

  return { from: finalOrigin, to: finalDestination };
}

// -----------------------------------------------------------------------------
// REPRODUCTION TEST 1: ISSUE A - Stale activeTrip leaks into new AI plan
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Reproducing Issue A (Stale activeTrip Origin Leakage) ---');
{
  // User had a previous plan from Delhi to Bengaluru in activeTrip
  const staleActiveTrip = {
    from: 'Delhi',
    to: 'Bengaluru',
    date: '2026-08-01',
    returnDate: '2026-08-05'
  };

  // User now enters a destination-only AI prompt with no origin in the form
  const newPayload = {
    promptText: 'Plan a 4-day trip to Goa',
    currentValues: {
      from: '',
      to: '',
      date: '2026-10-02'
    }
  };

  const result = currentHandleApplyAIPromptResolution(newPayload, staleActiveTrip);
  console.log('Current result for "Plan a 4-day trip to Goa" with stale Delhi trip in state:');
  console.log('  result.from:', JSON.stringify(result.from));
  console.log('  result.to:  ', JSON.stringify(result.to));

  // The required behavior: missing origin must NOT be invented as Delhi!
  if (result.from === 'Delhi') {
    console.log('  ⚠️ REPRODUCED: Issue A confirmed! Stale activeTrip origin "Delhi" leaked into new plan.');
  } else {
    console.log('  Did not reproduce.');
  }
}

// -----------------------------------------------------------------------------
// REPRODUCTION TEST 2: ISSUE B - Google Flights link does not preserve dates
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Reproducing Issue B (Google Flights Link Lacks Dates) ---');
{
  // Real SerpApi flight item for Hyderabad (HYD) to Bengaluru (BLR) on Oct 2-5, 2026
  const mockSerpItem = {
    flights: [
      {
        flight_number: '6E 521',
        airline: 'IndiGo',
        airline_logo: 'https://logo.png',
        departure_airport: { id: 'HYD', name: 'Rajiv Gandhi International', time: '2026-10-02 06:00' },
        arrival_airport: { id: 'BLR', name: 'Kempegowda International', time: '2026-10-02 07:15' },
        duration: 75
      }
    ],
    total_duration: 75,
    price: 4500
  };

  const normalized = normalizeSerpApiOffer(mockSerpItem, 0, 'economy');
  console.log('Current SerpApi normalized bookingUrl:');
  console.log('  bookingUrl:', normalized.bookingUrl);

  const hasDepartureDate = normalized.bookingUrl.includes('2026-10-02');
  const hasReturnDate = normalized.bookingUrl.includes('2026-10-05');

  console.log('  Contains departure date 2026-10-02?', hasDepartureDate);
  console.log('  Contains return date 2026-10-05?   ', hasReturnDate);

  if (!hasDepartureDate || !hasReturnDate) {
    console.log('  ⚠️ REPRODUCED: Issue B confirmed! Google Flights link does not contain departure or return dates.');
  } else {
    console.log('  Did not reproduce.');
  }
}
