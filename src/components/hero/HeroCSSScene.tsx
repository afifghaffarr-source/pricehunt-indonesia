'use client';

export function HeroCSSScene() {
  return (
    <div className="relative hidden h-[600px] w-[800px] lg:block overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Floating coins animation */}
        <div className="relative h-96 w-96">
          {/* Main coin */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-float">
            <div className="relative h-48 w-48">
              {/* Coin face */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-2xl">
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                  <div className="text-4xl font-bold text-amber-900">Rp</div>
                </div>
              </div>
              {/* Coin edge (3D effect) */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-600 to-amber-700 transform translate-y-2 -z-10 blur-sm opacity-60" />
            </div>
          </div>

          {/* Smaller floating coins */}
          <div className="absolute left-16 top-20 animate-float-delayed-1">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-sm font-bold text-amber-900">
                Rp
              </div>
            </div>
          </div>

          <div className="absolute right-16 top-32 animate-float-delayed-2">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xs font-bold text-amber-900">
                Rp
              </div>
            </div>
          </div>

          <div className="absolute left-24 bottom-24 animate-float-delayed-3">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500" />
            </div>
          </div>

          <div className="absolute right-20 bottom-20 animate-float-delayed-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500" />
            </div>
          </div>

          {/* Price sparkles */}
          <div className="absolute left-12 top-12 h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          <div className="absolute right-12 top-24 h-2 w-2 rounded-full bg-yellow-400 animate-pulse delay-100" />
          <div className="absolute left-20 bottom-16 h-2 w-2 rounded-full bg-yellow-400 animate-pulse delay-200" />
          <div className="absolute right-16 bottom-12 h-2 w-2 rounded-full bg-yellow-400 animate-pulse delay-300" />
        </div>
      </div>

      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-amber-500/10 via-transparent to-transparent" />
      
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50">
        Price Intelligence Visualization
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-20px);
          }
        }

        @keyframes float-delayed-1 {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes float-delayed-2 {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(-5deg);
          }
        }

        @keyframes float-delayed-3 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-18px);
          }
        }

        @keyframes float-delayed-4 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-14px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-delayed-1 {
          animation: float-delayed-1 3.5s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .animate-float-delayed-2 {
          animation: float-delayed-2 4s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-float-delayed-3 {
          animation: float-delayed-3 3.2s ease-in-out infinite;
          animation-delay: 1.5s;
        }

        .animate-float-delayed-4 {
          animation: float-delayed-4 3.8s ease-in-out infinite;
          animation-delay: 2s;
        }

        .delay-100 {
          animation-delay: 100ms;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}
