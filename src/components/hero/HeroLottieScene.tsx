'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
});

export function HeroLottieScene() {
  const [animationData, setAnimationData] = useState<unknown>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Fetch Lottie JSON from CDN
    fetch('https://assets5.lottiefiles.com/packages/lf20_ystsffqy.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(() => setError(true));
  }, []);

  if (error) {
    // Fallback gradient on error
    return (
      <div className="relative hidden h-[600px] w-[800px] lg:block">
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!animationData) {
    // Loading skeleton
    return (
      <div className="relative hidden h-[600px] w-[800px] lg:block">
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-purple-500/20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative hidden h-[600px] w-[800px] lg:block">
      <Lottie
        animationData={animationData}
        loop
        autoplay
        className="h-full w-full"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50">
        Animation powered by Lottie
      </div>
    </div>
  );
}
