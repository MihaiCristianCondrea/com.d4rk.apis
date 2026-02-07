import { defineConfig } from 'vite';
import { resolve, join, extname } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import legacyRedirects from './scripts/legacyRedirects.js';

const appScreensDir = resolve(__dirname, 'src/app');
const workersDir = resolve(__dirname, 'src/core/data/workers');
const apiSource = resolve(__dirname, 'api');
const { legacyGitHubToolRedirects, createLegacyRedirectHtml, resolveLegacyGitHubToolRoute } = legacyRedirects;

const mimeTypes = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.txt': 'text/plain',
};

function compatibilityAssetsPlugin() {
  let outDir;
  return {
    name: 'compatibility-assets-plugin',
    configResolved(config) { outDir = config.build.outDir; },
    configureServer(server) {
      const serveStaticDir = (req, res, prefix, directory) => {
        if (!req.url.startsWith(prefix)) {
          return false;
        }

        const cleanPath = decodeURIComponent(req.url.replace(prefix, ''));
        const filePath = join(directory, cleanPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const extension = extname(filePath).toLowerCase();
          res.setHeader('Content-Type', mimeTypes[extension] || 'text/plain');
          fs.createReadStream(filePath).pipe(res);
          return true;
        }

        return false;
      };

      server.middlewares.use((req, res, next) => {
        const legacyRouteId = resolveLegacyGitHubToolRoute(req.url);
        if (legacyRouteId) {
          res.statusCode = 302;
          res.setHeader('Location', `/#${legacyRouteId}`);
          res.end();
          return;
        }

        // Change Rationale: Feature screens moved into `src/app/**`, but router fetches from
        // `/screens/*`. Serving those files directly in dev keeps the screen loader behavior
        // identical to production builds and prevents Vite SPA fallback from returning index HTML.
        if (serveStaticDir(req, res, '/screens/', appScreensDir)) return;

        next();
      });
    },
    closeBundle() {
      if (!outDir) return;
      if (fs.existsSync(appScreensDir)) {
        fs.cpSync(appScreensDir, resolve(outDir, 'screens'), { recursive: true });
      }
      if (fs.existsSync(workersDir)) {
        fs.cpSync(workersDir, resolve(outDir, 'workers'), { recursive: true });
      }
      if (fs.existsSync(apiSource)) {
        fs.cpSync(apiSource, resolve(outDir, 'api'), { recursive: true });
      }
      const legacyRedirectDir = resolve(outDir, 'layout', 'githubtools');
      fs.mkdirSync(legacyRedirectDir, { recursive: true });
      Object.entries(legacyGitHubToolRedirects).forEach(([filename, routeId]) => {
        fs.writeFileSync(resolve(legacyRedirectDir, filename), createLegacyRedirectHtml(routeId), 'utf-8');
      });
    },
  };
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: resolve(__dirname, 'public'),
  plugins: [tailwindcss(), compatibilityAssetsPlugin()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: { outDir: 'assets/dist', emptyOutDir: true, rollupOptions: { input: { main: resolve(__dirname, 'index.html') } } },
  server: { open: false, port: 5173 },
});
