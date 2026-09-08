import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  fuerte?: boolean;
  fino?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    fuerte = false,
    fino = false,
    loading = false,
    leftIcon,
    rightIcon,
    className = "",
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const clases = [
    "btn",
    fuerte && "btn--fuerte",
    fino && "btn--fino",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button
      ref={ref}
      className={clases}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});