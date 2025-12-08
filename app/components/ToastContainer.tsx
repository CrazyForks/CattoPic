"use client";

import { useState, useCallback, useEffect } from "react";
import Toast, { ToastType } from "./Toast";

// 创建唯一标识
const generateId = () => `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

// 全局存储toast状态和回调方法
let toastQueue: ToastItem[] = [];
let addToastCallback: ((toast: ToastItem) => void) | null = null;

// 添加Toast的全局方法
export const showToast = (message: string, type: ToastType = "success") => {
  const newToast = { id: generateId(), message, type };
  
  if (addToastCallback) {
    addToastCallback(newToast);
  } else {
    toastQueue.push(newToast);
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // 添加Toast的回调
  const addToast = useCallback((toast: ToastItem) => {
    setToasts(prev => [...prev, toast]);
  }, []);
  
  // 移除Toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  // 初始化时注册回调并处理队列中的Toast
  useEffect(() => {
    addToastCallback = addToast;
    
    // 处理队列中已有的Toast
    if (toastQueue.length > 0) {
      const pendingToasts = [...toastQueue];
      toastQueue = [];
      pendingToasts.forEach(addToast);
    }
    
    return () => {
      addToastCallback = null;
    };
  }, [addToast]);
  
  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
} 