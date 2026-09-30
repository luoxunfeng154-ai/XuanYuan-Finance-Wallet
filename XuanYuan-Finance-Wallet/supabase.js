const SUPABASE_URL = 'https://gteczhwggeirvrrnlvrz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__fREJa5Gjp2ioJ3clqyOGA_JJAQQzF1';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);