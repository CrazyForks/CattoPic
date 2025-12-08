'use client'

import { motion } from 'framer-motion'

interface StatusMessageProps {
  type: 'success' | 'error' | 'warning'
  message: string
}

export default function StatusMessage({ type, message }: StatusMessageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`mb-8 p-4 rounded-xl ${
        type === 'success' 
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
          : type === 'warning'
          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
      }`}
    >
      {message}
    </motion.div>
  )
} 