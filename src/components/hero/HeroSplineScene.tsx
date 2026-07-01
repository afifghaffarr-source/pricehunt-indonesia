'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-pulse rounded-full bg-purple-500/20" />
    </div>
  ),
});

export function HeroSplineScene() {
  return (
    <div className="relative hidden h-[600px] w-[800px] lg:block">
      <Suspense
        fallback={
          <div className="h-full w-full animate-pulse rounded-lg bg-purple-500/10" />
        }
      >
        <Spline
          scene="https://prod.spline.design/PLACEHOLDER/scene.splinecode"
          className="h-full w-full"
        />
      </Suspense>
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50">
        Made with Spline
      </div>
    </div>
  );
}
