use std::{env, path::PathBuf};

/// All configuration comes from environment variables and is validated at startup,
/// so a misconfigured deployment fails immediately instead of at the first request.
pub struct Config {
    pub database_url: String,
    pub bind_addr: String,
    pub phone_key: [u8; 32],
    pub session_ttl_hours: i64,
    pub sms_provider: String,
    pub sms_max_attempts: i32,
    pub bootstrap_admin_email: Option<String>,
    pub bootstrap_admin_password: Option<String>,
    pub cors_allowed_origins: Vec<String>,
    pub trust_proxy_headers: bool,
    pub login_rate_limit_per_minute: u32,
    pub password_reset_rate_limit_per_minute: u32,
    pub password_reset_token_ttl_minutes: i64,
    pub password_reset_expose_token: bool,
    pub storage_dir: PathBuf,
    pub max_upload_bytes: usize,
    pub sms_webhook_secret: Option<String>,
}

fn required(name: &str) -> Result<String, String> {
    env::var(name).map_err(|_| format!("environment variable {name} is required"))
}

fn parse_key(hex_key: &str) -> Result<[u8; 32], String> {
    let bytes =
        hex::decode(hex_key.trim()).map_err(|_| "PHONE_ENCRYPTION_KEY must be hex".to_string())?;
    bytes.try_into().map_err(|_| {
        "PHONE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)".to_string()
    })
}

fn parse_bool(name: &str, default: bool) -> Result<bool, String> {
    match env::var(name) {
        Ok(v) => match v.trim().to_ascii_lowercase().as_str() {
            "1" | "true" | "yes" | "on" => Ok(true),
            "0" | "false" | "no" | "off" => Ok(false),
            _ => Err(format!("{name} must be true or false")),
        },
        Err(_) => Ok(default),
    }
}

fn parse_number<T>(name: &str, default: T) -> Result<T, String>
where
    T: std::str::FromStr,
{
    match env::var(name) {
        Ok(v) => v
            .trim()
            .parse::<T>()
            .map_err(|_| format!("{name} has an invalid numeric value")),
        Err(_) => Ok(default),
    }
}

fn parse_origins(raw: &str) -> Result<Vec<String>, String> {
    let mut origins = Vec::new();
    for origin in raw.split(',').map(str::trim).filter(|o| !o.is_empty()) {
        if !(origin.starts_with("http://") || origin.starts_with("https://")) {
            return Err(format!(
                "CORS_ALLOWED_ORIGINS contains an invalid origin: {origin}"
            ));
        }
        if !origins.iter().any(|existing| existing == origin) {
            origins.push(origin.to_string());
        }
    }
    Ok(origins)
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let cors_allowed_origins = parse_origins(
            &env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or_else(|_| "http://localhost:5174,http://127.0.0.1:5174".into()),
        )?;
        let login_rate_limit_per_minute = parse_number("LOGIN_RATE_LIMIT_PER_MINUTE", 10u32)?;
        let password_reset_rate_limit_per_minute =
            parse_number("PASSWORD_RESET_RATE_LIMIT_PER_MINUTE", 5u32)?;
        let password_reset_token_ttl_minutes =
            parse_number("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30i64)?;
        if login_rate_limit_per_minute == 0 || password_reset_rate_limit_per_minute == 0 {
            return Err("rate limits must be greater than zero".into());
        }
        if !(5..=24 * 60).contains(&password_reset_token_ttl_minutes) {
            return Err("PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 1440".into());
        }
        let session_ttl_hours = parse_number("SESSION_TTL_HOURS", 12i64)?;
        if !(1..=24 * 30).contains(&session_ttl_hours) {
            return Err("SESSION_TTL_HOURS must be between 1 and 720".into());
        }
        let max_upload_bytes = parse_number("MAX_UPLOAD_BYTES", 10 * 1024 * 1024usize)?;
        if !(1024..=50 * 1024 * 1024).contains(&max_upload_bytes) {
            return Err("MAX_UPLOAD_BYTES must be between 1024 and 52428800".into());
        }
        let storage_dir =
            PathBuf::from(env::var("STORAGE_DIR").unwrap_or_else(|_| "data/uploads".to_string()));
        if storage_dir.as_os_str().is_empty() {
            return Err("STORAGE_DIR must not be empty".into());
        }
        let sms_webhook_secret = env::var("SMS_WEBHOOK_SECRET")
            .ok()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty());

        Ok(Self {
            database_url: required("DATABASE_URL")?,
            bind_addr: env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            phone_key: parse_key(&required("PHONE_ENCRYPTION_KEY")?)?,
            session_ttl_hours,
            sms_provider: env::var("SMS_PROVIDER").unwrap_or_else(|_| "mock".into()),
            sms_max_attempts: parse_number("SMS_MAX_ATTEMPTS", 5i32)?,
            bootstrap_admin_email: env::var("BOOTSTRAP_ADMIN_EMAIL").ok(),
            bootstrap_admin_password: env::var("BOOTSTRAP_ADMIN_PASSWORD").ok(),
            cors_allowed_origins,
            trust_proxy_headers: parse_bool("TRUST_PROXY_HEADERS", false)?,
            login_rate_limit_per_minute,
            password_reset_rate_limit_per_minute,
            password_reset_token_ttl_minutes,
            password_reset_expose_token: parse_bool("PASSWORD_RESET_EXPOSE_TOKEN", false)?,
            storage_dir,
            max_upload_bytes,
            sms_webhook_secret,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::parse_key;

    #[test]
    fn key_must_be_32_hex_bytes() {
        assert!(parse_key(&"ab".repeat(32)).is_ok());
        assert!(parse_key(&"ab".repeat(31)).is_err());
        assert!(parse_key("not-hex").is_err());
    }
}
