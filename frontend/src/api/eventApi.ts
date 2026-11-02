import { request } from './client'

import type { EventRecord, NewEvent, UpdateEvent } from '../types/event'

import type { Paged } from '../types/api'

/** GET /events — scoped by the backend to the student or manager. */
export const list = () => request<Paged<EventRecord>>('/events')

export const show = (id: string) => request<EventRecord>(`/events/${id}`)

export const create = (body: NewEvent) =>
  request<EventRecord>('/events', { method: 'POST', body })

export const update = (id: string, body: UpdateEvent) =>
  request<EventRecord>(`/events/${id}`, { method: 'PATCH', body })
