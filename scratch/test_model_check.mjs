import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const key = process.env.GEMINI_API_KEY;
const testModels = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-pro-latest'
];

for (const m of testModels) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with raw JSON: {"status":"ok"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(8000)
    });
    console.log(`${m.padEnd(25)} -> Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log('   Response:', data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    } else {
      const err = await res.text();
      console.log('   Error:', err.slice(0, 120));
    }
  } catch (e) {
    console.log(`${m.padEnd(25)} -> Error: ${e.message}`);
  }
}
