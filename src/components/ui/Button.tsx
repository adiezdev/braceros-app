import type { ButtonHTMLAttributes } from "react";

export function Button({
  fuerte = false,
  fino = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { fuerte?: boolean; fino?: boolean }) {
  const clases = [
    "btn",
    fuerte && "btn--fuerte",
    fino && "btn--fino",
    className,
  ].filter(Boolean).join(" ");
  return <button className={clases} {...rest} />;
}