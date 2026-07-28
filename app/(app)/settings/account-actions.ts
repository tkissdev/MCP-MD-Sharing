"use server";

import { getServerClient } from "@/lib/supabase-server";
import { getServiceClient } from "@/lib/supabase";

// Deletes only the user's account itself (email, password, OAuth identities,
// the locale preference stored in user_metadata) and their personal API
// keys. Organizations, projects, documents and versions are not owned by the
// user and are left completely untouched — any membership rows referencing
// this user are governed by the database's own foreign-key rules, not
// deleted explicitly here.
export async function deleteAccountAction() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const admin = getServiceClient();

  const { error: keysError } = await admin.from("api_keys").delete().eq("user_id", user.id);
  if (keysError) throw new Error(keysError.message);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);
}
