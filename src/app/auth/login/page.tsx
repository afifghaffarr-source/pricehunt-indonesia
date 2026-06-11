import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Masuk ke akun BijakBeli.app Anda.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Tag className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Bijak<span className="text-primary">Beli</span>
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Masuk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk mengakses dashboard dan fitur lainnya.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-primary hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
