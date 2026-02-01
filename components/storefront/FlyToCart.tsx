"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStorefrontCart, type FlyAnimation } from "@/context/StorefrontCartContext";

const START_SIZE = 80;

function FlyDot({ anim, onDone }: { anim: FlyAnimation; onDone: () => void }) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    left: anim.startX - START_SIZE / 2,
    top: anim.startY - START_SIZE / 2,
    width: START_SIZE,
    height: START_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 9999,
    pointerEvents: "none",
    transition: "none",
    opacity: 1,
    transform: "scale(1)",
    boxShadow: "0 4px 30px rgba(220, 38, 38, 0.5)",
    border: "2px solid rgba(220, 38, 38, 0.7)",
  });

  useEffect(() => {
    const target = document.getElementById("cart-icon-target");
    if (!target) {
      onDone();
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const endX = targetRect.left + targetRect.width / 2 - 12;
    const endY = targetRect.top + targetRect.height / 2 - 12;

    // Start animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStyle({
          position: "fixed",
          left: endX,
          top: endY,
          width: 24,
          height: 24,
          borderRadius: "50%",
          overflow: "hidden",
          zIndex: 9999,
          pointerEvents: "none",
          transition: "all 0.85s cubic-bezier(0.25, 0.75, 0.3, 1)",
          opacity: 0.2,
          transform: "scale(0.2)",
          boxShadow: "0 0 12px rgba(220, 38, 38, 0.3)",
          border: "2px solid rgba(220, 38, 38, 0.3)",
        });
      });
    });

    const timer = setTimeout(onDone, 900);
    return () => clearTimeout(timer);
  }, [onDone, anim]);

  return createPortal(
    <div style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={anim.image}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>,
    document.body
  );
}

export default function FlyToCart() {
  const { flyAnimations, removeFlyAnimation } = useStorefrontCart();

  if (flyAnimations.length === 0) return null;

  return (
    <>
      {flyAnimations.map((anim) => (
        <FlyDot
          key={anim.id}
          anim={anim}
          onDone={() => removeFlyAnimation(anim.id)}
        />
      ))}
    </>
  );
}
