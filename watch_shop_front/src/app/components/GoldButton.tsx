import type { ButtonHTMLAttributes } from "react";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "outline";
  fullWidth?: boolean;
}

export function GoldButton({ children, variant = "filled", fullWidth, className = "", ...props }: GoldButtonProps) {
  const base = "inline-flex items-center justify-center px-8 py-4 tracking-[0.2em] uppercase text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    filled: "bg-primary text-primary-foreground hover:bg-[#b8953f]",
    outline: "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
  };
  return (
    <button className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}
