use crate::notifications::SmsProvider;
use repository::PgPool;
use std::sync::Arc;

pub struct Settings {
    /// AES-256-GCM key for parent phone numbers.
    pub phone_key: [u8; 32],
    pub session_ttl_hours: i64,
    pub sms_max_attempts: i32,
}

/// Shared application context handed to every workflow.
#[derive(Clone)]
pub struct Core {
    pub pool: PgPool,
    pub settings: Arc<Settings>,
    pub sms: Arc<dyn SmsProvider>,
}

impl Core {
    pub fn new(pool: PgPool, settings: Settings, sms: Arc<dyn SmsProvider>) -> Self {
        Self {
            pool,
            settings: Arc::new(settings),
            sms,
        }
    }
}
