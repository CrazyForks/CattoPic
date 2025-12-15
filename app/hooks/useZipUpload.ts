'use client'

import { useState, useCallback, useRef } from 'react'
import {
  ZipAnalysisResult,
  ExtractionProgress,
  analyzeZipFile,
  extractImagesBatch,
} from '../utils/zipProcessor'
import { concurrentUpload } from '../utils/concurrentUpload'
import { UploadResult } from '../types'
import { FileUploadStatus } from '../types/upload'

// ZIP上传阶段
export type ZipUploadPhase =
  | 'idle' // 等待选择文件
  | 'loading' // 正在加载ZIP文件
  | 'analyzing' // 正在分析ZIP内容
  | 'preview' // 预览模式，等待确认
  | 'extracting' // 正在解压
  | 'uploading' // 正在上传
  | 'completed' // 完成

// ZIP上传状态
export interface ZipUploadState {
  phase: ZipUploadPhase
  zipFile: File | null
  analysis: ZipAnalysisResult | null
  extractProgress: ExtractionProgress | null
  uploadProgress: {
    completed: number
    failed: number
    total: number
  }
  error: string | null
  results: UploadResult[]
}

// ZIP上传操作
export interface ZipUploadActions {
  selectZipFile: (file: File) => Promise<void>
  startUpload: (options: {
    tags: string[]
    expiryMinutes: number
    quality: number
    maxWidth: number
    preserveAnimation: boolean
    outputFormat: 'webp' | 'avif' | 'both'
    onCompleted?: (results: UploadResult[]) => void
  }) => Promise<void>
  cancel: () => void
  reset: () => void
}

const initialState: ZipUploadState = {
  phase: 'idle',
  zipFile: null,
  analysis: null,
  extractProgress: null,
  uploadProgress: {
    completed: 0,
    failed: 0,
    total: 0,
  },
  error: null,
  results: [],
}

export function useZipUpload(): ZipUploadState & ZipUploadActions {
  const [state, setState] = useState<ZipUploadState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isCancelledRef = useRef(false)

  // 选择ZIP文件并分析
  const selectZipFile = useCallback(async (file: File) => {
    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setState((prev) => ({
        ...prev,
        error: '请选择ZIP格式的压缩包',
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      phase: 'loading',
      zipFile: file,
      error: null,
    }))

    try {
      setState((prev) => ({ ...prev, phase: 'analyzing' }))
      const analysis = await analyzeZipFile(file)

      if (analysis.totalImages === 0) {
        setState((prev) => ({
          ...prev,
          phase: 'idle',
          error: '压缩包中没有找到图片文件',
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        phase: 'preview',
        analysis,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        phase: 'idle',
        error: error instanceof Error ? error.message : '分析ZIP文件失败',
      }))
    }
  }, [])

  // 开始上传
  const startUpload = useCallback(
    async (options: {
      tags: string[]
      expiryMinutes: number
      quality: number
      maxWidth: number
      preserveAnimation: boolean
      outputFormat: 'webp' | 'avif' | 'both'
      onCompleted?: (results: UploadResult[]) => void
    }) => {
      const { zipFile, analysis } = state
      if (!zipFile || !analysis) return

      isCancelledRef.current = false
      abortControllerRef.current = new AbortController()

      setState((prev) => ({
        ...prev,
        phase: 'extracting',
        uploadProgress: {
          completed: 0,
          failed: 0,
          total: analysis.totalImages,
        },
        results: [],
      }))

      try {
        const allResults: UploadResult[] = []
        let completedCount = 0
        let failedCount = 0

        // 分批解压和上传
        const batchSize = 50
        const extractor = extractImagesBatch(
          zipFile,
          analysis.images,
          batchSize,
          (progress) => {
            setState((prev) => ({ ...prev, extractProgress: progress }))
          }
        )

        for await (const batch of extractor) {
          if (isCancelledRef.current) break

          // 切换到上传阶段（第一批解压完成后）
          setState((prev) => ({
            ...prev,
            phase: 'uploading',
          }))

          // 并发上传当前批次
          const results = await concurrentUpload({
            files: batch.map((img) => ({ id: img.id, file: img.file })),
            concurrency: 5,
            tags: options.tags,
            expiryMinutes: options.expiryMinutes,
            quality: options.quality,
            maxWidth: options.maxWidth,
            preserveAnimation: options.preserveAnimation,
            outputFormat: options.outputFormat,
            onFileStatusChange: (fileId: string, status: FileUploadStatus) => {
              if (status === 'success') {
                completedCount++
              } else if (status === 'error') {
                failedCount++
              }
              setState((prev) => ({
                ...prev,
                uploadProgress: {
                  ...prev.uploadProgress,
                  completed: completedCount,
                  failed: failedCount,
                },
              }))
            },
            signal: abortControllerRef.current?.signal,
          })

          allResults.push(...results)
        }

        // Cancelled: do not mark completed (cancel() already reset phase)
        if (isCancelledRef.current) {
          return
        }

        setState((prev) => ({
          ...prev,
          phase: 'completed',
          results: allResults,
        }))

        options.onCompleted?.(allResults)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // 用户取消
          return
        }
        setState((prev) => ({
          ...prev,
          phase: 'completed',
          error: error instanceof Error ? error.message : '上传过程中出错',
        }))
      }
    },
    [state]
  )

  // 取消上传
  const cancel = useCallback(() => {
    isCancelledRef.current = true
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState((prev) => ({
      ...prev,
      phase: 'idle',
      extractProgress: null,
    }))
  }, [])

  // 重置状态
  const reset = useCallback(() => {
    isCancelledRef.current = true
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState(initialState)
  }, [])

  return {
    ...state,
    selectZipFile,
    startUpload,
    cancel,
    reset,
  }
}
