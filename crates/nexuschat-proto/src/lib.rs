use serde::{Deserialize, Serialize};

pub const KEY_PREFIX: &str = "NX";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub key: String,
    pub endpoint: String,
    pub sdp_offer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub ok: bool,
    pub expires_in_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolveResponse {
    pub key: String,
    pub endpoint: String,
    pub sdp_offer: Option<String>,
    pub expires_at_unix_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionState {
    Connecting,
    Connected,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOfferRequest {
    pub caller_key: String,
    pub callee_key: String,
    pub sdp_offer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOfferResponse {
    pub session_id: String,
    pub state: SessionState,
    pub created_at_unix_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitAnswerRequest {
    pub callee_key: String,
    pub sdp_answer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitIceCandidateRequest {
    pub from_key: String,
    pub candidate: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionView {
    pub session_id: String,
    pub caller_key: String,
    pub callee_key: String,
    pub state: SessionState,
    pub created_at_unix_ms: u64,
    pub expires_at_unix_ms: u64,
    pub has_offer: bool,
    pub has_answer: bool,
    pub ice_candidates_count: usize,
    pub sdp_offer: Option<String>,
    pub sdp_answer: Option<String>,
}

pub fn is_valid_friend_key(key: &str) -> bool {
    let mut parts = key.split('-');
    let Some(prefix) = parts.next() else {
        return false;
    };
    let Some(body) = parts.next() else {
        return false;
    };
    if parts.next().is_some() {
        return false;
    }

    prefix == KEY_PREFIX
        && body.len() == 6
        && body
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
}
