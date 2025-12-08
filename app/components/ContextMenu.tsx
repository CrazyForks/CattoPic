"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuGroup {
  id: string;
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuGroup[];
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ items, isOpen, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // 调整菜单位置以避免超出视窗
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = x;
      let adjustedY = y;
      
      // 水平方向调整
      if (x + menuRect.width > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width - 10;
      }
      
      // 垂直方向调整
      if (y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 10;
      }
      
      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [isOpen, x, y]);
  
  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{ pointerEvents: "none" }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ 
              position: "absolute", 
              left: position.x, 
              top: position.y,
              pointerEvents: "auto" 
            }}
            className="shadow-xl bg-white dark:bg-slate-800 rounded-lg overflow-hidden min-w-52 border border-gray-100 dark:border-gray-700"
          >
            {items.map((group, groupIndex) => (
              <div key={group.id}>
                {groupIndex > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                )}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      item.onClick(e);
                      onClose();
                    }}
                    disabled={item.disabled}
                    className={`flex items-center w-full px-4 py-2 text-sm ${
                      item.danger 
                        ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" 
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    } ${
                      item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } transition-colors`}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 