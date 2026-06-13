import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password - BijakBeli.app",
  description: "Buat password baru untuk akun Anda",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="rounded-2xl bg-white p-8 shadow-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Masukkan password baru untuk akun Anda.
            </p>
          </div>

          <ResetPasswordForm />

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Kembali ke </span>
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
