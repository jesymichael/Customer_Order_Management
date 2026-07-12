import { forwardRef } from "react";

export function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "border border-destructive/30 text-destructive hover:bg-destructive/10",
};
const SIZES: Record<Size, string> = {
  default: "h-9 px-4",
  sm: "h-8 px-3 text-[13px]",
  icon: "h-8 w-8",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "default", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 rounded-md text-sm font-medium",
        "transition-[transform,background-color,opacity,color] duration-150 [transition-timing-function:var(--ease-out)]",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
});

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx("text-sm font-medium text-foreground", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-xl border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}
