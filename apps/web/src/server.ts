import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import helmet from 'helmet';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));

const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();

const angularApp = new AngularNodeAppEngine();

const contentSecurityPolicyDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  fontSrc: ["'self'", 'data:', 'https:'],
  connectSrc: [
    "'self'",
    'https:',
    'http://127.0.0.1:55321',
    'http://localhost:55321',
    'ws://127.0.0.1:55321',
    'ws://localhost:55321',
  ],
  frameSrc: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [],
};

app.use((req, res, next) =>
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...contentSecurityPolicyDirectives,
        upgradeInsecureRequests:
          req.protocol === 'http' &&
          (req.hostname === 'localhost' || req.hostname === '127.0.0.1')
            ? null
            : [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })(req, res, next)
);

app.use(
  '/analytics/frame.html',
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'self'"],
        scriptSrc: ["'self'", 'https://www.googletagmanager.com'],
        connectSrc: [
          'https://*.google-analytics.com',
          'https://www.googletagmanager.com',
        ],
        imgSrc: ['https://*.google-analytics.com'],
        formAction: ["'none'"],
      },
    },
    frameguard: { action: 'sameorigin' },
    referrerPolicy: { policy: 'no-referrer' },
  }),
  (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  }
);

app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
