import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  isAdmin: boolean;
  isAuthenticated: boolean;
};

export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return { isAdmin: false, isAuthenticated: false };
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return {
    isAdmin: role?.role === "admin",
    isAuthenticated: true,
  };
}
