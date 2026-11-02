use crate::{error::ApiResult, extractors::AuthUser, AppState};
use axum::{
    extract::{Query, State},
    Json,
};
use domain::models::{FacultyLeaveRequest, FacultyStudent, PageParams, Paged};
use serde::Deserialize;
use service::faculty::{FacultyLeaveFilter, FacultyStudentFilter};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct StudentQuery {
    pub q: Option<String>,
    pub semester: Option<i16>,
    pub section: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Deserialize)]
pub struct LeaveQuery {
    pub status: Option<String>,
    pub request_type: Option<String>,
    pub student_id: Option<Uuid>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn students(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<StudentQuery>,
) -> ApiResult<Json<Paged<FacultyStudent>>> {
    let filter = FacultyStudentFilter {
        q: q.q,
        semester: q.semester,
        section: q.section,
        page: PageParams {
            page: q.page,
            per_page: q.per_page,
        },
    };
    Ok(Json(
        service::faculty::list_students(&core, &p, filter).await?,
    ))
}

pub async fn leave_requests(
    State(core): State<AppState>,
    AuthUser(p): AuthUser,
    Query(q): Query<LeaveQuery>,
) -> ApiResult<Json<Paged<FacultyLeaveRequest>>> {
    let filter = FacultyLeaveFilter {
        status: q.status,
        request_type: q.request_type,
        student_id: q.student_id,
        page: PageParams {
            page: q.page,
            per_page: q.per_page,
        },
    };
    Ok(Json(
        service::faculty::list_leave_requests(&core, &p, filter).await?,
    ))
}
