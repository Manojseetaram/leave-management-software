use async_trait::async_trait;
use std::sync::Mutex;

#[async_trait]
pub trait EmailSender: Send + Sync {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String>;
}

/// Development/test sender. Records messages in memory and never touches the network.
#[derive(Default)]
pub struct MockEmailSender {
    sent: Mutex<Vec<(String, String, String)>>,
}

impl MockEmailSender {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn sent(&self) -> Vec<(String, String, String)> {
        self.sent.lock().unwrap().clone()
    }
}

#[async_trait]
impl EmailSender for MockEmailSender {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        self.sent
            .lock()
            .unwrap()
            .push((to.to_string(), subject.to_string(), body.to_string()));
        Ok(())
    }
}

/// SMTP sender built on `lettre`. Configuration comes from environment variables:
/// SMTP_HOST, SMTP_PORT (default 587), SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM.
pub struct SmtpEmailSender {
    transport: lettre::AsyncSmtpTransport<lettre::Tokio1Executor>,
    from: lettre::message::Mailbox,
}

impl SmtpEmailSender {
    pub fn from_env() -> Result<Self, String> {
        use lettre::transport::smtp::authentication::Credentials;
        let host = std::env::var("SMTP_HOST")
            .map_err(|_| "SMTP_HOST is required when EMAIL_PROVIDER=smtp".to_string())?;
        let port: u16 = std::env::var("SMTP_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(587);
        let username = std::env::var("SMTP_USERNAME").ok();
        let password = std::env::var("SMTP_PASSWORD").ok();
        let from_addr = std::env::var("SMTP_FROM")
            .map_err(|_| "SMTP_FROM is required when EMAIL_PROVIDER=smtp".to_string())?;

        let mut builder =
            lettre::AsyncSmtpTransport::<lettre::Tokio1Executor>::starttls_relay(&host)
                .map_err(|e| format!("smtp relay: {e}"))?
                .port(port);
        if let (Some(u), Some(p)) = (username, password) {
            builder = builder.credentials(Credentials::new(u, p));
        }
        let transport = builder.build();
        let from: lettre::message::Mailbox = from_addr
            .parse()
            .map_err(|e| format!("invalid SMTP_FROM: {e}"))?;
        Ok(Self { transport, from })
    }
}

#[async_trait]
impl EmailSender for SmtpEmailSender {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        use lettre::{message::Message, AsyncTransport};
        let email = Message::builder()
            .from(self.from.clone())
            .to(to.parse().map_err(|e| format!("invalid recipient: {e}"))?)
            .subject(subject)
            .body(body.to_string())
            .map_err(|e| format!("build email: {e}"))?;
        self.transport
            .send(email)
            .await
            .map_err(|e| format!("smtp send: {e}"))?;
        Ok(())
    }
}

/// Selects an email sender from the environment. Defaults to a mock that records
/// messages in memory (development only).
pub fn sender_from_env() -> Result<std::sync::Arc<dyn EmailSender>, String> {
    match std::env::var("EMAIL_PROVIDER")
        .unwrap_or_else(|_| "mock".into())
        .as_str()
    {
        "mock" => Ok(std::sync::Arc::new(MockEmailSender::new())),
        "smtp" => Ok(std::sync::Arc::new(SmtpEmailSender::from_env()?)),
        other => Err(format!(
            "EMAIL_PROVIDER '{other}' is not implemented (use 'mock' or 'smtp')"
        )),
    }
}
