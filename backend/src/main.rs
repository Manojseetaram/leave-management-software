mod config;

use service::{
    context::{Core, Settings},
    notifications::MockSmsProvider,
};
use std::{sync::Arc, time::Duration};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,sqlx=warn".into()),
        )
        .init();

    if let Err(e) = run().await {
        eprintln!("fatal: {e}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), String> {
    let cfg = config::Config::from_env()?;

    let pool = repository::connect(&cfg.database_url, 10)
        .await
        .map_err(|e| format!("database: {e}"))?;
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("migrations: {e}"))?;

    // Only the mock provider exists so far. A real gateway adapter implements
    // `service::notifications::SmsProvider` and is selected here.
    let sms = match cfg.sms_provider.as_str() {
        "mock" => Arc::new(MockSmsProvider::default()),
        other => {
            return Err(format!(
                "SMS_PROVIDER '{other}' is not implemented yet (use 'mock')"
            ))
        }
    };

    let core = Core::new(
        pool,
        Settings {
            phone_key: cfg.phone_key,
            session_ttl_hours: cfg.session_ttl_hours,
            sms_max_attempts: cfg.sms_max_attempts,
        },
        sms,
    );

    if let (Some(email), Some(password)) =
        (&cfg.bootstrap_admin_email, &cfg.bootstrap_admin_password)
    {
        match service::users::bootstrap_admin(&core, email, password, "Department Admin").await {
            Ok(true) => tracing::info!(
                "bootstrap admin created; it must change its password on first login"
            ),
            Ok(false) => tracing::info!("users already exist; bootstrap skipped"),
            Err(e) => return Err(format!("bootstrap admin: {e}")),
        }
    }

    // Background SMS dispatcher.
    let worker_core = core.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) = service::notifications::process_batch(&worker_core, 20).await {
                tracing::error!("sms dispatcher error: {e}");
            }
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });

    let app = api::router::build_router(core);
    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr)
        .await
        .map_err(|e| format!("bind {}: {e}", cfg.bind_addr))?;
    tracing::info!("listening on {}", cfg.bind_addr);
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .map_err(|e| e.to_string())
}
