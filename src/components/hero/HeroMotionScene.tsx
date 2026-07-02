'use client';

import { motion } from 'framer-motion';

export function HeroMotionScene() {
  return (
    <div className="relative hidden h-[600px] w-[800px] lg:block overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="400" height="400" viewBox="0 0 400 400" className="relative">
          {/* Main coin */}
          <motion.g
            initial={{ y: 0 }}
            animate={{ y: [-20, 20, -20] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <motion.circle
              cx="200"
              cy="200"
              r="80"
              fill="url(#coinGradient)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.circle
              cx="200"
              cy="200"
              r="65"
              fill="url(#coinInner)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
            <motion.text
              x="200"
              y="215"
              textAnchor="middle"
              className="text-2xl font-bold fill-amber-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              Rp
            </motion.text>
          </motion.g>

          {/* Floating coin 1 */}
          <motion.g
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, 10, 0],
              y: [0, -15, 0],
              opacity: 1,
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          >
            <circle cx="80" cy="120" r="35" fill="url(#coinGradient)" />
            <circle cx="80" cy="120" r="28" fill="url(#coinInner)" />
            <text
              x="80"
              y="128"
              textAnchor="middle"
              className="text-xs font-bold fill-amber-900"
            >
              Rp
            </text>
          </motion.g>

          {/* Floating coin 2 */}
          <motion.g
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, -10, 0],
              y: [0, -12, 0],
              opacity: 1,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          >
            <circle cx="320" cy="150" r="30" fill="url(#coinGradient)" />
            <circle cx="320" cy="150" r="24" fill="url(#coinInner)" />
            <text
              x="320"
              y="156"
              textAnchor="middle"
              className="text-xs font-bold fill-amber-900"
            >
              Rp
            </text>
          </motion.g>

          {/* Floating coin 3 */}
          <motion.g
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, 8, 0],
              y: [0, -18, 0],
              opacity: 1,
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1.5,
            }}
          >
            <circle cx="110" cy="290" r="25" fill="url(#coinGradient)" />
            <circle cx="110" cy="290" r="20" fill="url(#coinInner)" />
          </motion.g>

          {/* Floating coin 4 */}
          <motion.g
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, -8, 0],
              y: [0, -14, 0],
              opacity: 1,
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          >
            <circle cx="300" cy="280" r="28" fill="url(#coinGradient)" />
            <circle cx="300" cy="280" r="22" fill="url(#coinInner)" />
          </motion.g>

          {/* Sparkles */}
          {[
            { cx: 60, cy: 80, delay: 0 },
            { cx: 340, cy: 100, delay: 0.3 },
            { cx: 90, cy: 320, delay: 0.6 },
            { cx: 320, cy: 320, delay: 0.9 },
          ].map((sparkle, i) => (
            <motion.circle
              key={i}
              cx={sparkle.cx}
              cy={sparkle.cy}
              r="3"
              className="fill-yellow-400"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: sparkle.delay,
              }}
            />
          ))}

          {/* Price tag animation */}
          <motion.g
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <rect
              x="140"
              y="340"
              width="120"
              height="32"
              rx="16"
              className="fill-primary/10"
            />
            <text
              x="200"
              y="361"
              textAnchor="middle"
              className="text-sm font-semibold fill-primary"
            >
              Harga Terbaik
            </text>
          </motion.g>

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="coinInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Background glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-amber-500/10 via-transparent to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50">
        Price Intelligence Visualization
      </div>
    </div>
  );
}
