export type Role = "admin" | "hod" | "faculty" | "student";

export type LeaveStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "completed";

export type LeaveType =
  | "personal_leave"
  | "medical_leave"
  | "event_permission"
  | "other";

export type DocumentType =
  | "medical_certificate"
  | "event_invitation"
  | "registration_confirmation"
  | "participation_certificate"
  | "other";

export type StudentStatus = "active" | "inactive" | "graduated" | "archived";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string;
  status: string;
  must_change_password: boolean;
}

export interface SessionInfo {
  id: string;
  created_at: string;
  expires_at: string;
  current: boolean;
}

export interface StudentRecord {
  id: string;
  user_id: string;
  register_number: string;
  full_name: string;
  email: string | null;
  department: string;
  semester: number;
  section: string | null;
  admission_year: number | null;
  status: string;
  created_at: string;
  deleted_at: string | null;
}

export interface LeaveRequest {
  id: string;
  student_id: string;
  request_type: string;
  reason: string;
  destination: string | null;
  start_at: string;
  end_at: string;
  status: LeaveStatus;
  submitted_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestHistoryEntry {
  id: string;
  leave_request_id: string;
  actor_id: string;
  action: string | null;
  old_status: string | null;
  new_status: string;
  comment: string | null;
  created_at: string;
}

export interface FacultyStudent {
  id: string;
  register_number: string;
  full_name: string;
  department: string;
  semester: number;
  section: string | null;
  admission_year: number | null;
  status: string;
}

export interface FacultyLeaveRequest {
  id: string;
  student_id: string;
  register_number: string;
  student_name: string;
  request_type: string;
  start_at: string;
  end_at: string;
  status: LeaveStatus;
  submitted_at: string | null;
  decided_at: string | null;
}

export interface ParentContact {
  id: string;
  student_id: string;
  full_name: string;
  relationship: string;
  verified_at: string | null;
  sms_consent_at: string | null;
  active: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardCounts {
  total_students: number;
  active_students: number;
  pending_requests: number;
  approved_requests: number;
  completed_requests: number;
  unverified_documents: number;
  queued_notifications: number;
  failed_notifications: number;
}

export interface LeaveReportSummary {
  total: number;
  pending: number;
  changes_requested: number;
  approved: number;
  rejected: number;
  withdrawn: number;
  completed: number;
  personal_leave: number;
  medical_leave: number;
  event_permission: number;
  other: number;
}

export interface EventRecord {
  id: string;
  leave_request_id: string;
  student_id: string;
  title: string;
  organizer: string;
  event_website: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  participation_details: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  leave_request_id: string | null;
  event_id: string | null;
  uploader_id: string;
  document_type: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  malware_scan_status: string;
  verification_status: string;
  verified_by: string | null;
  verified_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  leave_request_id: string;
  event_type: string;
  channel: string;
  status: string;
  provider_message_id: string | null;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface NotificationAttempt {
  id: number;
  notification_id: string;
  attempt_number: number;
  status: string;
  provider_message_id: string | null;
  error: string | null;
  attempted_at: string;
}

export interface NotificationDetail {
  notification: NotificationRecord;
  attempts: NotificationAttempt[];
}

export interface CreatedStudent {
  student: StudentRecord;
  temporary_password: string;
}

export interface CreatedStaff {
  user: UserProfile;
  roles: Role[];
  temporary_password: string;
}

export interface BulkImportResult {
  total: number;
  succeeded: number;
  failed: number;
  dry_run: boolean;
  rows: ImportRowResult[];
}

export interface ImportRowResult {
  row: number;
  register_number?: string | null;
  status: string;
  student?: StudentRecord | null;
  temporary_password?: string | null;
  error?: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface Dashboard {
  counts: DashboardCounts;
  recent_pending: LeaveRequest[];
}

export interface LeaveReport {
  summary: LeaveReportSummary;
  items: LeaveRequest[];
  total: number;
  page: number;
  per_page: number;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_at: string;
  must_change_password: boolean;
}

export interface AuthMeResponse {
  user: UserProfile;
  roles: Role[];
  student_id: string | null;
}

export interface NewStudent {
  register_number: string;
  full_name: string;
  email?: string | null;
  semester: number;
  section?: string | null;
  admission_year?: number | null;
}

export interface UpdateStudent {
  full_name?: string | null;
  email?: string | null;
  semester?: number | null;
  section?: string | null;
  admission_year?: number | null;
  status?: string | null;
}

export interface NewLeave {
  student_id?: string | null;
  request_type: string;
  reason: string;
  destination?: string | null;
  start_at: string;
  end_at: string;
}

export interface UpdateLeave {
  request_type?: string | null;
  reason?: string | null;
  destination?: string | null;
  start_at?: string | null;
  end_at?: string | null;
}

export interface NewParent {
  student_id: string;
  full_name: string;
  relationship: string;
  phone: string;
  sms_consent?: boolean;
}

export interface UpdateParent {
  full_name?: string | null;
  relationship?: string | null;
  phone?: string | null;
  sms_consent?: boolean | null;
  active?: boolean | null;
}

export interface NewEvent {
  leave_request_id: string;
  title: string;
  organizer: string;
  event_website?: string | null;
  location?: string | null;
  start_at: string;
  end_at: string;
  participation_details?: string | null;
}

export interface UpdateEvent {
  title?: string | null;
  organizer?: string | null;
  event_website?: string | null;
  location?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  participation_details?: string | null;
}

export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  fieldErrors: Record<string, string[]>;
}