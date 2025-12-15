import JSZip from 'jszip'

// 支持的图片格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']

export interface ZipImageEntry {
  path: string
  name: string
  size: number
}

export interface ZipAnalysisResult {
  totalImages: number
  totalSize: number
  images: ZipImageEntry[]
  skippedFiles: {
    path: string
    reason: 'not_image' | 'too_large' | 'directory'
  }[]
}

export interface ExtractedImage {
  id: string
  file: File
  originalPath: string
}

export interface ExtractionProgress {
  current: number
  total: number
  currentFileName: string
}

/**
 * 检查文件是否是支持的图片格式
 */
function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * 根据文件名获取MIME类型
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 分析ZIP文件内容，返回图片列表和统计信息
 */
export async function analyzeZipFile(zipFile: File): Promise<ZipAnalysisResult> {
  const zip = await JSZip.loadAsync(zipFile)

  const images: ZipImageEntry[] = []
  const skippedFiles: ZipAnalysisResult['skippedFiles'] = []

  for (const [path, entry] of Object.entries(zip.files)) {
    // 跳过目录
    if (entry.dir) {
      continue
    }

    // 获取文件名（不含路径）
    const name = path.split('/').pop() || path

    // 跳过隐藏文件和macOS元数据
    if (name.startsWith('.') || name.startsWith('__MACOSX')) {
      continue
    }

    // 检查是否是图片
    if (!isImageFile(name)) {
      skippedFiles.push({ path, reason: 'not_image' })
      continue
    }

    images.push({ path, name, size: 0 })
  }

  return {
    totalImages: images.length,
    totalSize: 0, // 无法在分析阶段获取准确大小
    images,
    skippedFiles,
  }
}

/**
 * 分批解压图片的生成器函数
 * 每批返回指定数量的图片，避免内存溢出
 */
export async function* extractImagesBatch(
  zipFile: File,
  imageEntries: ZipImageEntry[],
  batchSize: number = 50,
  onProgress?: (progress: ExtractionProgress) => void
): AsyncGenerator<ExtractedImage[]> {
  const zip = await JSZip.loadAsync(zipFile)

  for (let i = 0; i < imageEntries.length; i += batchSize) {
    const batch = imageEntries.slice(i, i + batchSize)
    const extractedBatch: ExtractedImage[] = []

    for (const entry of batch) {
      const zipEntry = zip.files[entry.path]
      if (!zipEntry) continue

      try {
        // 通知进度
        if (onProgress) {
          onProgress({
            current: i + extractedBatch.length + 1,
            total: imageEntries.length,
            currentFileName: entry.name,
          })
        }

        // 提取文件内容
        const blob = await zipEntry.async('blob')

        // 创建File对象
        const file = new File([blob], entry.name, {
          type: getMimeType(entry.name),
        })

        extractedBatch.push({
          id: generateId(),
          file,
          originalPath: entry.path,
        })
      } catch (error) {
        console.error(`Failed to extract ${entry.path}:`, error)
        // 继续处理其他文件
      }
    }

    yield extractedBatch
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
