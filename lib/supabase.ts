import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function isValidUrl(value?: string) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

export const hasSupabaseConfig = Boolean(isValidUrl(supabaseUrl) && supabasePublishableKey);

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!hasSupabaseConfig) return null;

  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export function getMissingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!isValidUrl(supabaseUrl)) missing.push('VITE_SUPABASE_URL');
  if (!supabasePublishableKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  return missing;
}
