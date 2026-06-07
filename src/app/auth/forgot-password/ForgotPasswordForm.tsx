"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined
  );

  if (state?.success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Email terkirim!</p>
            <p className="mt-1 text-green-600">
              Silakan cek email Anda untuk link reset password.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "default", size: "default" }) + " w-full"}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Mengirim...
          </>
        ) : (
          "Kirim Link Reset"
        )}
      </button>
    </form>
  );
}
