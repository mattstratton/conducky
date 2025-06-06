import React from 'react';

export default function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 rounded-lg shadow-sm text-sm sm:text-base text-gray-900 dark:text-gray-100 ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
} 