import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });
    }

    const supabase = await createClient();

    // Supabase handles password reset email automatically
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      // Don't reveal if email exists or not for security
      return NextResponse.json({ 
        success: true,
        message: "Jika email terdaftar, link reset akan dikirim"
      });
    }

    return NextResponse.json({ 
      success: true,
      message: "Link reset password telah dikirim ke email Anda"
    });
  } catch (err) {
    console.error("Forgot password API error:", err);
    return NextResponse.json(
      { error: "Gagal mengirim email reset password" },
      { status: 500 }
    );
  }
}
