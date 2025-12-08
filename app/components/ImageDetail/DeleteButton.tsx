'use client'

import { useState } from 'react'
import { ImageData } from '../../types/image'
import { TrashIcon, Spinner } from '../ui/icons'

interface DeleteButtonProps {
  image: ImageData
  onDelete: (id: string) => Promise<void>
}

export function DeleteButton({ image, onDelete }: DeleteButtonProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      let imageId = image.id

      // If the ID is not available or not reliable, extract it from the URL
      if (!imageId && image.urls?.original) {
        const urlParts = image.urls.original.split('/')
        const filename = urlParts[urlParts.length - 1]
        imageId = filename.split('.')[0] // Remove file extension to get ID
      }

      if (!imageId) {
        throw new Error("无法获取图像ID")
      }

      await onDelete(imageId)
      setShowDeleteConfirm(false)  
    } catch (err) {
      console.error("删除失败:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!showDeleteConfirm) {
    return (
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium flex items-center"
      >
        <TrashIcon className="h-4 w-4 mr-2" />
        删除图片
      </button>
    )
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setShowDeleteConfirm(false)}
        className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm"
        disabled={isDeleting}
      >
        取消
      </button>
      <button
        onClick={handleDelete}
        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm flex items-center"
        disabled={isDeleting}
      >
        {isDeleting ? (
          <>
            <Spinner className="-ml-1 mr-2 h-4 w-4 text-white" />
            处理中
          </>
        ) : (
          <>
            <TrashIcon className="h-4 w-4 mr-1" />
            确认删除
          </>
        )}
      </button>
    </div>
  )
} 