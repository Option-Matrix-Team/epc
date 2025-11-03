"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

const DialogContext = React.createContext<{ open: boolean; onOpenChange: (o: boolean) => void } | null>(null);

function Dialog({ open, onOpenChange, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange }}>
            {children}
        </DialogContext.Provider>
    );
}

function useDialog() {
    const ctx = React.useContext(DialogContext);
    if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
    return ctx;
}

function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement<any> }) {
    const { onOpenChange } = useDialog();
    if (asChild) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: any) => {
                // @ts-ignore
                children.props?.onClick?.(e);
                onOpenChange(true);
            },
        } as any);
    }
    return (
        <button onClick={() => onOpenChange(true)}>{children}</button>
    );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

function DialogOverlay({ className }: { className?: string }) {
    const { open, onOpenChange } = useDialog();
    if (!open) return null;
    return (
        <DialogPortal>
            <div
                className={cn(
                    "fixed inset-0 z-[1100] bg-black/40 backdrop-blur-sm",
                    className
                )}
                onClick={() => onOpenChange(false)}
            />
        </DialogPortal>
    );
}

function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
    const { open } = useDialog();
    if (!open) return null;
    return (
        <DialogPortal>
            <div className="fixed inset-0 z-[1110] flex items-center justify-center p-4">
                <div className={cn("w-full max-w-lg rounded-lg bg-white shadow-xl", className)}>
                    {children}
                </div>
            </div>
        </DialogPortal>
    );
}

function DialogHeader({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("px-5 py-4 border-b border-slate-200", className)}>{children}</div>
    );
}

function DialogTitle({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <h3 className={cn("text-lg font-semibold text-slate-900", className)}>{children}</h3>
    );
}

function DialogFooter({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2", className)}>
            {children}
        </div>
    );
}

function DialogClose({ asChild, children }: { asChild?: boolean; children: React.ReactElement<any> }) {
    const { onOpenChange } = useDialog();
    if (asChild) {
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: any) => {
                // @ts-ignore
                children.props?.onClick?.(e);
                onOpenChange(false);
            }
        } as any);
    }
    return (
        <button onClick={() => onOpenChange(false)}>Close</button>
    );
}

export {
    Dialog,
    DialogTrigger,
    DialogOverlay,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
};
