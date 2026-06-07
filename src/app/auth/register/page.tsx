import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun PriceHunt Indonesia baru.",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Tag className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Price<span className="text-primary">Hunt</span>
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Buat Akun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar untuk menyimpan wishlist dan mengatur price alert.
          </p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
