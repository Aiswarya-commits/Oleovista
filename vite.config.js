import { defineConfig, loadEnv } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { oliviaNodeHandler } from './server/olivia-core.mjs';

// Read .env files directly (Vite's loadEnv lets old system variables win).
function readEnvFiles(mode) {
  const out = {};
  for (const f of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
  return out;
}

/*
  Olivia's AI endpoint for local development:
  `npm run dev` and `npm run preview` answer POST /api/olivia-chat
  using the API key from your .env file (never sent to the browser).
*/
function oliviaApi() {
  const mount = (server) => {
    server.middlewares.use('/api/olivia-chat', (req, res) => oliviaNodeHandler(req, res));
  };
  return { name: 'olivia-api', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Values in your .env file WIN over any old keys set in Windows/Mac system variables.
  const fileEnv = readEnvFiles(mode);
  for (const k of ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID', 'OLIVIA_MODEL', 'OLIVIA_WEB_SEARCH', 'OLIVIA_SITE_URL']) {
    if (fileEnv[k]) process.env[k] = fileEnv[k];
    else if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  const k = (process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim();
  const which = k.startsWith('sk-or-') ? 'OpenRouter' : 'Anthropic';
  console.log(k ? `[olivia] ${which} API key loaded: ${k.slice(0, 10)}...${k.slice(-4)} (${k.length} chars)` : '[olivia] No OPENROUTER_API_KEY or ANTHROPIC_API_KEY found in .env');
  return {
    plugins: [oliviaApi()]
  };
});