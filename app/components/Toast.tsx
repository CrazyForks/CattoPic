"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusIcon } from "./ui/icons";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ 
  message, 
  type = "success", 
  duration = 2000, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画结束后关闭
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <StatusIcon.success className="h-5 w-5" />;
      case "error":
        return <StatusIcon.error className="h-5 w-5" />;
      case "info":
        return <StatusIcon.info className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-md p-3 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 flex items-center">
            <span className="mr-2">{getIcon()}</span>
            <span className="text-sm text-gray-700 dark:text-gray-200">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 