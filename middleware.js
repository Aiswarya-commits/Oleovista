// Temporary maintenance mode. Delete this file and push to bring the website back.
export const config = { matcher: '/((?!assets/|api/).*)' };

const REVIEW_KEY = 'for-review';   // the owner opens https://www.oleovista.com/?review=for-review to see the real site

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Oleovista Solutions – back shortly</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#040805;color:#eef4ec;font-family:system-ui,sans-serif;text-align:center}
h1{font-weight:400;font-size:clamp(28px,5vw,48px);margin:0 0 12px}p{color:#9fb0a2;margin:0}</style></head>
<body><div><h1>Oleovista Solutions</h1><p>Our website is being updated and will be back shortly.</p></div></body></html>`;

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('review') === REVIEW_KEY) {
    return new Response(null, { status: 307, headers: {
      Location: url.origin + url.pathname,
      'Set-Cookie': 'oleo_review=1; Path=/; Max-Age=86400; Secure; SameSite=Lax'
    }});
  }
  if ((request.headers.get('cookie') || '').includes('oleo_review=1')) return;   // the owner sees the real site
  return new Response(PAGE, { status: 503, headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '14400', 'Cache-Control': 'no-store'
  }});
}