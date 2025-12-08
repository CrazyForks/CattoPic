'use client'

import { useState, useEffect } from 'react'
import { getApiKey, validateApiKey, setApiKey } from './utils/auth'
import { api } from './utils/request'
import ApiKeyModal from './components/ApiKeyModal'
import { UploadResponse, StatusMessage as StatusMessageType, ConfigSettings } from './types'
import Header from './components/Header'
import UploadSection from './components/UploadSection'
import StatusMessage from './components/StatusMessage'
import UploadProgress from './components/UploadProgress'
import ImageSidebar from './components/ImageSidebar'
import PreviewSidebar from './components/upload/PreviewSidebar'
import { motion } from 'framer-motion'
import { ImageIcon, PlusCircledIcon } from './components/ui/icons'

const DEFAULT_MAX_UPLOAD_COUNT = 10;

export default function Home() {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState<StatusMessageType | null>(null)
  const [uploadResults, setUploadResults] = useState<UploadResponse['results']>([])
  const [showResultSidebar, setShowResultSidebar] = useState(false)
  const [showPreviewSidebar, setShowPreviewSidebar] = useState(false)
  const [isKeyVerified, setIsKeyVerified] = useState(false)
  const [maxUploadCount, setMaxUploadCount] = useState(DEFAULT_MAX_UPLOAD_COUNT)
  const [fileDetails, setFileDetails] = useState<{ id: string, file: File }[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [expiryMinutes, setExpiryMinutes] = useState<number>(0)

  useEffect(() => {
    if (uploadResults.length > 0 && !showResultSidebar) {
      setShowResultSidebar(true)
      // 上传完成后关闭预览侧边栏
      setShowPreviewSidebar(false)
    }
  }, [uploadResults])

  // 监听文件选择，当有文件选择时，打开预览侧边栏
  useEffect(() => {
    if (fileDetails.length > 0 && !showPreviewSidebar) {
      setShowPreviewSidebar(true)
    } else if (fileDetails.length === 0) {
      setShowPreviewSidebar(false)
    }
  }, [fileDetails])

  useEffect(() => {
    const checkApiKey = async () => {
      const apiKey = getApiKey()
      if (!apiKey) {
        setShowApiKeyModal(true)
        setIsKeyVerified(false)
        return
      }

      const isValid = await validateApiKey(apiKey)
      if (!isValid) {
        setShowApiKeyModal(true)
        setIsKeyVerified(false)
        setStatus({
          type: 'error',
          message: 'API Key无效,请重新验证'
        })
      } else {
        setIsKeyVerified(true)
      }
    }

    checkApiKey()
  }, [])

  useEffect(() => {
    // 获取配置
    const fetchConfig = async () => {
      try {
        const response = await api.request<ConfigSettings>('/api/config')
        setMaxUploadCount(response.maxUploadCount)
        // 这里可以处理其他配置项，如果需要在前端使用
        // 例如：如果需要展示高级设置选项
      } catch (error) {
        console.error('Failed to fetch config:', error)
        // 如果获取失败，使用默认值
        setMaxUploadCount(DEFAULT_MAX_UPLOAD_COUNT)
      }
    }

    fetchConfig()
  }, [])

  const handleUpload = async () => {
    const selectedFiles = fileDetails.map(item => item.file)
    
    if (selectedFiles.length === 0) return

    const apiKey = getApiKey()
    if (!apiKey) {
      setShowApiKeyModal(true)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setStatus(null)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 300)

      // 添加过期时间参数
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('images[]', file)
      })

      // 添加过期时间参数（分钟）
      formData.append('expiryMinutes', expiryMinutes.toString())

      // 添加标签参数
      if (selectedTags.length > 0) {
        formData.append('tags', selectedTags.join(','))
      }

      // 使用自定义上传方法
      const result = await api.request<UploadResponse>('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const resultsWithIds = result.results.map(item => {
        // Extract the real image ID from the original URL if available
        let imageId = Math.random().toString(36).substring(2) // Default to random ID
        let path = item.urls?.original || ''

        if (item.urls?.original) {
          // Extract file ID from the original URL
          const urlParts = item.urls.original.split('/')
          const filename = urlParts[urlParts.length - 1]
          if (filename.includes('.')) {
            imageId = filename.split('.')[0] // Remove file extension to get ID
          }
        }

        return {
          ...item,
          id: imageId,
          path
        }
      })

      setUploadResults(resultsWithIds)
      const successCount = resultsWithIds.filter(r => r.status === 'success').length
      const errorCount = resultsWithIds.filter(r => r.status === 'error').length
      const totalCount = resultsWithIds.length

      setStatus({
        type: errorCount === 0 ? 'success' : 'warning',
        message: `上传完成：共${totalCount}张，${successCount}张成功，${errorCount}张失败`
      })
      
      // 重置文件详情，清空上传队列
      setFileDetails([])
    } catch (error) {
      let errorMessage = '上传失败，请重试'

      if (error instanceof Error) {
        if (error.message.includes('超过最大上传数量') || error.message.includes('maximum upload')) {
          errorMessage = `上传失败：超过最大上传数量限制（${maxUploadCount}张图片）`
        } else {
          errorMessage = `上传失败：${error.message}`
        }
      }

      setStatus({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handleDeleteImage = async (id: string) => {
    try {
      const image = uploadResults.find((img) => img.id === id);
      if (!image || !image.urls?.original) return;

      // Extract the real image ID from the original URL
      // The original URL would be like: /images/original/landscape/filename.jpg
      // or /images/original/portrait/filename.jpg
      const urlParts = image.urls.original.split('/');
      const filename = urlParts[urlParts.length - 1];
      const fileId = filename.split('.')[0]; // Remove file extension to get the real ID

      const response = await api.post<{ success: boolean; message: string }>(
        "/api/delete-image",
        {
          id: fileId
        }
      );

      if (response.success) {
        // From current list remove the deleted image
        setUploadResults(prev => prev.filter(item => item.id !== id));

        // If after deletion no images are left, close the sidebar
        if (uploadResults.length <= 1) {
          setShowResultSidebar(false);
        }

        setStatus({
          type: 'success',
          message: response.message
        });
      } else {
        setStatus({
          type: 'error',
          message: response.message
        });
      }
    } catch (error) {
      console.error('删除失败:', error);
      setStatus({
        type: 'error',
        message: '删除失败，请重试'
      });
    }
  }

  // 文件选择、删除和清空处理函数
  const handleFilesSelected = (files: { id: string, file: File }[]) => {
    setFileDetails(files);
  }

  const handleRemoveFile = (id: string) => {
    const updatedFiles = fileDetails.filter(item => item.id !== id);
    setFileDetails(updatedFiles);
    
    // 如果没有文件了，可以选择关闭侧边栏
    if (updatedFiles.length === 0) {
      setShowPreviewSidebar(false);
    }
  }

  const handleRemoveAllFiles = () => {
    setFileDetails([]);
    setShowPreviewSidebar(false);
  }

  // 更新标签
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  }

  // 切换侧边栏状态
  const togglePreviewSidebar = () => {
    setShowPreviewSidebar(!showPreviewSidebar);
  }

  // 计算主内容的样式，根据侧边栏是否打开调整内容区域
  const mainContentStyle = { margin: '0 auto' };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8" style={mainContentStyle}>
      <Header onApiKeyClick={() => setShowApiKeyModal(true)} isKeyVerified={isKeyVerified} />

      <UploadSection
        onUpload={handleUpload}
        isUploading={isUploading}
        maxUploadCount={maxUploadCount}
        onFilesSelected={handleFilesSelected}
        onTogglePreview={togglePreviewSidebar}
        isPreviewOpen={showPreviewSidebar}
        fileCount={fileDetails.length}
        existingFiles={fileDetails}
        expiryMinutes={expiryMinutes}
        setExpiryMinutes={setExpiryMinutes}
        onTagsChange={handleTagsChange}
      />

      {/* 只有在有上传结果且结果侧边栏关闭时显示 */}
      {uploadResults.length > 0 && !showResultSidebar && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowResultSidebar(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all z-20 flex items-center justify-center"
          title="查看已上传图片"
        >
          <div className="relative">
            <ImageIcon className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{uploadResults.length}</span>
          </div>
        </motion.button>
      )}

      {/* 只有在有待上传图片且预览侧边栏关闭时显示 */}
      {fileDetails.length > 0 && !showPreviewSidebar && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setShowPreviewSidebar(true)}
          className="fixed bottom-20 right-6 bg-indigo-500 dark:bg-indigo-400 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all z-20 flex items-center justify-center"
          title="查看待上传图片"
        >
          <div className="relative">
            <PlusCircledIcon className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{fileDetails.length}</span>
          </div>
        </motion.button>
      )}

      {isUploading && <UploadProgress progress={uploadProgress} />}

      {/* 上传结果侧边栏 */}
      <ImageSidebar
        isOpen={showResultSidebar}
        results={uploadResults}
        onClose={() => setShowResultSidebar(false)}
        onDelete={handleDeleteImage}
      />

      {/* 待上传图片预览侧边栏 */}
      <PreviewSidebar
        files={fileDetails}
        onRemoveFile={handleRemoveFile}
        onRemoveAll={handleRemoveAllFiles}
        isOpen={showPreviewSidebar}
        onClose={() => setShowPreviewSidebar(false)}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={(apiKey) => {
          setApiKey(apiKey)
          setShowApiKeyModal(false)
          setIsKeyVerified(true)
          setStatus({
            type: 'success',
            message: 'API Key验证成功！'
          })
        }}
      />
    </div>
  )
}
