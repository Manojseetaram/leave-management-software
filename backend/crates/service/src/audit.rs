use domain::{
    error::{DomainError, DomainResult},
    models::{AuditLogEntry, PageParams, Paged},
    principal::Principal,
};
use crate::context::Core;

pub async fn list(core: &Core, actor: &Principal, entity_type: Option<&str>, page: PageParams) -> DomainResult<Paged<AuditLogEntry>> {
    if !actor.can_view_audit() {
        return Err(DomainError::Forbidden);
    }
    let items = repository::audit::list(&core.pool, entity_type, page.limit(), page.offset()).await?;
    let total = repository::audit::count(&core.pool, entity_type).await?;
    Ok(Paged::new(items, total, page))
}
