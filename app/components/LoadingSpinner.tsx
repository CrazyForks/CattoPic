import React from 'react';

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = ({ className = '' }: LoadingSpinnerProps) => {
  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-gray-50/30 dark:bg-slate-900/50 backdrop-blur-[2px] ${className}`}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 dark:border-indigo-400/20"></div>
        <div className="absolute inset-[2px] rounded-full border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-pulse"></div>
      </div>
    </div>
  );
}; 