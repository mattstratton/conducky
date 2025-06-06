import React from 'react';

export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`block w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-md border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 text-base min-h-[44px] ${className}`}
      {...props}
    />
  );
} 