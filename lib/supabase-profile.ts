import { supabase } from "@/lib/supabase";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureProfile(user: any) {
  if (!user) return;
  let { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      created_at: new Date().toISOString(),
    });
    // Poll for the profile to exist (max 5 tries, 100ms apart)
    for (let i = 0; i < 5; i++) {
      await sleep(100);
      const { data: checkProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (checkProfile) break;
    }
  }
} 