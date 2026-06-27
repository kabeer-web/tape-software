import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gxxndoypcrgfqkqwesni.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lPUaMlpgGBNhTQ8rEfPVKg_I3xn2x5A';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);