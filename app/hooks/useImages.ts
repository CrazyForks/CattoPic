'use client';

import { useCallback } from 'react';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { api } from '../utils/request';
import { ImageFile, ImageListResponse } from '../types';
import { queryKeys } from '../lib/queryKeys';

interface ImageDetailResponse {
  success: boolean;
  image: ImageFile;
}

interface DeleteResponse {
  success: boolean;
  message: string;
}

interface UpdateResponse {
  success: boolean;
  image: ImageFile;
}

interface UseImagesOptions {
  tag?: string;
  orientation?: string;
  limit?: number;
}

// Hook for infinite scrolling image list
export function useInfiniteImages(options: UseImagesOptions = {}) {
  const { tag = '', orientation = '', limit = 24 } = options;
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.images.list({ tag, orientation, limit }),
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, string> = {
        page: String(pageParam),
        limit: String(limit),
      };
      if (tag) params.tag = tag;
      if (orientation) params.orientation = orientation;

      const response = await api.get<ImageListResponse>('/api/images', params);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages into a single array
  const images = query.data?.pages.flatMap((page) => page.images) || [];
  const total = query.data?.pages[0]?.total || 0;

  // Refetch all pages
  const refetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
  }, [queryClient]);

  return {
    images,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: refetchAll,
    error: query.error,
  };
}

// Hook for paginated image list (non-infinite)
export function useImages(options: UseImagesOptions & { page?: number } = {}) {
  const { page = 1, tag = '', orientation = '', limit = 24 } = options;

  const query = useQuery({
    queryKey: queryKeys.images.list({ page, tag, orientation, limit }),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (tag) params.tag = tag;
      if (orientation) params.orientation = orientation;

      return api.get<ImageListResponse>('/api/images', params);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    images: query.data?.images || [],
    total: query.data?.total || 0,
    totalPages: query.data?.totalPages || 0,
    currentPage: query.data?.page || page,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook for single image detail
export function useImageDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.images.detail(id!),
    queryFn: async () => {
      const response = await api.get<ImageDetailResponse>(`/api/images/${id}`);
      return response.image;
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for deleting an image with optimistic update
export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<DeleteResponse>(`/api/images/${id}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete image');
      }
      return id;
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.images.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData<InfiniteData<ImageListResponse>>({
        queryKey: queryKeys.images.lists(),
      });

      // Optimistically update: remove the image from all cached lists
      queryClient.setQueriesData<InfiniteData<ImageListResponse>>(
        { queryKey: queryKeys.images.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              images: page.images.filter((img) => img.id !== id),
              total: page.total - 1,
            })),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (id) => {
      // Remove detail cache
      queryClient.removeQueries({ queryKey: queryKeys.images.detail(id) });
    },
  });
}

// Hook for updating an image
export function useUpdateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { tags?: string[]; expiryMinutes?: number };
    }) => {
      const response = await api.put<UpdateResponse>(`/api/images/${id}`, data);
      if (!response.success) {
        throw new Error('Failed to update image');
      }
      return response.image;
    },
    onSuccess: (image) => {
      // Update detail cache
      queryClient.setQueryData(queryKeys.images.detail(image.id), image);
      // Invalidate lists (tags may have changed)
      queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
      // Invalidate tags list
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.list() });
    },
  });
}

// Hook for invalidating image caches after upload
export function useInvalidateImages() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
  }, [queryClient]);
}
