use std::{fs, future::Future, path::PathBuf, time::Duration};

use anyhow::{anyhow, Context};
use clap::{Parser, Subcommand};
use nexuschat_proto::{
    is_valid_friend_key, CreateOfferRequest, RegisterRequest, ResolveResponse, SessionState,
    SessionView, SubmitAnswerRequest, SubmitIceCandidateRequest, KEY_PREFIX,
};
use rand::distr::{Alphanumeric, SampleString};
use serde::{Deserialize, Serialize};
use serde_json::Value;

mod audio_fx;
mod audio_probe;
mod jitter_buffer;
mod opus_codec;
mod webrtc_bootstrap;

#[derive(Debug, Parser)]
#[command(name = "nexuschat-client")]
#[command(about = "nizamvoice bootstrap CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    Init,
    ShowKey,
    AddFriend {
        name: String,
        key: String,
    },
    RemoveFriend {
        key: String,
    },
    SearchFriends {
        query: String,
    },
    ListFriends,
    RegisterSelf {
        #[arg(long)]
        server: String,
        #[arg(long)]
        endpoint: String,
        #[arg(long)]
        sdp_offer: Option<String>,
    },
    Resolve {
        #[arg(long)]
        server: String,
        key: String,
    },
    CreateOffer {
        #[arg(long)]
        server: String,
        callee_key: String,
        sdp_offer: String,
    },
    SubmitAnswer {
        #[arg(long)]
        server: String,
        session_id: String,
        callee_key: String,
        sdp_answer: String,
    },
    AddIce {
        #[arg(long)]
        server: String,
        session_id: String,
        from_key: String,
        candidate: String,
    },
    WatchSession {
        #[arg(long)]
        server: String,
        session_id: String,
        #[arg(long, default_value_t = 10)]
        retries: u32,
        #[arg(long, default_value_t = 1000)]
        delay_ms: u64,
    },
    WebrtcOffer,
    WebrtcAnswer {
        offer_sdp: String,
    },
    CreateWebrtcOfferSession {
        #[arg(long)]
        server: String,
        callee_key: String,
    },
    AcceptWebrtcSession {
        #[arg(long)]
        server: String,
        session_id: String,
        callee_key: String,
    },
    AudioDevices,
    MicProbe {
        #[arg(long, default_value_t = 3)]
        seconds: u64,
    },
    SpeakerProbe {
        #[arg(long, default_value_t = 2)]
        seconds: u64,
    },
    OpusSelftest {
        #[arg(long, default_value_t = 2)]
        seconds: u64,
    },
    P2pAudioSelftest {
        #[arg(long, default_value_t = 3)]
        seconds: u64,
        #[arg(long, default_value_t = 1.0)]
        gain: f32,
        #[arg(long, default_value_t = 0.0)]
        drop_rate: f32,
    },
    AudioFxSelftest {
        #[arg(long, default_value_t = 2)]
        seconds: u64,
        #[arg(long, default_value_t = 1.2)]
        gain: f32,
        #[arg(long, default_value_t = 0.6)]
        echo_attenuation: f32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Friend {
    name: String,
    key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClientState {
    my_key: String,
    friends: Vec<Friend>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Init => {
            let path = state_path()?;
            if path.exists() {
                println!("State already initialized: {}", path.display());
                return Ok(());
            }
            let state = ClientState {
                my_key: generate_friend_key(),
                friends: Vec::new(),
            };
            save_state(&state)?;
            println!("Initialized. My key: {}", state.my_key);
        }
        Commands::ShowKey => {
            let state = load_state()?;
            println!("{}", mask_key(&state.my_key));
        }
        Commands::AddFriend { name, key } => {
            let mut state = load_state()?;
            match add_friend(&mut state, name, &key) {
                Ok(()) => {
                    save_state(&state)?;
                    println!("Friend added");
                }
                Err(err) => {
                    println!("{}", err);
                }
            }
        }
        Commands::RemoveFriend { key } => {
            let mut state = load_state()?;
            if remove_friend(&mut state, &key)? {
                save_state(&state)?;
                println!("Friend removed: {}", key.trim().to_ascii_uppercase());
            } else {
                println!("Friend not found: {}", key.trim().to_ascii_uppercase());
            }
        }
        Commands::SearchFriends { query } => {
            let state = load_state()?;
            let matches = search_friends(&state, &query);
            if matches.is_empty() {
                println!("No matches for '{}'", query);
            } else {
                for (i, friend) in matches.iter().enumerate() {
                    println!("{}. {} ({})", i + 1, friend.name, friend.key);
                }
            }
        }
        Commands::ListFriends => {
            let state = load_state()?;
            if state.friends.is_empty() {
                println!("No friends yet");
            } else {
                for (i, f) in state.friends.iter().enumerate() {
                    println!("{}. {} ({})", i + 1, f.name, f.key);
                }
            }
        }
        Commands::RegisterSelf {
            server,
            endpoint,
            sdp_offer,
        } => {
            let state = load_state()?;
            let client = reqwest::Client::new();
            let url = format!("{}/v1/register", server.trim_end_matches('/'));
            let payload = RegisterRequest {
                key: state.my_key,
                endpoint,
                sdp_offer,
            };
            let resp = client.post(url).json(&payload);
            let resp = send_with_retry(
                || async { resp.try_clone().expect("clone request").send().await },
                "register-self",
                4,
                300,
            )
            .await
            .context("failed to call signal server with retries")?;
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            log_http_result("register-self", status, &body);
        }
        Commands::Resolve { server, key } => {
            let key = key.trim().to_ascii_uppercase();
            if !is_valid_friend_key(&key) {
                return Err(anyhow!("invalid key format, expected NX-XXXXXX"));
            }
            let client = reqwest::Client::new();
            let url = format!("{}/v1/resolve/{}", server.trim_end_matches('/'), key);
            let request = client.get(url);
            let resp = send_with_retry(
                || async { request.try_clone().expect("clone request").send().await },
                "resolve",
                4,
                300,
            )
            .await
            .context("failed to call signal server with retries")?;

            let status = resp.status();
            if status.is_success() {
                let resolved = resp.json::<ResolveResponse>().await?;
                println!(
                    "Resolved: key={} endpoint={} expires_at_unix_ms={}",
                    mask_key(&resolved.key),
                    resolved.endpoint,
                    resolved.expires_at_unix_ms
                );
            } else {
                let body = resp.text().await.unwrap_or_default();
                println!("resolve failed: {} {}", status, body);
            }
        }
        Commands::CreateOffer {
            server,
            callee_key,
            sdp_offer,
        } => {
            let state = load_state()?;
            let callee_key = normalize_key(&callee_key)?;
            let payload = CreateOfferRequest {
                caller_key: state.my_key,
                callee_key,
                sdp_offer,
            };
            let client = reqwest::Client::new();
            let url = format!("{}/v1/sessions/offer", server.trim_end_matches('/'));
            let request = client.post(url).json(&payload);
            let resp = send_with_retry(
                || async { request.try_clone().expect("clone request").send().await },
                "create-offer",
                4,
                300,
            )
            .await?;
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            log_http_result("create-offer", status, &body);
        }
        Commands::SubmitAnswer {
            server,
            session_id,
            callee_key,
            sdp_answer,
        } => {
            let callee_key = normalize_key(&callee_key)?;
            let payload = SubmitAnswerRequest {
                callee_key,
                sdp_answer,
            };
            let client = reqwest::Client::new();
            let url = format!(
                "{}/v1/sessions/{}/answer",
                server.trim_end_matches('/'),
                session_id
            );
            let request = client.post(url).json(&payload);
            let resp = send_with_retry(
                || async { request.try_clone().expect("clone request").send().await },
                "submit-answer",
                4,
                300,
            )
            .await?;
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            log_http_result("submit-answer", status, &body);
        }
        Commands::AddIce {
            server,
            session_id,
            from_key,
            candidate,
        } => {
            let from_key = normalize_key(&from_key)?;
            let payload = SubmitIceCandidateRequest {
                from_key,
                candidate,
            };
            let client = reqwest::Client::new();
            let url = format!(
                "{}/v1/sessions/{}/ice",
                server.trim_end_matches('/'),
                session_id
            );
            let request = client.post(url).json(&payload);
            let resp = send_with_retry(
                || async { request.try_clone().expect("clone request").send().await },
                "add-ice",
                4,
                300,
            )
            .await?;
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            log_http_result("add-ice", status, &body);
        }
        Commands::WatchSession {
            server,
            session_id,
            retries,
            delay_ms,
        } => {
            let client = reqwest::Client::new();
            for attempt in 1..=retries {
                let url = format!(
                    "{}/v1/sessions/{}",
                    server.trim_end_matches('/'),
                    session_id
                );
                let request = client.get(url);
                let resp = match send_with_retry(
                    || async { request.try_clone().expect("clone request").send().await },
                    "watch-session",
                    3,
                    250,
                )
                .await
                {
                    Ok(resp) => resp,
                    Err(err) => {
                        println!(
                            "attempt={} РїСЂРѕР±Р»РµРјР° СЃРµС‚Рё, РїРµСЂРµРїРѕРґРєР»СЋС‡Р°РµРј... reason={}",
                            attempt, err
                        );
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        continue;
                    }
                };
                if resp.status().is_success() {
                    let view = resp.json::<SessionView>().await?;
                    println!(
                        "attempt={} state={:?} has_answer={} ice_candidates={} expires_at={}",
                        attempt,
                        view.state,
                        view.has_answer,
                        view.ice_candidates_count,
                        view.expires_at_unix_ms
                    );

                    if matches!(view.state, SessionState::Connected | SessionState::Failed) {
                        if matches!(view.state, SessionState::Connected) {
                            println!("РЎРѕРµРґРёРЅРµРЅРёРµ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРѕ");
                        }
                        break;
                    }
                } else {
                    let status = resp.status();
                    let body = resp.text().await.unwrap_or_default();
                    println!("attempt={} failed: {} {}", attempt, status, body);
                }

                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }
        }
        Commands::WebrtcOffer => {
            let sdp = webrtc_bootstrap::create_offer_sdp().await?;
            println!("{}", sdp);
        }
        Commands::WebrtcAnswer { offer_sdp } => {
            let sdp = webrtc_bootstrap::create_answer_sdp(&offer_sdp).await?;
            println!("{}", sdp);
        }
        Commands::CreateWebrtcOfferSession { server, callee_key } => {
            let state = load_state()?;
            let callee_key = normalize_key(&callee_key)?;
            let sdp_offer = webrtc_bootstrap::create_offer_sdp().await?;
            let payload = CreateOfferRequest {
                caller_key: state.my_key,
                callee_key,
                sdp_offer,
            };
            let client = reqwest::Client::new();
            let url = format!("{}/v1/sessions/offer", server.trim_end_matches('/'));
            let resp = client.post(url).json(&payload).send().await?;
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            println!("status={} body={}", status, body);
        }
        Commands::AcceptWebrtcSession {
            server,
            session_id,
            callee_key,
        } => {
            let callee_key = normalize_key(&callee_key)?;
            let client = reqwest::Client::new();
            let session = get_session_from_server(&client, &server, &session_id).await?;
            let Some(offer_sdp) = session.sdp_offer else {
                return Err(anyhow!("session has no sdp_offer"));
            };
            let sdp_answer = webrtc_bootstrap::create_answer_sdp(&offer_sdp).await?;
            let payload = SubmitAnswerRequest {
                callee_key,
                sdp_answer,
            };
            let url = format!(
                "{}/v1/sessions/{}/answer",
                server.trim_end_matches('/'),
                session_id
            );
            let request = client.post(url).json(&payload);
            let resp = send_with_retry(
                || async { request.try_clone().expect("clone request").send().await },
                "accept-session",
                4,
                300,
            )
            .await?;
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            log_http_result("accept-session", status, &body);
        }
        Commands::AudioDevices => {
            audio_probe::list_audio_devices()?;
        }
        Commands::MicProbe { seconds } => {
            audio_probe::mic_probe(seconds)?;
        }
        Commands::SpeakerProbe { seconds } => {
            audio_probe::speaker_probe(seconds)?;
        }
        Commands::OpusSelftest { seconds } => {
            opus_codec::opus_selftest(seconds)?;
        }
        Commands::P2pAudioSelftest {
            seconds,
            gain,
            drop_rate,
        } => {
            webrtc_bootstrap::p2p_audio_selftest(seconds, gain, drop_rate).await?;
        }
        Commands::AudioFxSelftest {
            seconds,
            gain,
            echo_attenuation,
        } => {
            audio_fx::audio_fx_selftest(seconds, gain, echo_attenuation);
        }
    }

    Ok(())
}

fn state_path() -> anyhow::Result<PathBuf> {
    let mut dir =
        dirs::data_local_dir().ok_or_else(|| anyhow!("cannot resolve local app data dir"))?;
    dir.push("nexuschat");
    fs::create_dir_all(&dir)?;
    dir.push("client_state.json");
    Ok(dir)
}

fn load_state() -> anyhow::Result<ClientState> {
    let path = state_path()?;
    let raw = fs::read_to_string(&path)
        .with_context(|| format!("state not found at {}. Run `init` first", path.display()))?;
    let state = serde_json::from_str::<ClientState>(&raw)?;
    Ok(state)
}

fn save_state(state: &ClientState) -> anyhow::Result<()> {
    let path = state_path()?;
    let raw = serde_json::to_string_pretty(state)?;
    fs::write(path, raw)?;
    Ok(())
}

fn generate_friend_key() -> String {
    let mut rng = rand::rng();
    let body = Alphanumeric.sample_string(&mut rng, 6).to_ascii_uppercase();
    format!("{}-{}", KEY_PREFIX, body)
}

fn normalize_key(key: &str) -> anyhow::Result<String> {
    let normalized = key.trim().to_ascii_uppercase();
    if !is_valid_friend_key(&normalized) {
        return Err(anyhow!("invalid key format, expected NX-XXXXXX"));
    }
    Ok(normalized)
}

async fn get_session_from_server(
    client: &reqwest::Client,
    server: &str,
    session_id: &str,
) -> anyhow::Result<SessionView> {
    let url = format!(
        "{}/v1/sessions/{}",
        server.trim_end_matches('/'),
        session_id
    );
    let req = client.get(url);
    let resp = send_with_retry(
        || async { req.try_clone().expect("clone request").send().await },
        "get-session",
        4,
        300,
    )
    .await
    .context("failed to fetch session with retries")?;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(anyhow!("fetch session failed: {} {}", status, body));
    }
    Ok(resp.json::<SessionView>().await?)
}

fn add_friend(state: &mut ClientState, name: String, key: &str) -> anyhow::Result<()> {
    let key = normalize_key(key)?;
    if state.friends.iter().any(|f| f.key == key) {
        return Err(anyhow!("Friend with key {} already exists", key));
    }
    state.friends.push(Friend { name, key });
    Ok(())
}

fn remove_friend(state: &mut ClientState, key: &str) -> anyhow::Result<bool> {
    let key = normalize_key(key)?;
    let before = state.friends.len();
    state.friends.retain(|f| f.key != key);
    Ok(state.friends.len() != before)
}

fn search_friends<'a>(state: &'a ClientState, query: &str) -> Vec<&'a Friend> {
    let query_lc = query.to_lowercase();
    state
        .friends
        .iter()
        .filter(|friend| {
            friend.name.to_lowercase().contains(&query_lc)
                || friend.key.to_lowercase().contains(&query_lc)
        })
        .collect()
}

async fn send_with_retry<F, Fut>(
    mut op: F,
    op_name: &str,
    max_retries: u32,
    base_delay_ms: u64,
) -> anyhow::Result<reqwest::Response>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = reqwest::Result<reqwest::Response>>,
{
    let mut attempt = 0_u32;
    loop {
        attempt += 1;
        match op().await {
            Ok(resp) if resp.status().is_server_error() && attempt <= max_retries => {
                let delay = retry_delay_ms(base_delay_ms, attempt);
                println!(
                    "{}: server {} on attempt {}, retrying in {}ms",
                    op_name,
                    resp.status(),
                    attempt,
                    delay
                );
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }
            Ok(resp) => return Ok(resp),
            Err(err) if attempt <= max_retries => {
                let delay = retry_delay_ms(base_delay_ms, attempt);
                println!(
                    "{}: transient network error on attempt {} ({}), retrying in {}ms",
                    op_name, attempt, err, delay
                );
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }
            Err(err) => return Err(anyhow!("{} failed after retries: {}", op_name, err)),
        }
    }
}

fn retry_delay_ms(base_delay_ms: u64, attempt: u32) -> u64 {
    let factor = 1_u64 << (attempt.saturating_sub(1).min(5));
    (base_delay_ms * factor).min(8_000)
}

fn mask_key(key: &str) -> String {
    if key.len() <= 4 {
        return "***".to_string();
    }
    let prefix = &key[..3.min(key.len())];
    let suffix = &key[key.len().saturating_sub(2)..];
    format!("{}***{}", prefix, suffix)
}

fn log_http_result(op_name: &str, status: reqwest::StatusCode, body: &str) {
    if status.is_success() {
        println!("{}: status={}", op_name, status);
    } else {
        println!(
            "{}: status={} error={}",
            op_name,
            status,
            sanitize_body_for_logs(body)
        );
    }
}

fn sanitize_body_for_logs(body: &str) -> String {
    const MAX_LEN: usize = 220;
    let compact = body.replace(['\n', '\r'], " ");

    if let Ok(mut json) = serde_json::from_str::<Value>(&compact) {
        redact_json(&mut json);
        let rendered = json.to_string();
        return truncate_log(&rendered, MAX_LEN);
    }

    truncate_log(&compact, MAX_LEN)
}

fn redact_json(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (k, v) in map.iter_mut() {
                let lower = k.to_ascii_lowercase();
                if lower.contains("sdp")
                    || lower.contains("candidate")
                    || lower.contains("endpoint")
                    || lower.ends_with("key")
                {
                    if lower.ends_with("key") {
                        let masked = v
                            .as_str()
                            .map(mask_key)
                            .unwrap_or_else(|| "***".to_string());
                        *v = Value::String(masked);
                    } else {
                        *v = Value::String("***".to_string());
                    }
                    continue;
                }
                redact_json(v);
            }
        }
        Value::Array(items) => {
            for item in items {
                redact_json(item);
            }
        }
        _ => {}
    }
}

fn truncate_log(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        return s.to_string();
    }
    let mut out = s[..max_len].to_string();
    out.push_str("...");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> ClientState {
        ClientState {
            my_key: "NX-ABC123".to_string(),
            friends: vec![
                Friend {
                    name: "Alex".to_string(),
                    key: "NX-AAAA11".to_string(),
                },
                Friend {
                    name: "Max".to_string(),
                    key: "NX-BBBB22".to_string(),
                },
            ],
        }
    }

    #[test]
    fn add_friend_rejects_duplicates() {
        let mut state = test_state();
        let err = add_friend(&mut state, "Clone".to_string(), "NX-AAAA11")
            .expect_err("expected duplicate key error");
        assert!(err.to_string().contains("already exists"));
    }

    #[test]
    fn remove_friend_works() {
        let mut state = test_state();
        let removed = remove_friend(&mut state, "nx-aaaa11").expect("remove should succeed");
        assert!(removed);
        assert_eq!(state.friends.len(), 1);
    }

    #[test]
    fn search_friends_by_name_and_key() {
        let state = test_state();
        let by_name = search_friends(&state, "alex");
        assert_eq!(by_name.len(), 1);
        let by_key = search_friends(&state, "bbbb22");
        assert_eq!(by_key.len(), 1);
    }

    #[test]
    fn sanitize_body_redacts_sensitive_fields() {
        let raw = r#"{"caller_key":"NX-ABC123","endpoint":"10.0.0.5:5000","sdp_offer":"v=0","candidate":"cand"}"#;
        let sanitized = sanitize_body_for_logs(raw);
        assert!(sanitized.contains("NX-***23"));
        assert!(!sanitized.contains("v=0"));
        assert!(!sanitized.contains("10.0.0.5:5000"));
        assert!(sanitized.contains(r#""candidate":"***""#));
    }
}

