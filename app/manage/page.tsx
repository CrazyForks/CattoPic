"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { motion } from 'motion/react';
import Masonry from "react-masonry-css";
import { getApiKey, validateApiKey, setApiKey } from "../utils/auth";
import ApiKeyModal from "../components/ApiKeyModal";
import ImageFilters from "../components/ImageFilters";
import ImageCard from "../components/ImageCard";
import ImageModal from "../components/ImageModal";
import { useTheme } from "../hooks/useTheme";
import {
  ImageFile,
  StatusMessage,
  ImageFilterState,
} from "../types";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import ManageTabs from "../components/ManageTabs";
import TagManagement from "../components/TagManagement";
import { ImageIcon, Spinner } from "../components/ui/icons";
import { useInfiniteImages, useDeleteImage } from "../hooks/useImages";

export default function Manage() {
  useTheme();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'tags'>('images');
  const prevTabRef = useRef<'images' | 'tags'>('images');
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [filters, setFilters] = useState<ImageFilterState>({
    format: "webp",
    orientation: "all",
    tag: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKeyVerified, setIsKeyVerified] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  // TanStack Query hooks
  const {
    images,
    total: totalImages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: queryError,
  } = useInfiniteImages({
    tag: filters.tag || undefined,
    orientation: filters.orientation === 'all' ? undefined : filters.orientation,
    limit: 24,
  });

  const deleteImageMutation = useDeleteImage();

  // Show query error as status
  useEffect(() => {
    if (queryError) {
      setStatus({
        type: "error",
        message: "加载图片列表失败",
      });
    }
  }, [queryError]);

  const lastImageElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    checkApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkApiKey = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setShowApiKeyModal(true);
      setIsKeyVerified(false);
      return;
    }

    try {
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        setShowApiKeyModal(true);
        setIsKeyVerified(false);
        setStatus({
          type: "error",
          message: "API Key无效,请重新验证",
        });
        return;
      }

      setIsKeyVerified(true);
    } catch (error) {
      console.error("API Key验证失败:", error);
      setShowApiKeyModal(true);
      setIsKeyVerified(false);
      setStatus({
        type: "error",
        message: "API Key验证失败,请重试",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteImageMutation.mutateAsync(id);
      setStatus({
        type: "success",
        message: "删除成功",
      });
    } catch {
      setStatus({
        type: "error",
        message: "删除失败",
      });
    }
  };

  // TanStack Query automatically refetches when filters change (via queryKey)
  // No need for manual fetch effect

  // 当从标签管理切换回图片管理时，刷新图片列表（因为可能删除了标签和关联图片）
  useEffect(() => {
    if (prevTabRef.current === 'tags' && activeTab === 'images' && isKeyVerified) {
      refetch();
    }
    prevTabRef.current = activeTab;
  }, [activeTab, isKeyVerified, refetch]);

  const handleFilterChange = (
    format: string,
    orientation: string,
    tag: string
  ) => {
    setFilters({ format, orientation, tag });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Header
        onApiKeyClick={() => setShowApiKeyModal(true)}
        title="CattoPic"
        isKeyVerified={isKeyVerified}
      />

      <ToastContainer />

      <ManageTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'images' ? (
        <>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 p-4 rounded-xl ${
                status.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {status.message}
            </motion.div>
          )}

          <ImageFilters onFilterChange={handleFilterChange} />

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-12 w-12 text-indigo-500" />
            </div>
          ) : (
            <>
              {images.length > 0 ? (
                <>
                  <div className="space-y-8">
                    <div
                      className={
                        filters.orientation === "all"
                          ? ""
                          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      }
                    >
                      {filters.orientation === "all" ? (
                        <Masonry
                          breakpointCols={{
                            default: 4,
                            1280: 4,
                            1024: 3,
                            768: 2,
                            640: 1,
                          }}
                          className="my-masonry-grid"
                          columnClassName="my-masonry-grid_column"
                        >
                          {images.map((image, index) => (
                            <motion.div
                              key={image.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                duration: 0.3,
                                delay: (index % 24) * 0.05,
                              }}
                              ref={index === images.length - 5 ? lastImageElementRef : null}
                            >
                              <ImageCard
                                image={image}
                                onClick={() => {
                                  setSelectedImage(image);
                                  setIsModalOpen(true);
                                }}
                                onDelete={handleDelete}
                              />
                            </motion.div>
                          ))}
                        </Masonry>
                      ) : (
                        images.map((image, index) => (
                          <motion.div
                            key={image.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: (index % 24) * 0.05 }}
                            ref={index === images.length - 5 ? lastImageElementRef : null}
                          >
                            <ImageCard
                              image={image}
                              onClick={() => {
                                setSelectedImage(image);
                                setIsModalOpen(true);
                              }}
                              onDelete={handleDelete}
                            />
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                  {isFetchingNextPage && (
                    <div className="flex justify-center items-center py-8">
                      <Spinner className="h-8 w-8 text-indigo-500" />
                      <span className="ml-2 text-indigo-500">加载更多图片...</span>
                    </div>
                  )}
                  {!isLoading && !isFetchingNextPage && images.length > 0 && !hasNextPage && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      已加载全部图片 ({totalImages}张)
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                  <ImageIcon className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-lg font-medium">暂无图片</p>
                  <p className="mt-2 text-sm">请上传图片或调整筛选条件</p>
                </div>
              )}
            </>
          )}

          <ImageModal
            image={selectedImage}
            isOpen={isModalOpen}
            onClose={() => {
              setSelectedImage(null);
              setIsModalOpen(false);
            }}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <TagManagement />
      )}

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={(apiKey) => {
          setApiKey(apiKey);
          setIsKeyVerified(true);
          setShowApiKeyModal(false);
          // TanStack Query will automatically fetch when component mounts/remounts
        }}
      />
    </div>
  );
}
