'use client';

import CountUp from 'react-countup';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedCounterProps {
  end: number;
  prefix?: string;
  duration?: number;
}

export function AnimatedCounter({
  end,
  prefix = 'Rp ',
  duration = 2,
}: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <span ref={ref} className="text-4xl font-bold text-emerald-500">
      {isInView && (
        <CountUp
          start={0}
          end={end}
          duration={duration}
          separator="."
          prefix={prefix}
          useEasing
          easingFn={(t, b, c, d) => c * ((t = t / d - 1) * t * t + 1) + b}
        />
      )}
    </span>
  );
}
