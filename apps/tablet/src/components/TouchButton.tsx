import React, { useState, useEffect, useRef } from "react";

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onConfirm: () => void;
  confirmText?: string;
  requireDoubleTap?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function TouchButton({
  onConfirm,
  confirmText = "¡TOCA DE NUEVO PARA CONFIRMAR!",
  requireDoubleTap = true,
  className = "",
  style,
  children,
  disabled,
  ...rest
}: TouchButtonProps) {
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const timerRef = useRef<any>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;

    if (!requireDoubleTap) {
      onConfirm();
      return;
    }

    if (pendingConfirm) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingConfirm(false);
      onConfirm();
    } else {
      setPendingConfirm(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setPendingConfirm(false);
      }, 3000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      {...rest}
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`${className} ${pendingConfirm ? "pending-double-tap" : ""}`}
      style={{
        position: "relative",
        transition: "all 0.15s ease",
        transform: pendingConfirm ? "scale(1.02)" : "scale(1)",
        outline: pendingConfirm ? "3px solid var(--brand-lumo-gold, #facc15)" : "none",
        backgroundColor: pendingConfirm ? "rgba(250, 204, 21, 0.25)" : style?.backgroundColor,
        borderColor: pendingConfirm ? "var(--brand-lumo-gold, #facc15)" : style?.borderColor,
        boxShadow: pendingConfirm ? "0 0 15px rgba(250, 204, 21, 0.4)" : style?.boxShadow,
        ...style
      }}
    >
      {pendingConfirm ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span>{children}</span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#facc15",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginTop: "2px"
            }}
          >
            {confirmText}
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
