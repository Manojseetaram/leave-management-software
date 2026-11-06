use crate::{
    email::EmailSender,
    notifications::SmsProvider,
    storage::{MalwareScanner, MockMalwareScanner, PrivateStorage},
};
use repository::PgPool;
use std::{path::PathBuf, sync::Arc};

pub struct Settings {
    /// AES-256-GCM key for parent phone numbers.
    pub phone_key: [u8; 32],
    pub session_ttl_hours: i64,
    pub sms_max_attempts: i32,
    /// Browser origins allowed to call the API. An empty list disables
    /// cross-origin access and leaves same-origin requests working.
    pub cors_allowed_origins: Vec<String>,
    /// Only enable behind a trusted reverse proxy that overwrites
    /// X-Forwarded-For; otherwise clients could spoof their rate-limit key.
    pub trust_proxy_headers: bool,
    /// Sliding-window limits applied to credential endpoints.
    pub login_rate_limit_per_minute: u32,
    pub password_reset_rate_limit_per_minute: u32,
    /// Recovery links are short lived; the token itself is stored only as a hash.
    pub password_reset_token_ttl_minutes: i64,
    /// Development escape hatch: return the recovery token in the HTTP response.
    /// Must remain false in production because it reveals the token to the caller.
    pub password_reset_expose_token: bool,
    /// Root of the private upload area for the local storage adapter.
    pub storage_dir: PathBuf,
    /// `local` (default) or `s3`.
    pub storage_backend: String,
    /// Hard upper bound enforced before any upload is written to disk.
    pub max_upload_bytes: usize,
    /// Shared secret used to verify SMS delivery callbacks. `None` disables
    /// webhook processing, which is the safe default outside development.
    pub sms_webhook_secret: Option<String>,
    /// Name of the configured SMS adapter, used to reject callbacks aimed at a
    /// provider this deployment does not actually use.
    pub sms_provider: String,
    /// Base URL of the frontend, used to build password-reset links in emails.
    pub app_base_url: Option<String>,
}

/// Shared application context handed to every workflow.
#[derive(Clone)]
pub struct Core {
    pub pool: PgPool,
    pub settings: Arc<Settings>,
    pub sms: Arc<dyn SmsProvider>,
    pub storage: Arc<dyn PrivateStorage>,
    pub email: Arc<dyn EmailSender>,
    pub scanner: Arc<dyn MalwareScanner>,
}

impl Core {
    pub fn new(
        pool: PgPool,
        settings: Settings,
        sms: Arc<dyn SmsProvider>,
        storage: Arc<dyn PrivateStorage>,
        email: Arc<dyn EmailSender>,
    ) -> Self {
        let scanner = Arc::new(MockMalwareScanner);
        Self {
            pool,
            settings: Arc::new(settings),
            sms,
            storage,
            email,
            scanner,
        }
    }
}
