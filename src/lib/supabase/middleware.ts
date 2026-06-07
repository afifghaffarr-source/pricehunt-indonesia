import { createServerClient } from "@supabase/ssr";
import { type CookieOptions } from "@supabase/ssr";

export function createClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  cookieStore: {
    get(name: string): { name: string; value: string } | undefined;
    set(name: string, value: string, options?: CookieOptions): void;
  }
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options?: CookieOptions) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });
}
