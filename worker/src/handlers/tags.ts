import type { Context } from 'hono';
import type { Env } from '../types';
import { MetadataService } from '../services/metadata';
import { StorageService } from '../services/storage';
import { CacheService, CacheKeys, CACHE_TTL } from '../services/cache';
import { successResponse, errorResponse } from '../utils/response';
import { sanitizeTagName } from '../utils/validation';

// GET /api/tags - Get all tags
export async function tagsHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const cache = new CacheService(c.env.CACHE_KV);
    const cacheKey = CacheKeys.tagsList();

    // Try to get from cache
    const cached = await cache.get<ReturnType<typeof successResponse>>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const metadata = new MetadataService(c.env.DB);
    const tags = await metadata.getAllTags();

    const responseData = { tags };

    // Store in cache
    await cache.set(cacheKey, responseData, CACHE_TTL.TAGS_LIST);

    return successResponse(responseData);

  } catch (err) {
    console.error('Tags handler error:', err);
    return errorResponse('获取标签列表失败');
  }
}

// POST /api/tags - Create new tag
export async function createTagHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json();
    const name = sanitizeTagName(body.name || '');

    if (!name) {
      return errorResponse('标签名称不能为空');
    }

    const metadata = new MetadataService(c.env.DB);
    await metadata.createTag(name);

    // Invalidate tags cache
    const cache = new CacheService(c.env.CACHE_KV);
    await cache.invalidateTagsList();

    return successResponse({
      tag: { name, count: 0 }
    });

  } catch (err) {
    console.error('Create tag handler error:', err);
    return errorResponse('创建标签失败');
  }
}

// PUT /api/tags/:name - Rename tag
export async function renameTagHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const oldName = decodeURIComponent(c.req.param('name'));
    const body = await c.req.json();
    const newName = sanitizeTagName(body.newName || '');

    if (!newName) {
      return errorResponse('新标签名称不能为空');
    }

    if (oldName === newName) {
      return errorResponse('新名称不能与旧名称相同');
    }

    const metadata = new MetadataService(c.env.DB);
    const affectedCount = await metadata.renameTag(oldName, newName);

    // Invalidate caches (tag rename affects image list filtering)
    const cache = new CacheService(c.env.CACHE_KV);
    await cache.invalidateAfterTagChange();

    // Get updated count
    const tags = await metadata.getAllTags();
    const tag = tags.find(t => t.name === newName);

    return successResponse({
      tag: tag || { name: newName, count: affectedCount }
    });

  } catch (err) {
    console.error('Rename tag handler error:', err);
    return errorResponse('重命名标签失败');
  }
}

// DELETE /api/tags/:name - Delete tag and associated images
export async function deleteTagHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const name = decodeURIComponent(c.req.param('name'));

    const metadata = new MetadataService(c.env.DB);
    const storage = new StorageService(c.env.R2_BUCKET);

    // Get all images with this tag first (to get their R2 paths)
    const images = await metadata.getImagesByTag(name);

    // Collect all R2 keys to delete
    const keysToDelete: string[] = [];
    for (const image of images) {
      keysToDelete.push(image.paths.original);
      if (image.paths.webp) keysToDelete.push(image.paths.webp);
      if (image.paths.avif) keysToDelete.push(image.paths.avif);
    }

    // Delete files from R2
    if (keysToDelete.length > 0) {
      await storage.deleteMany(keysToDelete);
    }

    // Delete tag and associated images from database
    const { deletedImages } = await metadata.deleteTagWithImages(name);

    // Invalidate caches
    const cache = new CacheService(c.env.CACHE_KV);
    await cache.invalidateAfterTagChange();

    return successResponse({
      message: '标签及关联图片已删除',
      deletedImages
    });

  } catch (err) {
    console.error('Delete tag handler error:', err);
    return errorResponse('删除标签失败');
  }
}

// POST /api/tags/batch - Batch add/remove tags from images
export async function batchTagsHandler(c: Context<{ Bindings: Env }>): Promise<Response> {
  try {
    const body = await c.req.json();
    const { imageIds, addTags, removeTags } = body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return errorResponse('图片ID列表不能为空');
    }

    const sanitizedAddTags = (addTags || []).map(sanitizeTagName).filter(Boolean);
    const sanitizedRemoveTags = (removeTags || []).map(sanitizeTagName).filter(Boolean);

    if (sanitizedAddTags.length === 0 && sanitizedRemoveTags.length === 0) {
      return errorResponse('必须提供要添加或删除的标签');
    }

    const metadata = new MetadataService(c.env.DB);
    const updatedCount = await metadata.batchUpdateTags(imageIds, sanitizedAddTags, sanitizedRemoveTags);

    // Invalidate caches
    const cache = new CacheService(c.env.CACHE_KV);
    await cache.invalidateAfterTagChange();

    return successResponse({ updatedCount });

  } catch (err) {
    console.error('Batch tags handler error:', err);
    return errorResponse('更新标签失败');
  }
}
