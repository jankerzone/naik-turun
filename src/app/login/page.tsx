"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/session-context-provider";

export default function LoginPage() {
  const router = useRouter();
  const { supabase, session } = useSupabase();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 space-y-8 bg-white dark:bg-gray-950 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
        />
      </div>
    </div>
  );
}