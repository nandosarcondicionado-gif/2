export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não está configurada. Cadastre a variável no .env.local ou na Vercel."
    );
  }

  if (!anonKey?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada. Cadastre a variável no .env.local ou na Vercel."
    );
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function getSupabaseServiceRoleEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não está configurada."
    );
  }

  if (!serviceRoleKey?.trim()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor."
    );
  }

  return { url: url.trim(), serviceRoleKey: serviceRoleKey.trim() };
}
