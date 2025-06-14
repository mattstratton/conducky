import React, { ReactNode, TableHTMLAttributes } from 'react';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={`min-w-full divide-y divide-border bg-card rounded-lg shadow-sm text-sm sm:text-base text-foreground ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}; 