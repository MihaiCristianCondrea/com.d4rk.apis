import { defineConfig } from 'vite';
import { resolve, join, extname } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
// Change Rationale: Share legacy GitHub tools redirect logic between Vite hooks and tests
// to keep URL mapping and redirect HTML generation in one canonical place.
import legacyRedirects from './scripts/legacyRedirects.js';

const legacyPagesDir = resolve(__dirname, 'app/src/main/res/layout');
const pagesDir = fs.existsSync(legacyPagesDir) ? legacyPagesDir : resolve(__dirname, 'app/src/main/js/app');
const workersDir = resolve(__dirname, 'app/src/main/js/core/data/workers');
const screensDir = resolve(__dirname, 'app/src/main/js/app');
const mipmapDir = resolve(__dirname, 'app/src/main/res/mipmap');
const drawableDir = resolve(__dirname, 'app/src/main/res/drawable');
const {
  legacyGitHubToolRedirects,
  resolveLegacyGitHubToolRoute,
  createLegacyRedirectHtml,
} = legacyRedirects;

const mimeTypes = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

// Change Rationale: Move legacy GitHub tools redirect helpers to a shared module so build
// outputs and dev routing use the same mapping and HTML template.

function staticPagesPlugin() {
  let outDir;

  return {
    name: 'serve-and-copy-static-pages',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      const serveStaticDir = (req, res, next, prefix, directory) => {
        if (!req.url.startsWith(prefix)) {
          return false;
        }

        const cleanPath = decodeURIComponent(req.url.replace(prefix, ''));
        const filePath = join(directory, cleanPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const extension = extname(filePath).toLowerCase();
          res.setHeader('Content-Type', mimeTypes[extension] || 'text/html');
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
        if (serveStaticDir(req, res, next, '/layout/', pagesDir)) return;
        if (serveStaticDir(req, res, next, '/pages/', pagesDir)) return;
        if (serveStaticDir(req, res, next, '/screens/', screensDir)) return;
        next();
      });

      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/workers/')) {
          return next();
        }

        const cleanPath = decodeURIComponent(req.url.replace('/workers/', ''));
        const filePath = join(workersDir, cleanPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', 'application/javascript');
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        next();
      });

      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/mipmap/')) {
          return next();
        }

        const cleanPath = decodeURIComponent(req.url.replace('/mipmap/', ''));
        const filePath = join(mipmapDir, cleanPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', 'image/png');
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        next();
      });

      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/drawable/')) {
          return next();
        }

        const cleanPath = decodeURIComponent(req.url.replace('/drawable/', ''));
        const filePath = join(drawableDir, cleanPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const extension = extname(filePath).toLowerCase();
          res.setHeader('Content-Type', mimeTypes[extension] || 'image/svg+xml');
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        next();
      });
    },
    closeBundle() {
      if (!outDir) {
        return;
      }
      const targetDirs = [
        { name: 'pages', source: pagesDir },
        { name: 'layout', source: pagesDir },
        // Change Rationale: GitHub tool screens now live under the feature UI tree, so
        // copy the feature screens into a dedicated static folder for the router.
        { name: 'screens', source: screensDir },
      ];
      targetDirs.forEach(({ name, source }) => {
        const targetDir = resolve(__dirname, outDir, name);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.cpSync(source, targetDir, { recursive: true });
      });

      // Change Rationale: Create temporary legacy redirect pages so `/layout/githubtools/*.html`
      // continues to resolve without reintroducing layout-driven routing. This keeps Git Patch,
      // Repo Mapper, and Release Stats reachable while migration tests are stabilized.
      const legacyRedirectDir = resolve(__dirname, outDir, 'layout', 'githubtools');
      fs.mkdirSync(legacyRedirectDir, { recursive: true });
      Object.entries(legacyGitHubToolRedirects).forEach(([filename, routeId]) => {
        const redirectHtml = createLegacyRedirectHtml(routeId);
        fs.writeFileSync(resolve(legacyRedirectDir, filename), redirectHtml, 'utf-8');
      });

      const staticFiles = [
        'manifest.json',
        'robots.txt',
        'sitemap.xml',
      ];

      staticFiles.forEach((filename) => {
        const sourcePath = resolve(__dirname, filename);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, resolve(__dirname, outDir, filename));
        }
      });

      const apiSource = resolve(__dirname, 'api');
      if (fs.existsSync(apiSource)) {
        fs.cpSync(apiSource, resolve(__dirname, outDir, 'api'), { recursive: true });
      }

      if (fs.existsSync(workersDir)) {
        fs.cpSync(workersDir, resolve(__dirname, outDir, 'workers'), { recursive: true });
      }

      if (fs.existsSync(mipmapDir)) {
        fs.cpSync(mipmapDir, resolve(__dirname, outDir, 'mipmap'), { recursive: true });
      }

      if (fs.existsSync(drawableDir)) {
        fs.cpSync(drawableDir, resolve(__dirname, outDir, 'drawable'), { recursive: true });
      }

      // Change Rationale: The app shell is now the sole HTML entrypoint, so the build
      // step must locate the shell file instead of a feature screen.
      const builtIndex = resolve(
        __dirname,
        outDir,
        'app/src/main/js/core/ui/shell/AppShell.html',
      );
      if (fs.existsSync(builtIndex)) {
        const builtHtml = fs.readFileSync(builtIndex, 'utf-8');
        const rewrittenHtml = builtHtml
          .replace(/"(?:\.\.\/)+assets\//g, '"./assets/')
          .replaceAll('"mipmap/', '"./mipmap/')
          .replaceAll('"../mipmap/', '"./mipmap/')
          .replaceAll('"../../mipmap/', '"./mipmap/');
        fs.writeFileSync(resolve(__dirname, outDir, 'index.html'), rewrittenHtml, 'utf-8');
      }
    },
  };
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: resolve(__dirname, 'app/src/assets'),
  plugins: [tailwindcss(), staticPagesPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'app/src/main/js'),
    },
  },
  build: {
    outDir: 'assets/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Change Rationale: Use the app shell as the single Vite entrypoint so feature
        // screens can be loaded through the router without importing main.js.
        main: resolve(__dirname, 'app/src/main/js/core/ui/shell/AppShell.html'),
      },
    },
  },
  server: {
    open: false,
    port: 5173,
  },
});
