'use client'

import { ZipAnalysisResult } from '../../utils/zipProcessor'
import { ImageIcon, ExclamationTriangleIcon, CheckIcon } from '../ui/icons'

interface ZipPreviewProps {
  analysis: ZipAnalysisResult
  zipFileName: string
  onConfirm: () => void
  onCancel: () => void
  isProcessing?: boolean
}

export default function ZipPreview({
  analysis,
  zipFileName,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ZipPreviewProps) {
  const hasSkippedFiles = analysis.skippedFiles.length > 0

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
          <ImageIcon className="h-6 w-6 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-lg font-medium">ZIP 文件分析完成</h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {zipFileName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              可上传图片
            </span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {analysis.totalImages.toLocaleString()} 张
          </p>
        </div>

        {hasSkippedFiles && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                跳过文件
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {analysis.skippedFiles.length.toLocaleString()}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              非图片或超过大小限制
            </p>
          </div>
        )}
      </div>

      {analysis.totalImages > 100 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>提示：</strong>
            大量图片上传可能需要较长时间，请保持页面打开。
            {analysis.totalImages > 500 && ' 预计需要30分钟以上。'}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isProcessing || analysis.totalImages === 0}
          className="btn-primary flex-1 py-2"
        >
          {isProcessing ? '处理中...' : `开始上传 ${analysis.totalImages} 张图片`}
        </button>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="btn-secondary px-4 py-2"
        >
          取消
        </button>
      </div>
    </div>
  )
}
