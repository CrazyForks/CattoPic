'use client'

import { ZipUploadPhase } from '../../hooks/useZipUpload'
import { ExtractionProgress } from '../../utils/zipProcessor'
import { Spinner, CheckIcon, Cross1Icon, ArchiveIcon, UploadIcon } from '../ui/icons'

interface ZipUploadProgressProps {
  phase: ZipUploadPhase
  extractProgress: ExtractionProgress | null
  uploadProgress: {
    completed: number
    failed: number
    total: number
  }
  onCancel: () => void
}

export default function ZipUploadProgress({
  phase,
  extractProgress,
  uploadProgress,
  onCancel,
}: ZipUploadProgressProps) {
  const isExtracting = phase === 'extracting'
  const isUploading = phase === 'uploading'
  const isCompleted = phase === 'completed'

  // 计算总进度
  const totalProgress = isExtracting
    ? extractProgress
      ? Math.round((extractProgress.current / extractProgress.total) * 50)
      : 0
    : isUploading
    ? 50 + Math.round(((uploadProgress.completed + uploadProgress.failed) / uploadProgress.total) * 50)
    : isCompleted
    ? 100
    : 0

  return (
    <div className="card p-6 mb-6">
      {/* 标题和取消按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
              <CheckIcon className="h-6 w-6 text-green-500" />
            </div>
          ) : (
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
              <Spinner className="h-6 w-6 text-indigo-500" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium">
              {isExtracting && '正在解压...'}
              {isUploading && '正在上传...'}
              {isCompleted && '上传完成'}
            </h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {extractProgress && isExtracting && extractProgress.currentFileName}
              {isUploading &&
                `${uploadProgress.completed + uploadProgress.failed} / ${uploadProgress.total}`}
              {isCompleted &&
                `成功 ${uploadProgress.completed}，失败 ${uploadProgress.failed}`}
            </p>
          </div>
        </div>
        {!isCompleted && (
          <button
            onClick={onCancel}
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500 transition-colors"
            title="取消"
          >
            <Cross1Icon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 总进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-light-text-secondary dark:text-dark-text-secondary">
            总进度
          </span>
          <span className="font-medium">{totalProgress}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* 分阶段进度 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 解压进度 */}
        <div
          className={`p-3 rounded-lg ${
            isExtracting
              ? 'bg-indigo-50 dark:bg-indigo-900/20'
              : isUploading || isCompleted
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-gray-50 dark:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <ArchiveIcon
              className={`h-4 w-4 ${
                isExtracting
                  ? 'text-indigo-500'
                  : isUploading || isCompleted
                  ? 'text-green-500'
                  : 'text-gray-400'
              }`}
            />
            <span className="text-sm font-medium">解压</span>
            {(isUploading || isCompleted) && (
              <CheckIcon className="h-4 w-4 text-green-500 ml-auto" />
            )}
          </div>
          {extractProgress && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {extractProgress.current} / {extractProgress.total}
            </p>
          )}
        </div>

        {/* 上传进度 */}
        <div
          className={`p-3 rounded-lg ${
            isUploading
              ? 'bg-indigo-50 dark:bg-indigo-900/20'
              : isCompleted
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-gray-50 dark:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <UploadIcon
              className={`h-4 w-4 ${
                isUploading
                  ? 'text-indigo-500'
                  : isCompleted
                  ? 'text-green-500'
                  : 'text-gray-400'
              }`}
            />
            <span className="text-sm font-medium">上传</span>
            {isCompleted && <CheckIcon className="h-4 w-4 text-green-500 ml-auto" />}
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-green-600 dark:text-green-400">
              {uploadProgress.completed} 成功
            </span>
            {uploadProgress.failed > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {uploadProgress.failed} 失败
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
