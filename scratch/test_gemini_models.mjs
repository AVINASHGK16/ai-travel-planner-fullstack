import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const apiKey = process.env.GEMINI_API_KEY;
const models = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

console.log('Testing Gemini candidate models:');

for (const model of models) {
  const start = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with raw JSON: {"status": "ok"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(10000)
    });
    const latency = Date.now() - start;
    console.log(`Model: ${model.padEnd(25)} -> Status: ${res.status}, Latency: ${latency}ms, OK: ${res.ok}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`   Output:`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    } else {
      const txt = await res.text();
      console.log(`   Error:`, txt.slice(0, 150));
    }
  } catch (err) {
    console.log(`Model: ${model.padEnd(25)} -> Error: ${err.message}`);
  }
}
