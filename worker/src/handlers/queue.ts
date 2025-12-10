// Queue Consumer Handler - 处理异步 R2 文件删除
import { StorageService } from '../services/storage';
import type { Env } from '../types';
import type { QueueMessage, ImagePaths } from '../types/queue';

// 删除单个图片的所有 R2 文件
async function deleteImageFiles(paths: ImagePaths, storage: StorageService): Promise<void> {
  const keysToDelete = [paths.original];
  if (paths.webp) keysToDelete.push(paths.webp);
  if (paths.avif) keysToDelete.push(paths.avif);
  await storage.deleteMany(keysToDelete);
}

export async function handleQueueBatch(
  batch: MessageBatch<QueueMessage>,
  env: Env
): Promise<void> {
  const storage = new StorageService(env.R2_BUCKET);

  for (const message of batch.messages) {
    try {
      switch (message.body.type) {
        case 'delete_image':
          // 单个图片：删除其所有 R2 文件
          console.log(`Deleting R2 files for image: ${message.body.imageId}`);
          await deleteImageFiles(message.body.paths, storage);
          break;

        case 'delete_tag_images':
          // 批量图片：并行删除所有关联图片的 R2 文件
          console.log(`Deleting R2 files for tag: ${message.body.tagName}, ${message.body.imagePaths.length} images`);
          await Promise.all(
            message.body.imagePaths.map(img => deleteImageFiles(img.paths, storage))
          );
          break;
      }
      message.ack();
    } catch (error) {
      console.error('Queue message failed:', error);
      message.retry();
    }
  }
}
