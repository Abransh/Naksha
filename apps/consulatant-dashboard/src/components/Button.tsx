import { ButtonHTMLAttributes } from "react";

export default function Button({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}