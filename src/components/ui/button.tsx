"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
}

const VARIANTS: Record<string, string> = {
    primary: "bg-primary text-white hover:opacity-90",
    secondary: "bg-slate-800 text-white hover:opacity-90",
    outline: "border border-slate-300 text-slate-900 hover:bg-slate-50",
    ghost: "text-slate-900 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<string, string> = {
    sm: "h-8 px-2 text-xs",
    md: "h-10 px-3 text-sm",
    lg: "h-11 px-4 text-base",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                VARIANTS[variant],
                SIZES[size],
                className
            )}
            {...props}
        />
    );
});
Button.displayName = "Button";

export { Button };
