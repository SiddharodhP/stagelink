import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Kept in step with textareaClass in components/shared/dashboard-ui,
          // which is what most forms actually use. This shipped as the stock
          // dark shadcn styling, which was invisible on a paper background.
          "flex min-h-[120px] w-full resize-none rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
