"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 이 서비스의 대화상자는 한 가지 모양만 쓴다.
 * 모바일에서는 아래에서 올라오는 바텀 시트, sm 이상에서는 화면 가운데 대화상자.
 * 포커스 가두기, ESC 닫기, 배경 스크롤 잠금은 Radix가 처리한다.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const sizeClass = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
} as const;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof sizeClass;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size = "lg", ...props }, ref) => (
  <DialogPrimitive.Portal>
    {/* 모바일 하단 탭바가 z-50이라 대화상자는 그보다 위(z-60)에 있어야 한다 */}
    <DialogPrimitive.Overlay className="fixed inset-0 z-[60] flex items-end bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:items-center sm:justify-center">
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={undefined}
        className={cn(
          "safe-area-bottom flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-background text-foreground shadow-xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-10 data-[state=open]:slide-in-from-bottom-10 sm:max-h-[80vh] sm:rounded-2xl",
          sizeClass[size],
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Overlay>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 제목 위의 작은 안내 문구 */
  eyebrow?: React.ReactNode;
  /** 제목 아래의 보조 설명 */
  description?: React.ReactNode;
}

/** 제목과 닫기 버튼이 있는 머리 영역. children이 제목이 된다. */
function DialogHeader({
  className,
  eyebrow,
  description,
  children,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border/60 px-4 pb-3 pt-4 sm:px-6",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-medium text-primary">{eyebrow}</p>
        )}
        <DialogPrimitive.Title className="text-sm font-semibold leading-snug text-foreground sm:text-base">
          {children}
        </DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        )}
      </div>
      <DialogPrimitive.Close
        aria-label="닫기"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </DialogPrimitive.Close>
    </div>
  );
}

/** 스크롤되는 본문 영역 */
const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6", className)}
    {...props}
  />
));
DialogBody.displayName = "DialogBody";

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 px-4 pb-4 pt-1 sm:px-6", className)}
      {...props}
    />
  );
}

const DialogTitle = DialogPrimitive.Title;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
};
