use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Admin,
    Hod,
    Faculty,
    Student,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Admin => "admin",
            Role::Hod => "hod",
            Role::Faculty => "faculty",
            Role::Student => "student",
        }
    }

    pub fn parse(s: &str) -> Option<Role> {
        match s {
            "admin" => Some(Role::Admin),
            "hod" => Some(Role::Hod),
            "faculty" => Some(Role::Faculty),
            "student" => Some(Role::Student),
            _ => None,
        }
    }
}

/// The authenticated caller, rebuilt from the database on every request.
#[derive(Debug, Clone)]
pub struct Principal {
    pub user_id: Uuid,
    pub session_id: Uuid,
    pub roles: Vec<Role>,
    pub student_id: Option<Uuid>,
    pub must_change_password: bool,
}

impl Principal {
    pub fn has_role(&self, role: Role) -> bool {
        self.roles.contains(&role)
    }

    /// HOD and department admin manage student accounts and see all requests.
    pub fn can_manage_students(&self) -> bool {
        self.has_role(Role::Admin) || self.has_role(Role::Hod)
    }

    /// Only the HOD is the final approval authority. Faculty/admin do NOT inherit it.
    pub fn can_decide_requests(&self) -> bool {
        self.has_role(Role::Hod)
    }

    pub fn can_view_audit(&self) -> bool {
        self.has_role(Role::Admin) || self.has_role(Role::Hod)
    }

    pub fn owns_student(&self, student_id: Uuid) -> bool {
        self.student_id == Some(student_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(roles: Vec<Role>, student_id: Option<Uuid>) -> Principal {
        Principal {
            user_id: Uuid::new_v4(),
            session_id: Uuid::new_v4(),
            roles,
            student_id,
            must_change_password: false,
        }
    }

    #[test]
    fn only_hod_can_decide() {
        assert!(p(vec![Role::Hod], None).can_decide_requests());
        assert!(!p(vec![Role::Admin], None).can_decide_requests());
        assert!(!p(vec![Role::Faculty], None).can_decide_requests());
        assert!(!p(vec![Role::Student], Some(Uuid::new_v4())).can_decide_requests());
    }

    #[test]
    fn admin_and_hod_manage_students_faculty_does_not() {
        assert!(p(vec![Role::Admin], None).can_manage_students());
        assert!(p(vec![Role::Hod], None).can_manage_students());
        assert!(!p(vec![Role::Faculty], None).can_manage_students());
    }

    #[test]
    fn ownership_is_by_student_id() {
        let sid = Uuid::new_v4();
        let me = p(vec![Role::Student], Some(sid));
        assert!(me.owns_student(sid));
        assert!(!me.owns_student(Uuid::new_v4()));
    }

    #[test]
    fn role_round_trip() {
        for r in [Role::Admin, Role::Hod, Role::Faculty, Role::Student] {
            assert_eq!(Role::parse(r.as_str()), Some(r));
        }
        assert_eq!(Role::parse("root"), None);
    }
}
