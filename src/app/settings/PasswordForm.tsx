"use client";

import { useActionState } from "react";
import { updatePassword, type SettingsState } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updatePassword,
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
      {state?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Password berhasil diubah!
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="new_password" className="text-sm font-medium">
          Password Baru
        </label>
        <Input
          id="new_password"
          name="new_password"
          type="password"
          placeholder="Minimal 6 karakter"
          required
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm_password" className="text-sm font-medium">
          Konfirmasi Password Baru
        </label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          placeholder="Ulangi password baru"
          required
          minLength={6}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        {pending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
        ) : (
          "Ubah Password"
        )}
      </button>
    </form>
  );
}
