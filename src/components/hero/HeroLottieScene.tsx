'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-purple-500/20" />
    </div>
  ),
});

export function HeroLottieScene() {
  // Generic floating tech/shopping animation
  // Using a working Lottie CDN URL - can be replaced later
  const animationUrl = 'https://assets9.lottiefiles.com/packages/lf20_jcikwtux.json';

  return (
    <div className="relative hidden h-[600px] w-[800px] lg:block">
      <Suspense
        fallback={
          <div className="h-full w-full animate-pulse rounded-lg bg-purple-500/10" />
        }
      >
        <Lottie
          animationData={animationUrl}
          loop
          autoplay
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50">
        Animation powered by Lottie
      </div>
    </div>
  );
}
