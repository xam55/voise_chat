use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use nexuschat_proto::{
    is_valid_friend_key, CreateOfferRequest, CreateOfferResponse, ErrorResponse, RegisterRequest,
    RegisterResponse, ResolveResponse, SessionState, SessionView, SubmitAnswerRequest,
    SubmitIceCandidateRequest,
};
use serde::Serialize;
use tokio::sync::RwLock;
use tracing::{info, warn};

const PRESENCE_TTL_SECONDS: u64 = 60;
const SESSION_TTL_SECONDS: u64 = 120;
const RATE_LIMIT_WINDOW_MS: u64 = 60_000;
const RATE_LIMIT_MAX_REQUESTS: u32 = 60;
const KEY_REGISTER_MIN_INTERVAL_MS: u64 = 2_000;

#[derive(Debug, Clone)]
struct Presence {
    endpoint: String,
    sdp_offer: Option<String>,
    expires_at_unix_ms: u64,
}

#[derive(Debug, Clone)]
struct Session {
    session_id: String,
    caller_key: String,
    callee_key: String,
    sdp_offer: String,
    sdp_answer: Option<String>,
    ice_candidates: Vec<String>,
    state: SessionState,
    created_at_unix_ms: u64,
    expires_at_unix_ms: u64,
}

#[derive(Debug, Clone)]
struct RateEntry {
    window_started_unix_ms: u64,
    count: u32,
}

#[derive(Default)]
struct Stats {
    total_requests: AtomicU64,
    register_requests: AtomicU64,
    resolve_requests: AtomicU64,
    session_requests: AtomicU64,
    rate_limited_requests: AtomicU64,
    active_peers: AtomicU64,
    active_sessions: AtomicU64,
}

#[derive(Serialize)]
struct MetricsResponse {
    total_requests: u64,
    register_requests: u64,
    resolve_requests: u64,
    session_requests: u64,
    rate_limited_requests: u64,
    active_peers: u64,
    active_sessions: u64,
    in_memory_peers: usize,
    in_memory_sessions: usize,
}

#[derive(Clone)]
struct AppState {
    peers: Arc<RwLock<HashMap<String, Presence>>>,
    sessions: Arc<RwLock<HashMap<String, Session>>>,
    rate_limits: Arc<RwLock<HashMap<String, RateEntry>>>,
    register_guards: Arc<RwLock<HashMap<String, u64>>>,
    stats: Arc<Stats>,
    session_seq: Arc<AtomicU64>,
    api_token: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .compact()
        .init();

    let state = AppState {
        peers: Arc::new(RwLock::new(HashMap::new())),
        sessions: Arc::new(RwLock::new(HashMap::new())),
        rate_limits: Arc::new(RwLock::new(HashMap::new())),
        register_guards: Arc::new(RwLock::new(HashMap::new())),
        stats: Arc::new(Stats::default()),
        session_seq: Arc::new(AtomicU64::new(1)),
        api_token: std::env::var("SIGNAL_API_TOKEN")
            .ok()
            .filter(|s| !s.trim().is_empty()),
    };

    spawn_cleanup(state.clone());

    let app = build_app(state);

    let addr: SocketAddr = if let Ok(bind_addr) = std::env::var("BIND_ADDR") {
        bind_addr.parse()?
    } else if let Ok(port) = std::env::var("PORT") {
        format!("0.0.0.0:{port}").parse()?
    } else {
        "0.0.0.0:8080".parse()?
    };

    info!(%addr, "signal server started");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/metrics", get(metrics))
        .route("/v1/register", post(register))
        .route("/v1/resolve/{key}", get(resolve))
        .route("/v1/sessions/offer", post(create_offer))
        .route("/v1/sessions/{id}/answer", post(submit_answer))
        .route("/v1/sessions/{id}/ice", post(submit_ice_candidate))
        .route("/v1/sessions/{id}", get(get_session))
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

async fn metrics(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    let in_memory_peers = state.peers.read().await.len();
    let in_memory_sessions = state.sessions.read().await.len();

    Json(MetricsResponse {
        total_requests: state.stats.total_requests.load(Ordering::Relaxed),
        register_requests: state.stats.register_requests.load(Ordering::Relaxed),
        resolve_requests: state.stats.resolve_requests.load(Ordering::Relaxed),
        session_requests: state.stats.session_requests.load(Ordering::Relaxed),
        rate_limited_requests: state.stats.rate_limited_requests.load(Ordering::Relaxed),
        active_peers: state.stats.active_peers.load(Ordering::Relaxed),
        active_sessions: state.stats.active_sessions.load(Ordering::Relaxed),
        in_memory_peers,
        in_memory_sessions,
    })
    .into_response()
}

async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    state.stats.total_requests.fetch_add(1, Ordering::Relaxed);
    state
        .stats
        .register_requests
        .fetch_add(1, Ordering::Relaxed);

    if !allow_request(&state, "global".to_string()).await {
        state
            .stats
            .rate_limited_requests
            .fetch_add(1, Ordering::Relaxed);
        return error(StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded");
    }

    if !is_valid_friend_key(&payload.key) {
        return error(
            StatusCode::BAD_REQUEST,
            "invalid key format, expected NX-XXXXXX",
        );
    }
    if is_register_spam(&state, &payload.key).await {
        return error(
            StatusCode::TOO_MANY_REQUESTS,
            "register spam protection triggered",
        );
    }

    let expires_at_unix_ms = now_unix_ms() + PRESENCE_TTL_SECONDS * 1000;

    {
        let mut peers = state.peers.write().await;
        peers.insert(
            payload.key.clone(),
            Presence {
                endpoint: payload.endpoint,
                sdp_offer: payload.sdp_offer,
                expires_at_unix_ms,
            },
        );
        state
            .stats
            .active_peers
            .store(peers.len() as u64, Ordering::Relaxed);
    }

    (
        StatusCode::OK,
        Json(RegisterResponse {
            ok: true,
            expires_in_seconds: PRESENCE_TTL_SECONDS,
        }),
    )
        .into_response()
}

async fn resolve(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(key): Path<String>,
) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    state.stats.total_requests.fetch_add(1, Ordering::Relaxed);
    state.stats.resolve_requests.fetch_add(1, Ordering::Relaxed);

    if !allow_request(&state, "global".to_string()).await {
        state
            .stats
            .rate_limited_requests
            .fetch_add(1, Ordering::Relaxed);
        return error(StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded");
    }

    if !is_valid_friend_key(&key) {
        return error(
            StatusCode::BAD_REQUEST,
            "invalid key format, expected NX-XXXXXX",
        );
    }

    let now = now_unix_ms();
    let maybe_presence = {
        let peers = state.peers.read().await;
        peers.get(&key).cloned()
    };

    match maybe_presence {
        Some(presence) if presence.expires_at_unix_ms > now => (
            StatusCode::OK,
            Json(ResolveResponse {
                key,
                endpoint: presence.endpoint,
                sdp_offer: presence.sdp_offer,
                expires_at_unix_ms: presence.expires_at_unix_ms,
            }),
        )
            .into_response(),
        _ => error(StatusCode::NOT_FOUND, "peer not found or expired"),
    }
}

async fn create_offer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateOfferRequest>,
) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    state.stats.total_requests.fetch_add(1, Ordering::Relaxed);
    state.stats.session_requests.fetch_add(1, Ordering::Relaxed);

    if !allow_request(&state, "global".to_string()).await {
        state
            .stats
            .rate_limited_requests
            .fetch_add(1, Ordering::Relaxed);
        return error(StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded");
    }

    if !is_valid_friend_key(&payload.caller_key) || !is_valid_friend_key(&payload.callee_key) {
        return error(
            StatusCode::BAD_REQUEST,
            "invalid key format, expected NX-XXXXXX",
        );
    }

    let now = now_unix_ms();
    let seq = state.session_seq.fetch_add(1, Ordering::Relaxed);
    let session_id = format!("sess-{}-{}", now, seq);

    let session = Session {
        session_id: session_id.clone(),
        caller_key: payload.caller_key,
        callee_key: payload.callee_key,
        sdp_offer: payload.sdp_offer,
        sdp_answer: None,
        ice_candidates: Vec::new(),
        state: SessionState::Connecting,
        created_at_unix_ms: now,
        expires_at_unix_ms: now + SESSION_TTL_SECONDS * 1000,
    };

    {
        let mut sessions = state.sessions.write().await;
        sessions.insert(session_id.clone(), session);
        state
            .stats
            .active_sessions
            .store(sessions.len() as u64, Ordering::Relaxed);
    }

    (
        StatusCode::OK,
        Json(CreateOfferResponse {
            session_id,
            state: SessionState::Connecting,
            created_at_unix_ms: now,
        }),
    )
        .into_response()
}

async fn submit_answer(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(session_id): Path<String>,
    Json(payload): Json<SubmitAnswerRequest>,
) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    state.stats.total_requests.fetch_add(1, Ordering::Relaxed);
    state.stats.session_requests.fetch_add(1, Ordering::Relaxed);

    if !allow_request(&state, "global".to_string()).await {
        state
            .stats
            .rate_limited_requests
            .fetch_add(1, Ordering::Relaxed);
        return error(StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded");
    }

    if !is_valid_friend_key(&payload.callee_key) {
        return error(
            StatusCode::BAD_REQUEST,
            "invalid key format, expected NX-XXXXXX",
        );
    }

    let now = now_unix_ms();
    let mut sessions = state.sessions.write().await;
    let Some(session) = sessions.get_mut(&session_id) else {
        return error(StatusCode::NOT_FOUND, "session not found");
    };

    if session.expires_at_unix_ms <= now {
        session.state = SessionState::Failed;
        return error(StatusCode::GONE, "session expired");
    }

    if session.callee_key != payload.callee_key {
        return error(StatusCode::FORBIDDEN, "callee key mismatch");
    }

    session.sdp_answer = Some(payload.sdp_answer);
    session.state = SessionState::Connected;

    (StatusCode::OK, Json(session_to_view(session))).into_response()
}

async fn submit_ice_candidate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(session_id): Path<String>,
    Json(payload): Json<SubmitIceCandidateRequest>,
) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    state.stats.total_requests.fetch_add(1, Ordering::Relaxed);
    state.stats.session_requests.fetch_add(1, Ordering::Relaxed);

    if !allow_request(&state, "global".to_string()).await {
        state
            .stats
            .rate_limited_requests
            .fetch_add(1, Ordering::Relaxed);
        return error(StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded");
    }

    if !is_valid_friend_key(&payload.from_key) {
        return error(
            StatusCode::BAD_REQUEST,
            "invalid key format, expected NX-XXXXXX",
        );
    }

    let mut sessions = state.sessions.write().await;
    let Some(session) = sessions.get_mut(&session_id) else {
        return error(StatusCode::NOT_FOUND, "session not found");
    };

    if payload.from_key != session.caller_key && payload.from_key != session.callee_key {
        return error(StatusCode::FORBIDDEN, "key is not part of this session");
    }

    session.ice_candidates.push(payload.candidate);

    (StatusCode::OK, Json(session_to_view(session))).into_response()
}

async fn get_session(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    if !is_authorized(&headers, &state) {
        return error(StatusCode::UNAUTHORIZED, "unauthorized");
    }

    state.stats.total_requests.fetch_add(1, Ordering::Relaxed);
    state.stats.session_requests.fetch_add(1, Ordering::Relaxed);

    if !allow_request(&state, "global".to_string()).await {
        state
            .stats
            .rate_limited_requests
            .fetch_add(1, Ordering::Relaxed);
        return error(StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded");
    }

    let sessions = state.sessions.read().await;
    let Some(session) = sessions.get(&session_id) else {
        return error(StatusCode::NOT_FOUND, "session not found");
    };

    (StatusCode::OK, Json(session_to_view(session))).into_response()
}

fn session_to_view(session: &Session) -> SessionView {
    SessionView {
        session_id: session.session_id.clone(),
        caller_key: session.caller_key.clone(),
        callee_key: session.callee_key.clone(),
        state: session.state.clone(),
        created_at_unix_ms: session.created_at_unix_ms,
        expires_at_unix_ms: session.expires_at_unix_ms,
        has_offer: !session.sdp_offer.is_empty(),
        has_answer: session.sdp_answer.is_some(),
        ice_candidates_count: session.ice_candidates.len(),
        sdp_offer: Some(session.sdp_offer.clone()),
        sdp_answer: session.sdp_answer.clone(),
    }
}

fn spawn_cleanup(state: AppState) {
    tokio::spawn(async move {
        let mut ticker = tokio::time::interval(Duration::from_secs(10));
        loop {
            ticker.tick().await;
            let now = now_unix_ms();

            {
                let mut peers = state.peers.write().await;
                let before = peers.len();
                peers.retain(|_, v| v.expires_at_unix_ms > now);
                let removed = before.saturating_sub(peers.len());
                state
                    .stats
                    .active_peers
                    .store(peers.len() as u64, Ordering::Relaxed);
                if removed > 0 {
                    warn!(removed, "expired peer entries removed");
                }
            }

            {
                let mut sessions = state.sessions.write().await;
                let before = sessions.len();
                sessions.retain(|_, v| v.expires_at_unix_ms > now);
                let removed = before.saturating_sub(sessions.len());
                state
                    .stats
                    .active_sessions
                    .store(sessions.len() as u64, Ordering::Relaxed);
                if removed > 0 {
                    warn!(removed, "expired sessions removed");
                }
            }

            {
                let mut rates = state.rate_limits.write().await;
                rates.retain(|_, entry| {
                    now.saturating_sub(entry.window_started_unix_ms) <= RATE_LIMIT_WINDOW_MS
                });
            }

            {
                let mut guards = state.register_guards.write().await;
                guards.retain(|_, seen| now.saturating_sub(*seen) <= RATE_LIMIT_WINDOW_MS);
            }
        }
    });
}

async fn allow_request(state: &AppState, client: String) -> bool {
    let now = now_unix_ms();
    let mut limits = state.rate_limits.write().await;
    let entry = limits.entry(client).or_insert(RateEntry {
        window_started_unix_ms: now,
        count: 0,
    });

    if now.saturating_sub(entry.window_started_unix_ms) > RATE_LIMIT_WINDOW_MS {
        entry.window_started_unix_ms = now;
        entry.count = 0;
    }

    if entry.count >= RATE_LIMIT_MAX_REQUESTS {
        return false;
    }

    entry.count += 1;
    true
}

async fn is_register_spam(state: &AppState, key: &str) -> bool {
    let now = now_unix_ms();
    let mut guards = state.register_guards.write().await;
    if let Some(last_seen) = guards.get(key).copied() {
        if now.saturating_sub(last_seen) < KEY_REGISTER_MIN_INTERVAL_MS {
            return true;
        }
    }
    guards.insert(key.to_string(), now);
    false
}

fn is_authorized(headers: &HeaderMap, state: &AppState) -> bool {
    let Some(expected) = &state.api_token else {
        return true;
    };

    headers
        .get("x-nexus-token")
        .and_then(|v| v.to_str().ok())
        .map(|provided| provided == expected)
        .unwrap_or(false)
}

fn error(status: StatusCode, message: &str) -> axum::response::Response {
    (
        status,
        Json(ErrorResponse {
            error: message.to_string(),
        }),
    )
        .into_response()
}

fn now_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use tower::ServiceExt;

    fn test_state() -> AppState {
        AppState {
            peers: Arc::new(RwLock::new(HashMap::new())),
            sessions: Arc::new(RwLock::new(HashMap::new())),
            rate_limits: Arc::new(RwLock::new(HashMap::new())),
            register_guards: Arc::new(RwLock::new(HashMap::new())),
            stats: Arc::new(Stats::default()),
            session_seq: Arc::new(AtomicU64::new(1)),
            api_token: None,
        }
    }

    #[tokio::test]
    async fn register_then_resolve_works() {
        let app = build_app(test_state());

        let register_body = serde_json::json!({
            "key": "NX-ABC123",
            "endpoint": "203.0.113.10:5555",
            "sdp_offer": null
        });

        let register_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/register")
                    .header("content-type", "application/json")
                    .body(Body::from(register_body.to_string()))
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(register_resp.status(), StatusCode::OK);

        let resolve_resp = app
            .oneshot(
                Request::builder()
                    .uri("/v1/resolve/NX-ABC123")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(resolve_resp.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn session_offer_then_answer_changes_state() {
        let app = build_app(test_state());

        let offer_body = serde_json::json!({
            "caller_key": "NX-AAAA11",
            "callee_key": "NX-BBBB22",
            "sdp_offer": "v=0..."
        });

        let offer_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/sessions/offer")
                    .header("content-type", "application/json")
                    .body(Body::from(offer_body.to_string()))
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(offer_resp.status(), StatusCode::OK);

        let body = axum::body::to_bytes(offer_resp.into_body(), 1024 * 64)
            .await
            .expect("bytes");
        let created: CreateOfferResponse =
            serde_json::from_slice(&body).expect("valid create offer response");

        let answer_body = serde_json::json!({
            "callee_key": "NX-BBBB22",
            "sdp_answer": "v=0...answer"
        });

        let answer_resp = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/v1/sessions/{}/answer", created.session_id))
                    .header("content-type", "application/json")
                    .body(Body::from(answer_body.to_string()))
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(answer_resp.status(), StatusCode::OK);

        let status_resp = app
            .oneshot(
                Request::builder()
                    .uri(format!("/v1/sessions/{}", created.session_id))
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(status_resp.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn concurrent_register_load_has_no_server_errors() {
        let app = build_app(test_state());
        let mut tasks = Vec::new();

        for i in 0..120_u32 {
            let app_cl = app.clone();
            tasks.push(tokio::spawn(async move {
                let key = format!("NX-A{:05}", i);
                let body = serde_json::json!({
                    "key": key,
                    "endpoint": "127.0.0.1:5000",
                    "sdp_offer": null
                });
                app_cl
                    .oneshot(
                        Request::builder()
                            .method("POST")
                            .uri("/v1/register")
                            .header("content-type", "application/json")
                            .body(Body::from(body.to_string()))
                            .expect("request"),
                    )
                    .await
                    .expect("response")
                    .status()
            }));
        }

        for task in tasks {
            let status = task.await.expect("join");
            assert!(
                status == StatusCode::OK || status == StatusCode::TOO_MANY_REQUESTS,
                "unexpected status under load: {}",
                status
            );
        }
    }
}
