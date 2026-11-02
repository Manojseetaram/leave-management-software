use crate::context::Core;
use domain::{
    error::{DomainError, DomainResult},
    leave::{RequestStatus, RequestType},
    models::{FacultyLeaveRequest, FacultyStudent, PageParams, Paged},
    principal::Principal,
};
use repository::{faculty, students};
use uuid::Uuid;

fn require(actor: &Principal, permission: &str) -> DomainResult<()> {
    if actor.has_permission(permission) {
        Ok(())
    } else {
        Err(DomainError::Forbidden)
    }
}

#[derive(Debug, Default)]
pub struct FacultyStudentFilter {
    pub q: Option<String>,
    pub semester: Option<i16>,
    pub section: Option<String>,
    pub page: PageParams,
}

pub async fn list_students(
    core: &Core,
    actor: &Principal,
    filter: FacultyStudentFilter,
) -> DomainResult<Paged<FacultyStudent>> {
    require(actor, "faculty:students:read")?;
    if let Some(semester) = filter.semester {
        if !(1..=12).contains(&semester) {
            return Err(DomainError::Validation(
                "semester must be between 1 and 12".into(),
            ));
        }
    }
    let pattern = filter
        .q
        .as_deref()
        .map(str::trim)
        .filter(|q| !q.is_empty())
        .map(students::like_pattern);
    let section = filter
        .section
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let items = faculty::list_students(
        &core.pool,
        pattern.as_deref(),
        filter.semester,
        section,
        filter.page.limit(),
        filter.page.offset(),
    )
    .await?;
    let total =
        faculty::count_students(&core.pool, pattern.as_deref(), filter.semester, section).await?;
    Ok(Paged::new(items, total, filter.page))
}

#[derive(Debug, Default)]
pub struct FacultyLeaveFilter {
    pub status: Option<String>,
    pub request_type: Option<String>,
    pub student_id: Option<Uuid>,
    pub page: PageParams,
}

pub async fn list_leave_requests(
    core: &Core,
    actor: &Principal,
    filter: FacultyLeaveFilter,
) -> DomainResult<Paged<FacultyLeaveRequest>> {
    require(actor, "faculty:leave:read")?;
    if let Some(status) = filter.status.as_deref() {
        match RequestStatus::parse(status) {
            Some(RequestStatus::Draft) => {
                return Err(DomainError::Validation(
                    "faculty cannot list draft requests".into(),
                ))
            }
            Some(_) => {}
            None => return Err(DomainError::Validation("unknown status filter".into())),
        }
    }
    if let Some(request_type) = filter.request_type.as_deref() {
        if RequestType::parse(request_type).is_none() {
            return Err(DomainError::Validation(
                "unknown request_type filter".into(),
            ));
        }
    }

    let items = faculty::list_leave_requests(
        &core.pool,
        filter.status.as_deref(),
        filter.request_type.as_deref(),
        filter.student_id,
        filter.page.limit(),
        filter.page.offset(),
    )
    .await?;
    let total = faculty::count_leave_requests(
        &core.pool,
        filter.status.as_deref(),
        filter.request_type.as_deref(),
        filter.student_id,
    )
    .await?;
    Ok(Paged::new(items, total, filter.page))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn principal(permissions: &[&str]) -> Principal {
        Principal {
            user_id: Uuid::new_v4(),
            session_id: Uuid::new_v4(),
            roles: Vec::new(),
            permissions: permissions.iter().map(|p| p.to_string()).collect(),
            student_id: None,
            must_change_password: false,
        }
    }

    #[test]
    fn faculty_views_require_explicit_permissions() {
        assert!(require(&principal(&[]), "faculty:students:read").is_err());
        assert!(require(
            &principal(&["faculty:students:read"]),
            "faculty:students:read"
        )
        .is_ok());
        assert!(require(&principal(&["faculty:students:read"]), "faculty:leave:read").is_err());
    }
}
