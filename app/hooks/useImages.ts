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
  format?: string;
  limit?: number;
}

function matchesFilters(image: ImageFile, tag: string, orientation: string, format: string): boolean {
  const tagOk = !tag || image.tags.includes(tag);
  const orientationOk = !orientation || image.orientation === orientation;
  if (!tagOk || !orientationOk) return false;

  const urls = image.urls || { original: '', webp: '', avif: '' };
  const formatFilter = (format || 'all').toLowerCase();

  switch (formatFilter) {
    case 'all':
      return true;
    case 'gif':
      return (image.format || '').toLowerCase() === 'gif';
    case 'webp':
      return !!urls.webp;
    case 'avif':
      return !!urls.avif;
    case 'original':
      return !!urls.original && !urls.webp && !urls.avif;
    default:
      return true;
  }
}

function mergeFirstPageImages(
  existing: ImageFile[],
  additions: ImageFile[],
  limit: number
): { images: ImageFile[]; addedCount: number } {
  const seen = new Set<string>();
  const merged: ImageFile[] = [];

  for (const img of [...additions, ...existing]) {
    if (!img.id || seen.has(img.id)) continue;
    seen.add(img.id);
    merged.push(img);
    if (merged.length >= limit) break;
  }

  const existingIds = new Set(existing.map((i) => i.id));
  const addedCount = additions.filter((i) => i.id && !existingIds.has(i.id)).length;

  return { images: merged, addedCount };
}

// Hook for infinite scrolling image list
export function useInfiniteImages(options: UseImagesOptions = {}) {
  const { tag = '', orientation = '', format = 'all', limit = 24 } = options;
  const queryClient = useQueryClient();

  const recentUploads = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
  const recentMatches = recentUploads.filter((img) => matchesFilters(img, tag, orientation, format)).slice(0, limit);

  const baseCache = format !== 'all'
    ? queryClient.getQueryData<InfiniteData<ImageListResponse>>(
      queryKeys.images.list({ tag, orientation, limit, format: 'all' })
    )
    : null;

  const placeholder = (baseCache ?? (recentMatches.length > 0 ? ({
    pageParams: [1],
    pages: [
      {
        images: recentMatches,
        page: 1,
        total: recentMatches.length,
        totalPages: 1,
      },
    ],
  } satisfies InfiniteData<ImageListResponse>) : null));

  const query = useInfiniteQuery({
    queryKey: queryKeys.images.list({ tag, orientation, format, limit }),
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
    ...(placeholder ? { placeholderData: placeholder } : {}),
    select: (data) => {
      const latestRecent = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
      const candidates = latestRecent.filter((img) => matchesFilters(img, tag, orientation, format));
      if (candidates.length === 0 || data.pages.length === 0) return data;

      const allIds = new Set<string>();
      for (const page of data.pages) {
        for (const img of page.images) {
          if (img.id) allIds.add(img.id);
        }
      }

      const missing = candidates.filter((img) => img.id && !allIds.has(img.id));
      const total = Math.max(data.pages[0].total || 0, (data.pages[0].total || 0) + missing.length);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const firstPage = data.pages[0];
      const filteredPages = data.pages.map((p) => ({
        ...p,
        images: p.images.filter((img) => matchesFilters(img, tag, orientation, format)),
      }));
      const filteredFirst = filteredPages[0];
      const { images: mergedFirst } = mergeFirstPageImages(filteredFirst.images, candidates, limit);

      return {
        ...data,
        pages: filteredPages.map((p, idx) => idx === 0
          ? { ...p, images: mergedFirst, total, totalPages }
          : { ...p, total, totalPages }
        ),
      };
    },
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
  const { page = 1, tag = '', orientation = '', format = 'all', limit = 24 } = options;
  const queryClient = useQueryClient();

  const recentUploads = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
  const recentMatches = page === 1
    ? recentUploads.filter((img) => matchesFilters(img, tag, orientation, format)).slice(0, limit)
    : [];
  const baseCache = (format !== 'all' && page === 1)
    ? queryClient.getQueryData<ImageListResponse>(
      queryKeys.images.list({ page, tag, orientation, limit, format: 'all' })
    )
    : null;

  const placeholder = baseCache ?? (recentMatches.length > 0 ? ({
    images: recentMatches,
    page: 1,
    total: recentMatches.length,
    totalPages: 1,
  } satisfies ImageListResponse) : null);

  const query = useQuery({
    queryKey: queryKeys.images.list({ page, tag, orientation, format, limit }),
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
    ...(placeholder ? { placeholderData: placeholder } : {}),
    select: (data) => {
      const filtered = {
        ...data,
        images: data.images.filter((img) => matchesFilters(img, tag, orientation, format)),
      };

      if (page !== 1) return filtered;
      const latestRecent = queryClient.getQueryData<ImageFile[]>(queryKeys.images.recentUploads()) || [];
      const candidates = latestRecent.filter((img) => matchesFilters(img, tag, orientation, format));
      if (candidates.length === 0) return data;

      const existingIds = new Set(filtered.images.map((i) => i.id));
      const missing = candidates.filter((img) => img.id && !existingIds.has(img.id));
      const total = Math.max(filtered.total || 0, (filtered.total || 0) + missing.length);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const { images: merged } = mergeFirstPageImages(filtered.images, candidates, limit);

      return { ...filtered, images: merged, total, totalPages };
    },
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
