import { createClient } from '@supabase/supabase-js'

// Ye tareeqa local aur online dono jagah kaam karega
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)