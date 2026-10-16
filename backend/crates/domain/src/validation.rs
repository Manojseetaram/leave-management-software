use crate::error::{DomainError, DomainResult};
use chrono::{DateTime, Duration, Utc};

fn invalid<T>(msg: impl Into<String>) -> DomainResult<T> {
    Err(DomainError::Validation(msg.into()))
}

pub fn require_text(field: &str, value: &str, max: usize) -> DomainResult<String> {
    let t = value.trim();
    if t.is_empty() {
        return invalid(format!("{field} is required"));
    }
    if t.chars().count() > max {
        return invalid(format!("{field} must be at most {max} characters"));
    }
    Ok(t.to_string())
}

pub fn optional_text(field: &str, value: Option<&str>, max: usize) -> DomainResult<Option<String>> {
    match value.map(str::trim) {
        None | Some("") => Ok(None),
        Some(v) => require_text(field, v, max).map(Some),
    }
}

pub fn validate_password(pw: &str) -> DomainResult<()> {
    let n = pw.chars().count();
    if n < 10 {
        return invalid("password must be at least 10 characters");
    }
    if n > 128 {
        return invalid("password must be at most 128 characters");
    }
    Ok(())
}

pub fn validate_email(email: &str) -> DomainResult<String> {
    let e = email.trim().to_lowercase();
    let ok = e.len() <= 254
        && !e.chars().any(char::is_whitespace)
        && e.split_once('@')
            .map(|(local, domain)| {
                !local.is_empty()
                    && !domain.contains('@')
                    && domain.contains('.')
                    && !domain.starts_with('.')
                    && !domain.ends_with('.')
            })
            .unwrap_or(false);
    if ok {
        Ok(e)
    } else {
        invalid("email is not valid")
    }
}

/// Register numbers are stored upper-case, 3-20 alphanumeric characters.
pub fn validate_register_number(value: &str) -> DomainResult<String> {
    let v = value.trim().to_uppercase();
    if (3..=20).contains(&v.len()) && v.chars().all(|c| c.is_ascii_alphanumeric()) {
        Ok(v)
    } else {
        invalid("register_number must be 3-20 letters/digits")
    }
}

pub fn validate_semester(semester: i16) -> DomainResult<i16> {
    if (1..=12).contains(&semester) {
        Ok(semester)
    } else {
        invalid("semester must be between 1 and 12")
    }
}

/// Accepts `9876543210`, `98765 43210`, `+919876543210`, `09876543210`, `919876543210`.
/// Returns the canonical `+91XXXXXXXXXX` form.
pub fn normalize_indian_mobile(raw: &str) -> DomainResult<String> {
    let digits: String = raw
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .collect();
    let rest = if let Some(r) = digits.strip_prefix("+91") {
        r
    } else if digits.len() == 12 && digits.starts_with("91") {
        &digits[2..]
    } else if digits.len() == 11 && digits.starts_with('0') {
        &digits[1..]
    } else {
        digits.as_str()
    };
    let valid = rest.len() == 10
        && rest.chars().all(|c| c.is_ascii_digit())
        && matches!(rest.as_bytes()[0], b'6'..=b'9');
    if valid {
        Ok(format!("+91{rest}"))
    } else {
        invalid("phone must be a valid 10-digit Indian mobile number")
    }
}

/// Validates the text fields and date range of a leave request.
pub fn validate_leave(
    reason: &str,
    destination: Option<&str>,
    start_at: DateTime<Utc>,
    end_at: DateTime<Utc>,
) -> DomainResult<(String, Option<String>)> {
    let reason = require_text("reason", reason, 2000)?;
    let destination = optional_text("destination", destination, 200)?;
    if end_at <= start_at {
        return invalid("end_at must be after start_at");
    }
    if end_at - start_at > Duration::days(365) {
        return invalid("a request cannot span more than 365 days");
    }
    Ok((reason, destination))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn t(d: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2030, 1, d, 9, 0, 0).unwrap()
    }

    #[test]
    fn text_is_trimmed_and_bounded() {
        assert_eq!(require_text("x", "  hi  ", 5).unwrap(), "hi");
        assert!(require_text("x", "   ", 5).is_err());
        assert!(require_text("x", "toolong", 3).is_err());
    }

    #[test]
    fn password_length_rules() {
        assert!(validate_password("short").is_err());
        assert!(validate_password("long-enough-1").is_ok());
        assert!(validate_password(&"a".repeat(129)).is_err());
    }

    #[test]
    fn email_rules() {
        assert_eq!(validate_email(" A@B.edu ").unwrap(), "a@b.edu");
        for bad in ["", "a", "a@b", "@b.com", "a@@b.com", "a b@c.com", "a@.com", "a@b."] {
            assert!(validate_email(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn register_number_rules() {
        assert_eq!(validate_register_number(" 1ab22is001 ").unwrap(), "1AB22IS001");
        assert!(validate_register_number("ab").is_err());
        assert!(validate_register_number("1AB-22").is_err());
    }

    #[test]
    fn indian_mobile_normalization() {
        for ok in ["9876543210", "98765 43210", "+919876543210", "09876543210", "919876543210", "98765-43210"] {
            assert_eq!(normalize_indian_mobile(ok).unwrap(), "+919876543210", "{ok}");
        }
        for bad in ["", "12345", "5876543210", "98765432101", "+449876543210", "98765abcde"] {
            assert!(normalize_indian_mobile(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn leave_dates_must_be_ordered_and_bounded() {
        assert!(validate_leave("fever", None, t(2), t(3)).is_ok());
        assert!(validate_leave("fever", None, t(3), t(3)).is_err());
        assert!(validate_leave("fever", None, t(4), t(3)).is_err());
        let far = t(2) + Duration::days(400);
        assert!(validate_leave("fever", None, t(2), far).is_err());
        assert!(validate_leave("  ", None, t(2), t(3)).is_err());
    }
}
