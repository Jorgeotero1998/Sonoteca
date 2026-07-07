import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "icon" | "primary" | "default";
};

export function MotionBtn({ children, variant = "default", className = "", ...rest }: Props) {
  const cls =
    variant === "icon"
      ? `iconBtn ${className}`
      : variant === "primary"
        ? `btnPrimary ${className}`
        : `btn ${className}`;

  return (
    <motion.button
      className={cls}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      {...(rest as object)}
    >
      {children}
    </motion.button>
  );
}
