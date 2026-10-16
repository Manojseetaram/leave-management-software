use std::env;

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
}

fn required(name: &str) -> Result<String, String> {
    env::var(name).map_err(|_| format!("environment variable {name} is required"))
}

fn parse_key(hex_key: &str) -> Result<[u8; 32], String> {
    let bytes = hex::decode(hex_key.trim()).map_err(|_| "PHONE_ENCRYPTION_KEY must be hex".to_string())?;
    bytes
        .try_into()
        .map_err(|_| "PHONE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)".to_string())
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            bind_addr: env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            phone_key: parse_key(&required("PHONE_ENCRYPTION_KEY")?)?,
            session_ttl_hours: env::var("SESSION_TTL_HOURS").ok().and_then(|v| v.parse().ok()).unwrap_or(12),
            sms_provider: env::var("SMS_PROVIDER").unwrap_or_else(|_| "mock".into()),
            sms_max_attempts: env::var("SMS_MAX_ATTEMPTS").ok().and_then(|v| v.parse().ok()).unwrap_or(5),
            bootstrap_admin_email: env::var("BOOTSTRAP_ADMIN_EMAIL").ok(),
            bootstrap_admin_password: env::var("BOOTSTRAP_ADMIN_PASSWORD").ok(),
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
