// The only module screens use to reach data (PRD architecture constraint 3).
// Today it is backed by the in-memory demo store. The Supabase version (001_schema.sql has the same rules)
// replaces `local` here and nowhere else; adding payload encryption also happens here.
import { local } from './local'

export const api = local
export const isLocalMode = true
export { demo, LOCAL_DEMO_PASSWORD } from './local'
export { ApiError } from './types'
export type * from './types'
