'use client';

export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-sky-950 animate-gradient" />
      
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
        }}
      />
      
      {/* Floating orbs */}
      <div
        className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDuration: '20s' }}
      />
      <div
        className="absolute right-0 top-1/2 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDuration: '25s', animationDelay: '5s' }}
      />
      <div
        className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-float motion-reduce:animate-none"
        style={{ animationDuration: '30s', animationDelay: '10s' }}
      />
    </div>
  );
}
