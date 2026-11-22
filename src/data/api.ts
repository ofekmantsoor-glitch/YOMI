// The only module that talks to the backend (PRD architecture constraint 3).
// Swapping providers or adding payload encryption happens here and nowhere else.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const backendConfigured = Boolean(url && anonKey)

export const supabase = backendConfigured ? createClient(url!, anonKey!) : null
