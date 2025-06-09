import React from "react";

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800/90 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-600 transition-colors duration-200 w-full max-w-full sm:max-w-2xl mx-auto text-gray-900 dark:text-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
