"use client";
import { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function FadeInView({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Skip animation if already in viewport at mount
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.fadeIn = "pending";
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.fadeIn = "visible";
          observer.disconnect();
        }
      },
      // Start the reveal ~120px before the section enters the viewport so the
      // spring transition has settled by the time the user actually sees it
      { threshold: 0, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
