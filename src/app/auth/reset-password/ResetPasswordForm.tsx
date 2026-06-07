"use client";

import { useActionState } from "react";
import { resetPassword, type AuthState } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    resetPassword,
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
        <label htmlFor="password" className="text-sm font-medium">
          Password Baru
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Masukkan password baru"
          required
          autoComplete="new-password"
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Konfirmasi Password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Konfirmasi password baru"
          required
          autoComplete="new-password"
          minLength={6}
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
          "Reset Password"
        )}
      </button>
    </form>
  );
}
