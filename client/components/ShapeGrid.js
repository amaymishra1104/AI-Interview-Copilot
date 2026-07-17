"use client";

import { useEffect, useRef } from "react";

export default function ShapeGrid({
  color = "#ffffff",
  cellSize = 60,
  opacity = 0.3,
  gap = 0.5,
  className = "",
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / (cellSize + gap));
      const rows = Math.ceil(height / (cellSize + gap));

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;

          const dx = mouseRef.current.x - cx;
          const dy = mouseRef.current.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 150;
          const influence = Math.max(0, 1 - dist / maxDist);

          // Scale + glow based on mouse proximity
          const scale = 1 + influence * 0.6;
          const alpha = opacity + influence * 0.4;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;

          const s = cellSize * 0.35;

          // Alternating shapes per cell
          const shapeType = (row + col) % 3;
          if (shapeType === 0) {
            // Square
            ctx.fillRect(-s / 2, -s / 2, s, s);
          } else if (shapeType === 1) {
            // Circle
            ctx.beginPath();
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Diamond
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 2, 0);
            ctx.lineTo(0, s / 2);
            ctx.lineTo(-s / 2, 0);
            ctx.closePath();
            ctx.fill();
          }

          ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [color, cellSize, opacity, gap]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ display: "block" }}
    />
  );
}
