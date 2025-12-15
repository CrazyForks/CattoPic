"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ImageModal from "../components/ImageModal";
import { getFullUrl } from "../utils/baseUrl";
import { toCdnCgiImageUrl } from "../utils/cdnImage";
import { ImageIcon, Cross1Icon, ExclamationTriangleIcon } from "./ui/icons";
import { ImageData } from "../types/image";

interface ImageSidebarProps {
  isOpen: boolean;
  results: ImageData[];
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const ImageSidebar = React.memo(function ImageSidebar({
  isOpen,
  results,
  onClose,
  onDelete,
}: ImageSidebarProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<"all" | "success" | "error">("all");

  // 使用 useMemo 缓存过滤结果
  const successResults = useMemo(
    () => results.filter((result) => result.status === "success"),
    [results]
  );
  const errorResults = useMemo(
    () => results.filter((result) => result.status === "error"),
    [results]
  );

  // 根据当前标签确定要显示的结果
  const displayResults = useMemo(
    () => tab === "all" ? results : tab === "success" ? successResults : errorResults,
    [tab, results, successResults, errorResults]
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = parentRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    updateWidth();

    const ro = new ResizeObserver(() => {
      updateWidth();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [isOpen]);

  const lanes = useMemo(() => (containerWidth < 320 ? 1 : 2), [containerWidth]);
  const columnGapPx = 12; // gap-3
  const columnWidth = useMemo(() => {
    const safeLanes = Math.max(1, lanes);
    const totalGutter = columnGapPx * (safeLanes - 1);
    const width = Math.floor((containerWidth - totalGutter) / safeLanes);
    return Math.max(1, width);
  }, [containerWidth, lanes]);

  const getItemKey = useCallback((index: number) => {
    const item = displayResults[index];
    return item?.id || `${item?.originalName || tab}-${index}`;
  }, [displayResults, tab]);

  const estimateSize = useCallback(() => columnWidth, [columnWidth]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const gridVirtualizer = useVirtualizer({
    count: displayResults.length,
    getItemKey,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    lanes,
    gap: columnGapPx,
    overscan: Math.max(12, lanes * 10),
  });

  useEffect(() => {
    if (!isOpen) return;
    gridVirtualizer.measure();
  }, [gridVirtualizer, isOpen, columnWidth]);

  const handleImageClick = useCallback((image: ImageData) => {
    setSelectedImage(image);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // 标签切换处理
  const handleTabAll = useCallback(() => setTab("all"), []);
  const handleTabSuccess = useCallback(() => setTab("success"), []);
  const handleTabError = useCallback(() => setTab("error"), []);

  const UploadResultTile = useMemo(() => {
    return React.memo(function UploadResultTile({
      result,
      onOpen,
      thumbWidth,
    }: {
      result: ImageData;
      onOpen: (image: ImageData) => void;
      thumbWidth: number;
    }) {
      const canOpen = result.status === "success";

      const handleClick = () => {
        if (!canOpen) return;
        onOpen(result);
      };

      const imageSrc = (() => {
        const base = getFullUrl(result.urls?.webp || result.urls?.original || '');
        if (!base) return '';
        const requestWidth = Math.max(1, Math.ceil(thumbWidth * 2));
        return toCdnCgiImageUrl(base, { width: requestWidth, quality: 70, format: 'auto', fit: 'scale-down' });
      })();

      return (
        <div
          className={`relative rounded-lg overflow-hidden border aspect-square ${
            canOpen
              ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
          } shadow-xs hover:shadow-md transition-all cursor-pointer group`}
          onClick={handleClick}
        >
          {canOpen ? (
            <>
              <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900">
                {imageSrc && (
                  <Image
                    src={imageSrc}
                    alt={result.originalName || ''}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-1 right-1">
                <span className="text-xs px-1.5 py-0.5 bg-green-500/80 text-white rounded-full">
                  完成
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-xs truncate" title={result.originalName}>
                  {result.originalName}
                </p>
                {result.expiryTime && (
                  <p className="text-xs mt-1">
                    <span className="bg-yellow-500/80 text-white px-1 py-0.5 rounded-sm text-[10px]">
                      过期时间: {new Date(result.expiryTime).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="p-3 h-full flex flex-col">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-red-600 dark:text-red-400 truncate">
                    {result.originalName || '上传失败'}
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-300 mt-1 line-clamp-3">
                    {result.error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    });
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 w-full sm:w-96 h-full bg-white dark:bg-slate-900 shadow-xl z-30 border-l border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
          >
            {/* 侧边栏头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-linear-to-r from-indigo-500 to-purple-600 text-white">
              <h2 className="text-lg font-semibold flex items-center">
                <ImageIcon className="h-5 w-5 mr-2 text-white opacity-90" />
                上传结果 ({results.length})
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <Cross1Icon className="h-5 w-5" />
              </button>
            </div>

            {/* 标签切换 */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={handleTabAll}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                  tab === "all"
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                全部 ({results.length})
                {tab === "all" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
                  />
                )}
              </button>
              <button
                onClick={handleTabSuccess}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                  tab === "success"
                    ? "text-green-600 dark:text-green-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                成功 ({successResults.length})
                {tab === "success" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 dark:bg-green-400"
                  />
                )}
              </button>
              <button
                onClick={handleTabError}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                  tab === "error"
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                失败 ({errorResults.length})
                {tab === "error" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 dark:bg-red-400"
                  />
                )}
              </button>
            </div>

            {/* 侧边栏内容 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="p-4">
                {displayResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 p-6">
                  <ImageIcon className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="text-lg font-medium mb-2">暂无图片</p>
                  <p className="text-sm">
                    {tab === "all"
                      ? "上传完成的图片将会显示在这里"
                      : tab === "success"
                      ? "没有成功上传的图片"
                      : "没有上传失败的图片"}
                  </p>
                </div>
              ) : (
                <div ref={parentRef}>
                  <div
                    style={{
                      height: `${gridVirtualizer.getTotalSize()}px`,
                      position: "relative",
                    }}
                  >
                    {gridVirtualizer.getVirtualItems().map((virtualItem) => {
                      const result = displayResults[virtualItem.index];
                      if (!result) return null;

                      const x = virtualItem.lane * (columnWidth + columnGapPx);
                      const y = virtualItem.start;
                      const key = result.id || `${tab}-${virtualItem.index}`;

                      return (
                        <div
                          key={key}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: `${columnWidth}px`,
                            transform: `translate3d(${x}px, ${y}px, 0)`,
                            boxSizing: "border-box",
                          }}
                        >
                          <UploadResultTile result={result} onOpen={handleImageClick} thumbWidth={columnWidth} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图片详情模态框 */}
      <ImageModal
        image={selectedImage && selectedImage.status === "success" ? selectedImage as ImageData & { status: 'success' } : null}
        isOpen={showModal}
        onClose={handleCloseModal}
        onDelete={onDelete}
      />

      {/* 背景遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-xs z-20 sm:block hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
    </>
  );
});

export default ImageSidebar;
