// Queue 消息类型定义

export interface ImagePaths {
  original: string;
  webp?: string;
  avif?: string;
}

export interface DeleteImageMessage {
  type: 'delete_image';
  imageId: string;
  paths: ImagePaths;
}

export interface DeleteTagImagesMessage {
  type: 'delete_tag_images';
  tagName: string;
  imagePaths: Array<{
    id: string;
    paths: ImagePaths;
  }>;
}

export type QueueMessage = DeleteImageMessage | DeleteTagImagesMessage;
