import type { Variants } from 'framer-motion';

export const easing = {
  smooth: [0.43, 0.13, 0.23, 0.96] as const,
  snappy: [0.19, 1.0, 0.22, 1.0] as const,
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
};

export const duration = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  verySlow: 1.2,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: easing.snappy },
  },
};
