async function check() {
  const r = await fetch('https://frontend-five-iota-e0g61pg4et.vercel.app');
  const html = await r.text();
  const scriptMatch = html.match(/src="([^"]+\.js)"/);
  console.log('Script match:', scriptMatch ? scriptMatch[1] : 'not found');
  if (scriptMatch) {
    const jsUrl = 'https://frontend-five-iota-e0g61pg4et.vercel.app' + scriptMatch[1];
    const jsRes = await fetch(jsUrl);
    const jsText = await jsRes.text();
    console.log('JS length:', jsText.length);
    const backendMatches = jsText.match(/https?:\/\/[a-zA-Z0-9.-]+\.onrender\.com/g);
    console.log('Render backend URLs found in JS:', Array.from(new Set(backendMatches || [])));
  }
}
check();
