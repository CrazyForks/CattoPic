import { Spinner } from './ui/icons';

interface DeleteConfirmProps {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirm = ({ isDeleting, onCancel, onConfirm }: DeleteConfirmProps) => {
  return (
    <div className="space-y-1">
      <p className="text-center text-xs text-red-600 dark:text-red-400">
        确定要删除此图片吗？（将同时删除所有相关格式）
      </p>
      <div className="flex space-x-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs"
          disabled={isDeleting}
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-1 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-xs flex items-center justify-center"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Spinner className="-ml-1 mr-2 h-4 w-4 text-white" />
              处理中
            </>
          ) : (
            "确认删除"
          )}
        </button>
      </div>
    </div>
  );
}; 