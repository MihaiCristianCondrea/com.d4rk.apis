import { defineConfig } from 'vite';
import { resolve, join, extname } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

const pagesDir = resolve(__dirname, 'app/src/main/res/layout');
const workersDir = resolve(__dirname, 'app/src/main/js/core/data/workers');
const screensDir = resolve(__dirname, 'app/src/main/js/app');
const mipmapDir = resolve(__dirname, 'app/src/main/res/mipmap');
const drawableDir = resolve(__dirname, 'app/src/main/res/drawable');
// Change Rationale: Legacy GitHub tool URLs previously referenced `/layout/github-tools/*.html`.
// Defining the redirect map here keeps build output and dev routing in sync without restoring
// layout-based routing or adding feature HTML back into res/layout.
const legacyGitHubToolRedirects = Object.freeze({
  'git-patch.html': 'git-patch',
  'repo-mapper.html': 'repo-mapper',
  'release-stats.html': 'release-stats',
});

const mimeTypes = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

/**
 * Resolves legacy GitHub tool layout URLs to route IDs.
 *
 * @param {string | undefined} url Incoming request URL.
 * @returns {string | null} Route ID for the GitHub tool, or null when no mapping exists.
 */
function resolveLegacyGitHubToolRoute(url) {
  if (!url) {
    return null;
  }
  const [path] = url.split('?');
  if (!path.startsWith('/layout/github-tools/')) {
    return null;
  }
  const legacyFile = path.replace('/layout/github-tools/', '');
  return legacyGitHubToolRedirects[legacyFile] || null;
}

/**
 * Builds a redirect HTML payload for legacy GitHub tool URLs.
 *
 * @param {string} routeId Canonical route ID to redirect toward.
 * @returns {string} HTML document that redirects to the SPA route.
 */
function createLegacyRedirectHtml(routeId) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=../..//#${routeId}" />
    <meta name="robots" content="noindex" />
    <title>Redirecting…</title>
  </head>
  <body>
    <script>
      window.location.replace('../../#${routeId}');
    </script>
    <p>Redirecting to the GitHub Tools console…</p>
  </body>
</html>`;
}

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

      // Change Rationale: Create temporary legacy redirect pages so `/layout/github-tools/*.html`
      // continues to resolve without reintroducing layout-driven routing. This keeps Git Patch,
      // Repo Mapper, and Release Stats reachable while migration tests are stabilized.
      const legacyRedirectDir = resolve(__dirname, outDir, 'layout', 'github-tools');
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

      // Change Rationale: The Home screen now follows the Screen naming convention,
      // so the build step must locate the updated path for the main shell.
      const builtIndex = resolve(
        __dirname,
        outDir,
        'app/src/main/js/app/home/ui/HomeScreen.html',
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
        // Change Rationale: Align the Vite entry point with the renamed Home screen
        // so the main shell continues to compile from the canonical home screen file.
        main: resolve(__dirname, 'app/src/main/js/app/home/ui/HomeScreen.html'),
      },
    },
  },
  server: {
    open: false,
    port: 5173,
  },
});
