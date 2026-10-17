use aes_gcm::{
    aead::{Aead, AeadCore, OsRng},
    Aes256Gcm, KeyInit, Nonce,
};
use argon2::{
    password_hash::{
        rand_core::OsRng as PwOsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
    },
    Argon2,
};
use domain::error::{DomainError, DomainResult};
use rand::{distributions::Alphanumeric, Rng, RngCore};
use sha2::{Digest, Sha256};

fn internal(e: impl ToString) -> DomainError {
    DomainError::Internal(e.to_string())
}

// ---- passwords (Argon2id) ----

pub fn hash_password_sync(password: &str) -> DomainResult<String> {
    let salt = SaltString::generate(&mut PwOsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(internal)
}

pub fn verify_password_sync(password: &str, hash: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}

/// Argon2 is deliberately slow, so it runs off the async executor threads.
pub async fn hash_password(password: String) -> DomainResult<String> {
    tokio::task::spawn_blocking(move || hash_password_sync(&password))
        .await
        .map_err(internal)?
}

pub async fn verify_password(password: String, hash: String) -> DomainResult<bool> {
    tokio::task::spawn_blocking(move || verify_password_sync(&password, &hash))
        .await
        .map_err(internal)
}

/// Spends roughly the same time as a real verification, so an unknown login
/// is not distinguishable from a wrong password by response time.
pub async fn burn_password_time(password: String) {
    let _ = hash_password(password).await;
}

// ---- session tokens ----

pub fn new_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

pub fn hash_token(token: &str) -> Vec<u8> {
    Sha256::digest(token.as_bytes()).to_vec()
}

pub fn temporary_password() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect()
}

// ---- field encryption (parent phone numbers) ----

/// Output layout: 12-byte random nonce || ciphertext+tag.
pub fn encrypt(key: &[u8; 32], plaintext: &str) -> DomainResult<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(internal)?;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let mut ct = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(internal)?;
    let mut out = nonce.to_vec();
    out.append(&mut ct);
    Ok(out)
}

pub fn decrypt(key: &[u8; 32], data: &[u8]) -> DomainResult<String> {
    if data.len() < 13 {
        return Err(DomainError::Internal("ciphertext too short".into()));
    }
    let (nonce, ct) = data.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(internal)?;
    let pt = cipher
        .decrypt(Nonce::from_slice(nonce), ct)
        .map_err(internal)?;
    String::from_utf8(pt).map_err(internal)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_hash_is_argon2id_and_verifies() {
        let h = hash_password_sync("correct horse battery").unwrap();
        assert!(h.starts_with("$argon2id$"));
        assert!(verify_password_sync("correct horse battery", &h));
        assert!(!verify_password_sync("wrong", &h));
        assert!(!verify_password_sync("x", "not-a-hash"));
    }

    #[test]
    fn same_password_gets_different_salts() {
        assert_ne!(
            hash_password_sync("same-password-1").unwrap(),
            hash_password_sync("same-password-1").unwrap()
        );
    }

    #[test]
    fn tokens_are_unique_and_hash_is_stable() {
        let (a, b) = (new_token(), new_token());
        assert_eq!(a.len(), 64);
        assert_ne!(a, b);
        assert_eq!(hash_token(&a), hash_token(&a));
        assert_ne!(hash_token(&a), hash_token(&b));
    }

    #[test]
    fn temporary_passwords_are_long_enough_and_random() {
        let (a, b) = (temporary_password(), temporary_password());
        assert_eq!(a.len(), 16);
        assert_ne!(a, b);
    }

    #[test]
    fn encryption_round_trip_hides_plaintext() {
        let key = [9u8; 32];
        let ct = encrypt(&key, "+919876543210").unwrap();
        assert!(!ct.windows(10).any(|w| w == b"9876543210"));
        assert_eq!(decrypt(&key, &ct).unwrap(), "+919876543210");
        assert_ne!(
            ct,
            encrypt(&key, "+919876543210").unwrap(),
            "nonce must differ"
        );
    }

    #[test]
    fn tampering_and_wrong_key_are_detected() {
        let key = [9u8; 32];
        let mut ct = encrypt(&key, "+919876543210").unwrap();
        assert!(decrypt(&[1u8; 32], &ct).is_err());
        let last = ct.len() - 1;
        ct[last] ^= 1;
        assert!(decrypt(&key, &ct).is_err());
        assert!(decrypt(&key, &[0u8; 5]).is_err());
    }
}
