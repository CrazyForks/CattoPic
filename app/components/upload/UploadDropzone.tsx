'use client'

import { useRef } from 'react'
import { UploadIcon } from '../ui/icons'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  maxUploadCount: number
}

export default function UploadDropzone({ onFilesSelected, maxUploadCount }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      onFilesSelected(Array.from(files))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onFilesSelected(Array.from(e.dataTransfer.files))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('active')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('active')
  }

  return (
    <div
      className="drop-zone mb-6 flex flex-col items-center justify-center cursor-pointer"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="mb-4 bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full">
        <UploadIcon className="h-10 w-10 text-indigo-500" />
      </div>
      <p className="text-lg font-medium mb-2">拖放多张图片到这里</p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">或者点击选择文件（可多选）</p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">最多可选择 {maxUploadCount} 张图片</p>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="btn-primary px-4 py-2"
      >
        选择图片
      </button>
    </div>
  )
} 