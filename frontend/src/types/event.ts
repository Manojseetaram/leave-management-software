/** Event and participation permission types (crates/domain/src/models.rs). */

import type { LeaveRequest } from './leave'

export interface EventRecord {
  id: string
  leave_request_id: string
  student_id: string
  title: string
  organizer: string
  event_website: string | null
  location: string | null
  start_at: string
  end_at: string
  participation_details: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface NewEvent {
  leave_request_id: string
  title: string
  organizer: string
  event_website?: string
  location?: string
  start_at: string
  end_at: string
  participation_details?: string
}

export interface UpdateEvent {
  title?: string
  organizer?: string
  event_website?: string
  location?: string
  start_at?: string
  end_at?: string
  participation_details?: string
}

/** One leave request plus its optional event, where present. */
export type StudentEventContext = {
  request: LeaveRequest
} & { event: EventRecord | null }
