import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 2000, startOnMount = false) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(startOnMount);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const start = () => setHasStarted(true);

  useEffect(() => {
    if (!hasStarted || target === 0) return;
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasStarted, target, duration]);

  return { count, start };
}
