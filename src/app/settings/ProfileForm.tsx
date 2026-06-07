"use client";

import { useActionState } from "react";
import { updateProfile, type SettingsState } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface ProfileFormProps {
  currentName: string;
  currentEmail: string;
}

export function ProfileForm({ currentName, currentEmail }: ProfileFormProps) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateProfile,
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
          Profil berhasil diperbarui!
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="display_name" className="text-sm font-medium">
          Nama Lengkap
        </label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={currentName}
          required
          minLength={2}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input value={currentEmail} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">
          Email tidak bisa diubah.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        {pending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
        ) : (
          "Simpan Profil"
        )}
      </button>
    </form>
  );
}
