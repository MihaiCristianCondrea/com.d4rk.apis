import { defineConfig } from 'vite';
import { resolve, join, extname } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

const pagesDir = resolve(__dirname, 'app/src/main/res/layout');
const workersDir = resolve(__dirname, 'app/src/main/js/workers');
const mipmapDir = resolve(__dirname, 'app/src/main/res/mipmap');
const drawableDir = resolve(__dirname, 'app/src/main/res/drawable');

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

      if (fs.existsSync(mipmapDir)) {
        fs.cpSync(mipmapDir, resolve(__dirname, outDir, 'mipmap'), { recursive: true });
      }

      if (fs.existsSync(drawableDir)) {
        fs.cpSync(drawableDir, resolve(__dirname, outDir, 'drawable'), { recursive: true });
      }

      const builtIndex = resolve(__dirname, outDir, 'app/src/main/res/layout/index.html');
      if (fs.existsSync(builtIndex)) {
        const builtHtml = fs.readFileSync(builtIndex, 'utf-8');
        const rewrittenHtml = builtHtml
          .replaceAll('../../assets/', './assets/')
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
        main: resolve(__dirname, 'app/src/main/res/layout/index.html'),
      },
    },
  },
  server: {
    open: false,
    port: 5173,
  },
});
