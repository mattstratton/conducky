import React from "react";

export default function Button({
  children,
  className = "",
  noDefaultStyle = false,
  ...props
}) {
  return (
    <button
      className={
        noDefaultStyle
          ? className
          : `px-4 py-2 sm:px-5 sm:py-2.5 min-h-[44px] rounded-md font-semibold transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800
        dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 dark:active:bg-blue-600
        disabled:opacity-60 disabled:cursor-not-allowed text-base w-full sm:w-auto
        ${className}`
      }
      {...props}
    >
      {children}
    </button>
  );
}
