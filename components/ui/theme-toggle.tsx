"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react/dist/ssr";

interface Particle {
  id: number;
  delay: number;
  duration: number;
}

/**
 * Interruptor claro/oscuro con física de resorte y destello de partículas.
 * Adaptado a Phosphor; usa next-themes. Sin emojis.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateParticles = () => {
    const next: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      next.push({ id: i, delay: i * 0.1, duration: 0.6 + i * 0.1 });
    }
    setParticles(next);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setParticles([]);
    }, 1000);
  };

  const handleToggle = () => {
    generateParticles();
    setTheme(isDark ? "light" : "dark");
  };

  // Placeholder durante SSR para evitar desajuste de hidratación.
  if (!mounted) {
    return (
      <div className="relative inline-block">
        <div className="h-[64px] w-[104px] rounded-full bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <motion.button
        ref={toggleRef}
        onClick={handleToggle}
        className="relative flex h-[64px] w-[104px] items-center rounded-full p-[6px] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at top left, #1e293b 0%, #0f172a 40%, #020617 100%)"
            : "radial-gradient(ellipse at top left, #ffffff 0%, #f1f5f9 40%, #cbd5e1 100%)",
          boxShadow: isDark
            ? "inset 5px 5px 12px rgba(0,0,0,0.9), inset -5px -5px 12px rgba(71,85,105,0.4), inset 8px 8px 16px rgba(0,0,0,0.7), inset -8px -8px 16px rgba(100,116,139,0.2), inset 0 2px 4px rgba(0,0,0,1), inset 0 0 20px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.4), 0 16px 32px rgba(0,0,0,0.3)"
            : "inset 5px 5px 12px rgba(148,163,184,0.5), inset -5px -5px 12px rgba(255,255,255,1), inset 8px 8px 16px rgba(100,116,139,0.3), inset -8px -8px 16px rgba(255,255,255,0.9), inset 0 0 20px rgba(203,213,225,0.3), 0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.06)",
          border: isDark ? "2px solid rgba(51,65,85,0.6)" : "2px solid rgba(203,213,225,0.6)",
        }}
        aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
        role="switch"
        aria-checked={isDark}
        whileTap={{ scale: 0.98 }}
      >
        {/* Surco interior. */}
        <div
          className="pointer-events-none absolute inset-[3px] rounded-full"
          style={{
            boxShadow: isDark
              ? "inset 0 2px 6px rgba(0,0,0,0.9), inset 0 -1px 3px rgba(71,85,105,0.3)"
              : "inset 0 2px 6px rgba(100,116,139,0.4), inset 0 -1px 3px rgba(255,255,255,0.8)",
          }}
        />

        {/* Iconos de fondo. */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <Sun size={20} weight="fill" className={isDark ? "text-amber-200/70" : "text-amber-500"} />
          <Moon size={20} weight="fill" className={isDark ? "text-slate-200" : "text-slate-500"} />
        </div>

        {/* Pulgar con resorte. */}
        <motion.div
          className="relative z-10 flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-full"
          style={{
            background: isDark
              ? "linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%)"
              : "linear-gradient(145deg, #ffffff 0%, #fefefe 50%, #f8fafc 100%)",
            boxShadow: isDark
              ? "inset 2px 2px 4px rgba(100,116,139,0.4), inset -2px -2px 4px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)"
              : "inset 2px 2px 4px rgba(203,213,225,0.3), inset -2px -2px 4px rgba(255,255,255,1), 0 8px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12)",
            border: isDark ? "2px solid rgba(148,163,184,0.3)" : "2px solid rgba(255,255,255,0.9)",
          }}
          animate={{ x: isDark ? 46 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Brillo superior. */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)",
              mixBlendMode: "overlay",
            }}
          />

          {/* Partículas al cambiar. */}
          {isAnimating &&
            particles.map((p) => (
              <motion.div key={p.id} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: "10px",
                    height: "10px",
                    background: isDark
                      ? "radial-gradient(circle, rgba(147,197,253,0.5) 0%, rgba(147,197,253,0) 70%)"
                      : "radial-gradient(circle, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0) 70%)",
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: isDark ? 6 : 8, opacity: [0, 1, 0] }}
                  transition={{ duration: isDark ? 0.5 : p.duration, delay: p.delay, ease: "easeOut" }}
                />
              </motion.div>
            ))}

          {/* Icono activo. */}
          <div className="relative z-10">
            {isDark ? (
              <Moon size={20} weight="fill" className="text-amber-100" />
            ) : (
              <Sun size={20} weight="fill" className="text-amber-500" />
            )}
          </div>
        </motion.div>
      </motion.button>
    </div>
  );
}
