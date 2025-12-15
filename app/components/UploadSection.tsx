'use client'

import React, { useState, useEffect, useLayoutEffect } from 'react'
import UploadDropzone from './upload/UploadDropzone'
import ZipUploadDropzone from './upload/ZipUploadDropzone'
import ZipPreview from './upload/ZipPreview'
import ZipUploadProgress from './upload/ZipUploadProgress'
import UploadModeToggle, { UploadMode } from './upload/UploadModeToggle'
import ExpirySelector from './ExpirySelector'
import TagSelector from './upload/TagSelector'
import { api } from '../utils/request'
import { UploadIcon, ExclamationTriangleIcon, ImageIcon, Spinner } from '../components/ui/icons'
import { formatFileSize } from '../utils/imageUtils'
import { useZipUpload } from '../hooks/useZipUpload'
import type { UploadResult } from '../types'

const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB

interface UploadSectionProps {
  onUpload: (files: File[], expiryMinutes: number, tags: string[]) => Promise<void>
  isUploading: boolean
  maxUploadCount?: number
  onFilesSelected?: (files: { id: string, file: File }[]) => void
  onTogglePreview?: () => void
  isPreviewOpen?: boolean
  fileCount?: number
  existingFiles?: { id: string, file: File }[]
  expiryMinutes: number
  setExpiryMinutes: React.Dispatch<React.SetStateAction<number>>
  onTagsChange?: (tags: string[]) => void
  compressionQuality: number
  compressionMaxWidth: number
  preserveAnimation: boolean
  outputFormat: 'webp' | 'avif' | 'both'
  // ZIP上传完成回调
  onZipUploadComplete?: (results: UploadResult[]) => void
}

export default function UploadSection({
  onUpload,
  isUploading,
  maxUploadCount = 50,
  onFilesSelected,
  onTogglePreview,
  isPreviewOpen,
  fileCount = 0,
  existingFiles = [],
  expiryMinutes,
  setExpiryMinutes,
  onTagsChange,
  compressionQuality,
  compressionMaxWidth,
  preserveAnimation,
  outputFormat,
  onZipUploadComplete
}: UploadSectionProps) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('images')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileDetails, setFileDetails] = useState<{ id: string, file: File }[]>([])
  const [wasUploading, setWasUploading] = useState(false)
  const [exceedsLimit, setExceedsLimit] = useState(false)
  const [oversizedFiles, setOversizedFiles] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // ZIP上传状态
  const zipUpload = useZipUpload()

  // 判断是否处于ZIP上传进行中
  const isZipProcessing = zipUpload.phase !== 'idle' && zipUpload.phase !== 'preview' && zipUpload.phase !== 'completed'

  // 获取可用标签列表
  const fetchTags = async () => {
    try {
      const response = await api.get<{ success: boolean; tags: { name: string; count: number }[] }>('/api/tags')
      if (response.success && response.tags && response.tags.length > 0) {
        setAvailableTags(response.tags.map(t => t.name))
      }
    } catch (error) {
      console.error('获取标签失败:', error)
    }
  }

  // 首次加载时获取标签
  useEffect(() => {
    fetchTags()
  }, [])

  // 监听上传状态变化，当上传完成时清空选择的文件
  useEffect(() => {
    if (wasUploading && !isUploading) {
      setSelectedFiles([])
      setFileDetails([])
      setExceedsLimit(false)
    }
    setWasUploading(isUploading)
  }, [isUploading, wasUploading])

  // 如果fileCount从外部变为0，清空本地状态
  useEffect(() => {
    if (fileCount === 0 && selectedFiles.length > 0) {
      setSelectedFiles([])
      setFileDetails([])
      setExceedsLimit(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileCount])

  // 同步现有文件列表 (useLayoutEffect 用于同步 props 到 state)
  useLayoutEffect(() => {
    if (existingFiles.length > 0) {
      // 更新本地状态以反映外部文件列表
      const filesArray = existingFiles.map(item => item.file);
      setSelectedFiles(filesArray);
      setFileDetails(existingFiles);
    }
  }, [existingFiles]);

  // 处理标签变化
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);

    // 通知父组件
    if (onTagsChange) {
      onTagsChange(tags);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    // 获取当前的文件列表
    const currentFiles = [...selectedFiles];
    const currentDetails = [...fileDetails];

    // 创建新的文件列表
    const newFiles = [...currentFiles];
    const newDetails = [...currentDetails];

    // 记录超大文件
    const oversized: string[] = [];

    // 添加新选择的文件
    for (const file of files) {
      // 检查文件大小是否超过限制
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(`${file.name} (${formatFileSize(file.size)})`);
        continue;
      }

      // 检查文件是否已经存在于列表中
      const isDuplicate = currentFiles.some(existingFile =>
        existingFile.name === file.name &&
        existingFile.size === file.size &&
        existingFile.lastModified === file.lastModified
      );

      // 只添加不重复的文件
      if (!isDuplicate) {
        newFiles.push(file);
        newDetails.push({
          id: Math.random().toString(36).substring(2, 11),
          file
        });
      }
    }

    // 更新超大文件提示
    setOversizedFiles(oversized);

    // 检查是否超过最大上传限制
    if (newFiles.length > maxUploadCount) {
      // 如果超过限制，只保留前 maxUploadCount 张图片
      const allowedFiles = newFiles.slice(0, maxUploadCount);
      const allowedDetails = newDetails.slice(0, maxUploadCount);

      setSelectedFiles(allowedFiles);
      setFileDetails(allowedDetails);
      setExceedsLimit(true);

      // 通知父组件
      if (onFilesSelected) {
        onFilesSelected(allowedDetails);
      }
    } else {
      setSelectedFiles(newFiles);
      setFileDetails(newDetails);
      setExceedsLimit(false);

      // 通知父组件
      if (onFilesSelected) {
        onFilesSelected(newDetails);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFiles.length === 0) return
    await onUpload(selectedFiles, expiryMinutes, selectedTags)
  }

  // ZIP文件选择处理
  const handleZipFileSelected = (file: File) => {
    zipUpload.selectZipFile(file)
  }

  // 开始ZIP上传
  const handleZipUploadConfirm = () => {
    zipUpload.startUpload({
      tags: selectedTags,
      expiryMinutes,
      quality: compressionQuality,
      maxWidth: compressionMaxWidth,
      preserveAnimation,
      outputFormat,
      onCompleted: onZipUploadComplete,
    })
  }

  // 切换模式时重置状态
  const handleModeChange = (mode: UploadMode) => {
    if (isUploading || isZipProcessing) return
    setUploadMode(mode)
    if (mode === 'zip') {
      zipUpload.reset()
    }
  }

  // 渲染ZIP上传内容
  const renderZipUploadContent = () => {
    const { phase, zipFile, analysis, extractProgress, uploadProgress, error } = zipUpload

    // 加载/分析中
    if (phase === 'loading' || phase === 'analyzing') {
      return (
        <div className="card p-8 mb-6 flex flex-col items-center justify-center">
          <Spinner className="h-10 w-10 text-indigo-500 mb-4" />
          <p className="text-lg font-medium">
            {phase === 'loading' ? '正在加载ZIP文件...' : '正在分析ZIP内容...'}
          </p>
        </div>
      )
    }

    // 预览模式
    if (phase === 'preview' && analysis && zipFile) {
      return (
        <>
          <ZipPreview
            analysis={analysis}
            zipFileName={zipFile.name}
            onConfirm={handleZipUploadConfirm}
            onCancel={zipUpload.reset}
          />
          <ExpirySelector onChange={setExpiryMinutes} />
          <TagSelector
            selectedTags={selectedTags}
            availableTags={availableTags}
            onTagsChange={handleTagsChange}
            onNewTagCreated={fetchTags}
          />
        </>
      )
    }

    // 解压/上传中
    if (phase === 'extracting' || phase === 'uploading' || phase === 'completed') {
      return (
        <ZipUploadProgress
          phase={phase}
          extractProgress={extractProgress}
          uploadProgress={uploadProgress}
          onCancel={zipUpload.cancel}
        />
      )
    }

    // 空闲状态 - 显示拖放区
    return (
      <>
        <ZipUploadDropzone onFileSelected={handleZipFileSelected} />
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="card p-8 mb-8">
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
          <UploadIcon className="h-6 w-6 mr-2 text-indigo-500" />
          上传图片
        </h2>

        {/* 模式切换 */}
        <UploadModeToggle
          mode={uploadMode}
          onChange={handleModeChange}
          disabled={isUploading || isZipProcessing}
        />

        {uploadMode === 'images' ? (
          // 普通图片上传
          <form onSubmit={handleSubmit}>
            <UploadDropzone
              onFilesSelected={handleFilesSelected}
              maxUploadCount={maxUploadCount}
            />

            <ExpirySelector onChange={setExpiryMinutes} />

            <TagSelector
              selectedTags={selectedTags}
              availableTags={availableTags}
              onTagsChange={handleTagsChange}
              onNewTagCreated={fetchTags}
            />

            {exceedsLimit && (
              <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 shadow-xs">
                <div className="flex items-start">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full mr-3 shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">超出上传限制</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      一次最多只能上传 <span className="font-medium">{maxUploadCount}</span> 张图片。已自动选择前 {maxUploadCount} 张。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {oversizedFiles.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 shadow-xs">
                <div className="flex items-start">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3 shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300 mb-1">文件过大已跳过</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                      以下文件超过 70MB 限制，已自动跳过：
                    </p>
                    <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                      {oversizedFiles.map((name, index) => (
                        <li key={index}>{name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  已选择 <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedFiles.length}</span> 张图片
                </div>
                {onTogglePreview && (
                  <button
                    type="button"
                    onClick={onTogglePreview}
                    className="px-4 py-2 text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors duration-200 flex items-center font-medium"
                  >
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    {isPreviewOpen ? '隐藏文件列表' : '查看文件列表'}
                  </button>
                )}
              </div>
            )}
          </form>
        ) : (
          // ZIP批量上传
          renderZipUploadContent()
        )}
      </div>
    </>
  )
}
