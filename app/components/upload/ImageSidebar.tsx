'use client'

import { FileIcon, Cross1Icon, TrashIcon, PlusIcon } from '../ui/icons'

interface ImageFile {
  id: string
  file: File
}

interface ImageSidebarProps {
  files: ImageFile[]
  onRemoveFile: (id: string) => void
  onRemoveAll: () => void
  isOpen: boolean
  onClose: () => void
}

// 将文件大小转换为可读格式
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function ImageSidebar({ files, onRemoveFile, onRemoveAll, isOpen, onClose }: ImageSidebarProps) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-y-0 right-0 flex z-50">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/30 dark:bg-black/50" 
        onClick={onClose}
      ></div>
      
      {/* 侧边栏主体 */}
      <div className="relative w-80 sm:w-96 h-full bg-white dark:bg-dark-bg-primary shadow-xl flex flex-col animate-slide-in-right">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center">
            <FileIcon className="h-5 w-5 mr-2 text-indigo-500" />
            已选择文件 ({files.length})
          </h3>
          <button 
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Cross1Icon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {files.length > 0 ? (
            <div className="space-y-3">
              {files.map(file => (
                <div key={file.id} className="group flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="overflow-hidden mr-2 flex-1">
                    <div className="truncate font-medium text-sm">{file.file.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.file.size)}</div>
                  </div>
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 py-10">
              <PlusIcon className="h-12 w-12 mb-4" />
              <p className="text-sm">没有选择文件</p>
            </div>
          )}
        </div>
        
        {files.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onRemoveAll}
              className="w-full py-2 px-4 flex items-center justify-center bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors duration-200"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              清除全部文件
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 