'use client'

interface UploadProgressProps {
  progress: number
}

export default function UploadProgress({ progress }: UploadProgressProps) {
  return (
    <div>
      <div className="bg-light-bg-primary dark:bg-dark-bg-primary rounded-xl overflow-hidden mb-4">
        <div
          className="h-2 bg-gradient-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary text-center">
        上传进度: {Math.round(progress)}%
      </p>
    </div>
  )
} 