'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ImageData } from '../../types/image'
import { getFullUrl } from '../../utils/baseUrl'

interface ImagePreviewProps {
  image: ImageData
}

export function ImagePreview({ image }: ImagePreviewProps) {
  const originalUrl = getFullUrl(image.urls?.webp || '')

  return (
    <div className="w-full md:w-2/5 p-4 md:border-r border-slate-200 dark:border-slate-700 flex items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative w-full h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ height: '400px' }}
      >
        <Image
          src={originalUrl}
          alt={image.filename}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-contain"
        />
      </motion.div>
    </div>
  )
} 