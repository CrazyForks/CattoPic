import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { AuthService } from './services/auth';
import { corsResponse, unauthorizedResponse } from './utils/response';
import { MetadataService } from './services/metadata';
import { StorageService } from './services/storage';

// Import handlers
import { uploadHandler } from './handlers/upload';
import { imagesHandler, imageDetailHandler, updateImageHandler, deleteImageHandler } from './handlers/images';
import { randomHandler } from './handlers/random';
import { tagsHandler, createTagHandler, renameTagHandler, deleteTagHandler, batchTagsHandler } from './handlers/tags';
import { validateApiKeyHandler, configHandler, cleanupHandler } from './handlers/system';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));

// Handle preflight requests
app.options('*', () => corsResponse());

// Auth middleware for protected routes
const authMiddleware = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = AuthService.extractApiKey(authHeader);

  if (!apiKey) {
    return unauthorizedResponse();
  }

  const authService = new AuthService(c.env.DB);
  const isValid = await authService.validateApiKey(apiKey);

  if (!isValid) {
    return unauthorizedResponse();
  }

  await next();
};

// === Public Routes ===

// Random image (public, no auth required)
app.get('/api/random', randomHandler);

// Serve R2 files (public) with Cache API edge caching
app.get('/r2/*', async (c) => {
  const path = c.req.path.replace('/r2/', '');

  if (!path) {
    return c.json({ success: false, error: 'Path required' }, 400);
  }

  // Use Cloudflare Cache API for edge caching
  const cache = caches.default;
  const cacheKey = new Request(c.req.url, c.req.raw);

  // Check edge cache first
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // Cache miss - fetch from R2
  const object = await c.env.R2_BUCKET.get(path);

  if (!object) {
    return c.json({ success: false, error: 'Not found' }, 404);
  }

  // Check ETag for conditional requests
  const etag = object.httpEtag;
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }

  // Build response with caching headers
  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', etag);
  headers.set('Access-Control-Allow-Origin', '*');

  response = new Response(object.body, { headers });

  // Store in edge cache (non-blocking)
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
});

// === Protected Routes ===

// Auth
app.post('/api/validate-api-key', authMiddleware, validateApiKeyHandler);

// Upload
app.post('/api/upload', authMiddleware, uploadHandler);

// Images CRUD
app.get('/api/images', authMiddleware, imagesHandler);
app.get('/api/images/:id', authMiddleware, imageDetailHandler);
app.put('/api/images/:id', authMiddleware, updateImageHandler);
app.delete('/api/images/:id', authMiddleware, deleteImageHandler);

// Tags CRUD
app.get('/api/tags', authMiddleware, tagsHandler);
app.post('/api/tags', authMiddleware, createTagHandler);
app.put('/api/tags/:name', authMiddleware, renameTagHandler);
app.delete('/api/tags/:name', authMiddleware, deleteTagHandler);
app.post('/api/tags/batch', authMiddleware, batchTagsHandler);

// System
app.get('/api/config', authMiddleware, configHandler);
app.post('/api/cleanup', authMiddleware, cleanupHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// Scheduled handler for cron jobs - cleanup expired images
async function scheduledHandler(
  _event: ScheduledEvent,
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: ExecutionContext
): Promise<void> {
  console.log('Cron job started: cleaning up expired images');

  const metadata = new MetadataService(env.DB);
  const storage = new StorageService(env.R2_BUCKET);

  try {
    const expiredImages = await metadata.getExpiredImages();
    console.log(`Found ${expiredImages.length} expired images`);

    let deletedCount = 0;

    for (const image of expiredImages) {
      try {
        // Delete files from R2
        const keysToDelete = [image.paths.original];
        if (image.paths.webp) keysToDelete.push(image.paths.webp);
        if (image.paths.avif) keysToDelete.push(image.paths.avif);

        await storage.deleteMany(keysToDelete);

        // Delete metadata from D1
        await metadata.deleteImage(image.id);

        deletedCount++;
      } catch (err) {
        console.error('Failed to delete expired image:', image.id, err);
      }
    }

    console.log(`Cron job completed: deleted ${deletedCount} expired images`);
  } catch (err) {
    console.error('Cron job failed:', err);
  }
}

const handlers = {
  fetch: app.fetch,
  scheduled: scheduledHandler,
};

export default handlers;
