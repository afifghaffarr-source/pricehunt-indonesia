import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = {
  title: "Lupa Password - PriceHunt Indonesia",
  description: "Reset password akun Anda",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Lupa Password?</h1>
            <p className="mt-2 text-sm text-gray-600">
              Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Sudah ingat password? </span>
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
