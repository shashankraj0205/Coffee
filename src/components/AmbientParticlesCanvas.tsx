import React, { useEffect, useRef } from 'react';

interface AmbientParticlesCanvasProps {
  variant?: 'hero' | 'dark' | 'warm';
  density?: 'low' | 'medium';
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  alpha: number;
  kind: 'bean' | 'leaf' | 'mote';
}

export const AmbientParticlesCanvas: React.FC<AmbientParticlesCanvasProps> = ({
  variant = 'hero',
  density = 'medium',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let isVisible = true;
    const isMobile = window.innerWidth < 768;
    const count = isMobile
      ? density === 'low'
        ? 10
        : 16
      : density === 'low'
        ? 18
        : 32;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const w0 = canvas.parentElement?.clientWidth || 1200;
    const h0 = canvas.parentElement?.clientHeight || 720;

    const particles: Particle[] = Array.from({ length: count }).map((_, idx) => {
      const kind: Particle['kind'] =
        idx % 5 === 0 ? 'bean' : idx % 4 === 0 ? 'leaf' : 'mote';
      return {
        x: Math.random() * w0,
        y: Math.random() * h0,
        vx: (Math.random() - 0.5) * (kind === 'mote' ? 0.25 : 0.35),
        vy: -(0.18 + Math.random() * 0.42),
        size:
          kind === 'bean'
            ? 5.5 + Math.random() * 4.5
            : kind === 'leaf'
              ? 6 + Math.random() * 5
              : 1.5 + Math.random() * 2.5,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.012,
        alpha:
          kind === 'mote'
            ? 0.22 + Math.random() * 0.32
            : 0.28 + Math.random() * 0.3,
        kind,
      };
    });

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 }
    );
    io.observe(canvas);

    const drawBean = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = variant === 'warm' ? '#6F4028' : '#8C5232';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      // Subtle roasted highlight
      ctx.strokeStyle = 'rgba(217, 164, 65, 0.45)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // Center coffee bean crease
      ctx.strokeStyle = '#24140C';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.72, 0);
      ctx.quadraticCurveTo(0, p.size * 0.26, p.size * 0.72, 0);
      ctx.stroke();
      ctx.restore();
    };

    const drawLeaf = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = variant === 'warm' ? '#294B35' : '#4E7D5E';
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.quadraticCurveTo(0, -p.size * 0.65, p.size, 0);
      ctx.quadraticCurveTo(0, p.size * 0.65, -p.size, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 235, 221, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.8, 0);
      ctx.lineTo(p.size * 0.8, 0);
      ctx.stroke();
      ctx.restore();
    };

    const drawMote = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = variant === 'warm' ? '#E68A24' : '#D9A441';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      raf = requestAnimationFrame(render);
      if (!isVisible) return;
      const w = canvas.parentElement?.clientWidth || w0;
      const h = canvas.parentElement?.clientHeight || h0;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        if (p.y < -20) {
          p.y = h + 18;
          p.x = Math.random() * w;
        }
        if (p.x < -20) p.x = w + 18;
        if (p.x > w + 20) p.x = -18;

        if (p.kind === 'bean') drawBean(p);
        else if (p.kind === 'leaf') drawLeaf(p);
        else drawMote(p);
      }
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [variant, density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[2] ${className}`}
    />
  );
};
