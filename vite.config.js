import { defineConfig } from 'vite';
import { resolve, join, extname } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

const pagesDir = resolve(__dirname, 'src/pages');
const workersDir = resolve(__dirname, 'src/main/workers');

const mimeTypes = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

function staticPagesPlugin() {
  let outDir;

  return {
    name: 'serve-and-copy-static-pages',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/pages/')) {
          return next();
        }

        const cleanPath = decodeURIComponent(req.url.replace('/pages/', ''));
        const filePath = join(pagesDir, cleanPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const extension = extname(filePath).toLowerCase();
          res.setHeader('Content-Type', mimeTypes[extension] || 'text/html');
          fs.createReadStream(filePath).pipe(res);
          return;
        }

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
    },
    closeBundle() {
      if (!outDir) {
        return;
      }
      const targetDir = resolve(__dirname, outDir, 'pages');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.cpSync(pagesDir, targetDir, { recursive: true });

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

      const builtIndex = resolve(__dirname, outDir, 'src/pages/index.html');
      if (fs.existsSync(builtIndex)) {
        const builtHtml = fs.readFileSync(builtIndex, 'utf-8');
        const rewrittenHtml = builtHtml
          .replaceAll('../../assets/', './assets/')
          .replaceAll('"icons/', '"./icons/')
          .replaceAll('"../icons/', '"./icons/')
          .replaceAll('"../../icons/', '"./icons/');
        fs.writeFileSync(resolve(__dirname, outDir, 'index.html'), rewrittenHtml, 'utf-8');
      }
    },
  };
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: resolve(__dirname, 'src/assets'),
  plugins: [tailwindcss(), staticPagesPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/main'),
    },
  },
  build: {
    outDir: 'assets/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/pages/index.html'),
      },
    },
  },
  server: {
    open: false,
    port: 5173,
  },
});
