import type { FrequencyPeriod, NonCompletionReason } from '../domain/assumptions'

export interface Therapist { id: string; display_name: string; email: string }

export interface Patient {
  id: string
  therapist_id: string
  nickname: string
  session_weekday: number // 0 = Sunday
  created_at: string
  joined_at: string | null
}

export type TaskType = 'thought' | 'behavioral'

export interface Task {
  id: string
  patient_id: string
  type: TaskType
  title: string
  instruction: string
  frequency_count: number | null
  frequency_period: FrequencyPeriod
  due_date: string | null
  status: 'active' | 'ended'
  created_at: string
}

export interface ThoughtPayload { situation: string; emotions: { name: string; intensity: number }[]; thought: string }
export interface BehavioralPayload {
  status: 'done' | 'partial'
  distress_before: number | null
  distress_after: number | null
  note: string
}
export interface NonCompletionPayload { reason: NonCompletionReason; note: string }

export type ReportInput =
  | { kind: 'thought'; payload: ThoughtPayload }
  | { kind: 'behavioral'; payload: BehavioralPayload }
  | { kind: 'non_completion'; payload: NonCompletionPayload }

export type Report = ReportInput & {
  id: string
  patient_id: string
  task_id: string | null
  event_at: string
  started_at: string
  created_at: string
}

export interface NewTask {
  patient_id: string
  type: TaskType
  title: string
  instruction: string
  frequency_count: number | null
  frequency_period: FrequencyPeriod
  due_date: string | null
}

export interface Invite { code: string; expires_at: string }

/** Error codes match the RAISE messages in supabase/migrations/001_schema.sql. */
export type ApiErrorCode =
  | 'not_allowed' | 'not_found' | 'bad_login'
  | 'invalid_code' | 'code_used' | 'code_expired' | 'already_joined'
  | 'invalid_report' | 'event_in_future' | 'task_ended' | 'network'

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) { super(code) }
}
