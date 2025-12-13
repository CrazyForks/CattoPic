'use client'

import { useRef, useState } from 'react'
import { ArchiveIcon } from '../ui/icons'

interface ZipUploadDropzoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export default function ZipUploadDropzone({
  onFileSelected,
  disabled = false,
}: ZipUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelected(file)
    }
    // 清空input，允许重新选择相同文件
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file && file.name.toLowerCase().endsWith('.zip')) {
      onFileSelected(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  return (
    <div
      className={`drop-zone mb-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <div className="mb-4 bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full">
        <ArchiveIcon className="h-10 w-10 text-indigo-500" />
      </div>
      <p className="text-lg font-medium mb-2">拖放ZIP压缩包到这里</p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
        支持包含多张图片的ZIP文件
      </p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
        支持 JPG、PNG、GIF、WebP、AVIF 格式
      </p>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".zip"
        onChange={handleFileSelect}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          fileInputRef.current?.click()
        }}
        className="btn-primary px-4 py-2"
        disabled={disabled}
      >
        选择ZIP文件
      </button>
    </div>
  )
}
