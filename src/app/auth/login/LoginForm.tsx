"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Masukkan password"
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "default", size: "default" }) + " w-full"}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Memproses...
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  );
}
