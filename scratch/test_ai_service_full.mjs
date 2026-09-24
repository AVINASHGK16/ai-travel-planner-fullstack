import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { generateTrip } = await import('../backend/services/aiService.js');

console.log('Testing full generateTrip flow in aiService.js:');
const start = Date.now();
try {
  const result = await generateTrip({
    from: 'Bengaluru',
    to: 'Goa',
    date: '2026-10-15',
    returnDate: '2026-10-20',
    travelers: 2,
    budget: 50000,
    preferredMode: 'flight'
  });
  const latency = Date.now() - start;
  console.log(`generateTrip completed in ${latency}ms`);
  console.log(`isAIGenerated: ${result.isAIGenerated}`);
  console.log(`source: ${result.source}`);
  console.log(`Summary: ${result.summary?.slice(0, 100)}...`);
  console.log(`Itinerary days count: ${result.itinerary?.length}`);
  console.log(`Canonical locations present:`, Boolean(result.canonicalLocations?.from && result.canonicalLocations?.to));
  console.log(`Coordinates present:`, Boolean(result.coordinates?.from && result.coordinates?.to));
} catch (err) {
  console.log(`generateTrip failed: ${err.message} (${err.code}, status: ${err.statusCode})`);
  process.exitCode = 1;
}
