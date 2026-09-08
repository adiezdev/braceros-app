import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`sel ${className}`.trim()} {...rest} />;
}