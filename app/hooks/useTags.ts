'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/request';
import { Tag } from '../types';
import { queryKeys } from '../lib/queryKeys';

interface TagsResponse {
  success: boolean;
  tags: Tag[];
}

interface MutationResponse {
  success: boolean;
  message?: string;
  tag?: Tag;
  affectedImages?: number;
  deletedImages?: number;
}

interface UseTagsReturn {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  selectedTags: Set<string>;
  fetchTags: () => Promise<void>;
  createTag: (name: string) => Promise<boolean>;
  renameTag: (oldName: string, newName: string) => Promise<boolean>;
  deleteTag: (name: string) => Promise<boolean>;
  deleteTags: (names: string[]) => Promise<boolean>;
  toggleTagSelection: (name: string) => void;
  selectAllTags: () => void;
  clearSelection: () => void;
}

export function useTags(): UseTagsReturn {
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Query for fetching tags
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: async () => {
      const response = await api.get<TagsResponse>('/api/tags');
      if (response.success && response.tags) {
        return response.tags;
      }
      throw new Error('Failed to fetch tags');
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const tags = data || [];

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post<MutationResponse>('/api/tags', { name });
      if (!response.success) {
        throw new Error('Failed to create tag');
      }
      return response;
    },
    onSuccess: (response, name) => {
      // Optimistic update
      queryClient.setQueryData<Tag[]>(queryKeys.tags.list(), (old) => {
        if (!old) return [{ name, count: 0 }];
        return [...old, response.tag || { name, count: 0 }];
      });
    },
  });

  // Rename tag mutation
  const renameMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const response = await api.put<MutationResponse>(
        `/api/tags/${encodeURIComponent(oldName)}`,
        { newName }
      );
      if (!response.success) {
        throw new Error('Failed to rename tag');
      }
      return { oldName, newName, response };
    },
    onSuccess: ({ oldName, newName }) => {
      // Optimistic update
      queryClient.setQueryData<Tag[]>(queryKeys.tags.list(), (old) => {
        if (!old) return old;
        return old.map((tag) =>
          tag.name === oldName ? { ...tag, name: newName } : tag
        );
      });
      // Update selection
      setSelectedTags((prev) => {
        if (prev.has(oldName)) {
          const next = new Set(prev);
          next.delete(oldName);
          next.add(newName);
          return next;
        }
        return prev;
      });
      // Invalidate image lists as tag names changed
      queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.delete<MutationResponse>(
        `/api/tags/${encodeURIComponent(name)}`
      );
      if (!response.success) {
        throw new Error('Failed to delete tag');
      }
      return name;
    },
    onSuccess: (name) => {
      // Optimistic update
      queryClient.setQueryData<Tag[]>(queryKeys.tags.list(), (old) => {
        if (!old) return old;
        return old.filter((tag) => tag.name !== name);
      });
      // Update selection
      setSelectedTags((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      // Invalidate image lists as images may have been deleted
      queryClient.invalidateQueries({ queryKey: queryKeys.images.lists() });
    },
  });

  // Wrapper functions to maintain compatible interface
  const fetchTags = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createTag = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        await createMutation.mutateAsync(name);
        return true;
      } catch {
        return false;
      }
    },
    [createMutation]
  );

  const renameTag = useCallback(
    async (oldName: string, newName: string): Promise<boolean> => {
      try {
        await renameMutation.mutateAsync({ oldName, newName });
        return true;
      } catch {
        return false;
      }
    },
    [renameMutation]
  );

  const deleteTag = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(name);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  const deleteTags = useCallback(
    async (names: string[]): Promise<boolean> => {
      try {
        await Promise.all(names.map((name) => deleteMutation.mutateAsync(name)));
        setSelectedTags(new Set());
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  const toggleTagSelection = useCallback((name: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const selectAllTags = useCallback(() => {
    setSelectedTags(new Set(tags.map((t) => t.name)));
  }, [tags]);

  const clearSelection = useCallback(() => {
    setSelectedTags(new Set());
  }, []);

  return {
    tags,
    isLoading,
    error: queryError ? '获取标签列表失败' : null,
    selectedTags,
    fetchTags,
    createTag,
    renameTag,
    deleteTag,
    deleteTags,
    toggleTagSelection,
    selectAllTags,
    clearSelection,
  };
}
