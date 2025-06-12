import React from "react";

export interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  noDefaultStyle?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  noDefaultStyle = false,
  onClick,
  type = "button",
  disabled = false,
}) => (
  <button
    type={type}
    className={
      noDefaultStyle
        ? className
        : `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${className}`
    }
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

export default Button; 