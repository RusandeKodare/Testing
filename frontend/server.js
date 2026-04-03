const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

function createCsrfFormToken() {
  return crypto.randomBytes(32).toString('hex');
}

function renderHtmlWithCsrf(filePath, csrfToken) {
  return fs.readFileSync(filePath, 'utf8').replace(/__CSRF_TOKEN__/g, csrfToken);
}

const frontendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
});

app.disable('x-powered-by');
app.use(frontendLimiter);

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const isStaticAsset = /\.(css|js|mjs|svg|png|jpg|jpeg|gif|webp|ico|txt|xml|map)$/i.test(req.path);
  const isSensitiveStaticMeta = req.path === '/favicon.svg' || req.path === '/sitemap.xml';
  const isReadRequest = req.method === 'GET' || req.method === 'HEAD';
  if (isSensitiveStaticMeta && isReadRequest) {
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
  } else if (isStaticAsset && isReadRequest) {
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
  } else if (isReadRequest) {
    // HTML/document responses are safe to cache briefly for baseline scanners and browsers.
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
  } else {
    // Non-idempotent requests remain non-storable.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  res.setHeader('Vary', 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://localhost:3000; manifest-src 'self'; media-src 'none'; frame-src 'none'; child-src 'none'; worker-src 'self'; upgrade-insecure-requests; block-all-mixed-content; sandbox allow-forms allow-same-origin allow-scripts"
  );
  next();
});

app.use('/dist', express.static(path.join(__dirname, 'dist'), {
  cacheControl: false
}));

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  const csrfToken = createCsrfFormToken();
  const indexFile = path.join(__dirname, 'public', 'index.html');
  res.type('html').send(renderHtmlWithCsrf(indexFile, csrfToken));
});

app.get('/dashboard.html', (req, res) => {
  const csrfToken = createCsrfFormToken();
  const dashboardFile = path.join(__dirname, 'public', 'dashboard.html');
  res.type('html').send(renderHtmlWithCsrf(dashboardFile, csrfToken));
});

app.use(express.static(path.join(__dirname, 'public'), {
  cacheControl: false
}));

app.post('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
  res.removeHeader('Pragma');
  res.removeHeader('Expires');
  res.status(405).type('text/plain').send('Method Not Allowed');
});

app.use((req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
