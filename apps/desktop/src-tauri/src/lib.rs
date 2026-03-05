use std::{
  fs::{self, File},
  io::Write,
  path::PathBuf,
  sync::{Arc, Mutex},
};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GithubAsset {
  name: String,
  browser_download_url: String,
  size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GithubRelease {
  tag_name: String,
  body: Option<String>,
  assets: Vec<GithubAsset>,
}

#[derive(Debug, Clone, Serialize)]
struct UpdateCheckResult {
  available: bool,
  current_version: String,
  version: String,
  notes: String,
  asset_name: String,
  download_url: String,
  size: u64,
}

#[derive(Debug, Clone, Serialize, Default)]
struct UpdateProgress {
  in_progress: bool,
  downloaded: u64,
  total: u64,
  finished: bool,
  error: Option<String>,
  file_path: Option<String>,
  version: Option<String>,
  asset_name: Option<String>,
}

#[derive(Clone)]
struct UpdaterShared(Arc<Mutex<UpdateProgress>>);

fn version_to_vec(raw: &str) -> Vec<u64> {
  raw
    .trim()
    .trim_start_matches('v')
    .split('.')
    .map(|p| p.chars().take_while(|c| c.is_ascii_digit()).collect::<String>())
    .map(|p| p.parse::<u64>().unwrap_or(0))
    .collect()
}

fn is_newer_version(latest: &str, current: &str) -> bool {
  let a = version_to_vec(latest);
  let b = version_to_vec(current);
  let max_len = a.len().max(b.len());
  for i in 0..max_len {
    let av = *a.get(i).unwrap_or(&0);
    let bv = *b.get(i).unwrap_or(&0);
    if av > bv {
      return true;
    }
    if av < bv {
      return false;
    }
  }
  false
}

fn pick_windows_asset(assets: &[GithubAsset]) -> Option<GithubAsset> {
  assets
    .iter()
    .find(|a| a.name.eq_ignore_ascii_case("nizamvoice-setup.exe"))
    .cloned()
    .or_else(|| {
      assets
        .iter()
        .find(|a| a.name.eq_ignore_ascii_case("nizamvoice.exe"))
        .cloned()
    })
}

#[tauri::command]
async fn check_update(app: AppHandle) -> Result<UpdateCheckResult, String> {
  let current_version = app.package_info().version.to_string();
  let client = reqwest::Client::new();
  let release = client
    .get("https://api.github.com/repos/xam55/voise_chat/releases/latest")
    .header("User-Agent", "nizamvoice-updater")
    .header("Accept", "application/vnd.github+json")
    .send()
    .await
    .map_err(|e| format!("update_check_failed: {e}"))?
    .error_for_status()
    .map_err(|e| format!("update_check_http: {e}"))?
    .json::<GithubRelease>()
    .await
    .map_err(|e| format!("update_check_parse: {e}"))?;

  let latest_version = release.tag_name.trim_start_matches('v').to_string();
  let asset = pick_windows_asset(&release.assets)
    .ok_or_else(|| "release_asset_not_found".to_string())?;
  let available = is_newer_version(&latest_version, &current_version);

  Ok(UpdateCheckResult {
    available,
    current_version,
    version: latest_version,
    notes: release.body.unwrap_or_default(),
    asset_name: asset.name,
    download_url: asset.browser_download_url,
    size: asset.size.unwrap_or(0),
  })
}

#[tauri::command]
fn start_update_download(
  state: State<'_, UpdaterShared>,
  download_url: String,
  version: String,
  asset_name: String,
) -> Result<(), String> {
  {
    let mut progress = state
      .0
      .lock()
      .map_err(|_| "updater_state_lock".to_string())?;
    if progress.in_progress {
      return Err("update_download_in_progress".to_string());
    }
    *progress = UpdateProgress {
      in_progress: true,
      downloaded: 0,
      total: 0,
      finished: false,
      error: None,
      file_path: None,
      version: Some(version.clone()),
      asset_name: Some(asset_name.clone()),
    };
  }

  let shared = state.0.clone();
  tauri::async_runtime::spawn(async move {
    let result = download_update_file(&download_url, &version, &asset_name, shared.clone()).await;
    if let Err(err) = result {
      if let Ok(mut progress) = shared.lock() {
        progress.in_progress = false;
        progress.finished = false;
        progress.error = Some(err);
      }
    }
  });

  Ok(())
}

async fn download_update_file(
  download_url: &str,
  version: &str,
  asset_name: &str,
  shared: Arc<Mutex<UpdateProgress>>,
) -> Result<(), String> {
  let client = reqwest::Client::new();
  let response = client
    .get(download_url)
    .header("User-Agent", "nizamvoice-updater")
    .send()
    .await
    .map_err(|e| format!("download_request_failed: {e}"))?
    .error_for_status()
    .map_err(|e| format!("download_http_failed: {e}"))?;

  let total = response.content_length().unwrap_or(0);
  if let Ok(mut progress) = shared.lock() {
    progress.total = total;
  }

  let mut dir = std::env::temp_dir();
  dir.push("nizamvoice-updater");
  dir.push(version.replace('.', "_"));
  fs::create_dir_all(&dir).map_err(|e| format!("download_dir_failed: {e}"))?;

  let mut file_path = PathBuf::from(&dir);
  file_path.push(asset_name);
  let mut file = File::create(&file_path).map_err(|e| format!("download_file_create_failed: {e}"))?;

  let mut downloaded: u64 = 0;
  let mut stream = response.bytes_stream();
  while let Some(chunk) = stream.next().await {
    let bytes = chunk.map_err(|e| format!("download_stream_failed: {e}"))?;
    file
      .write_all(&bytes)
      .map_err(|e| format!("download_file_write_failed: {e}"))?;
    downloaded = downloaded.saturating_add(bytes.len() as u64);
    if let Ok(mut progress) = shared.lock() {
      progress.downloaded = downloaded;
      progress.total = total;
    }
  }

  if let Ok(mut progress) = shared.lock() {
    progress.in_progress = false;
    progress.finished = true;
    progress.error = None;
    progress.file_path = Some(file_path.to_string_lossy().to_string());
    progress.downloaded = downloaded;
    progress.total = total;
  }

  Ok(())
}

#[tauri::command]
fn get_update_progress(state: State<'_, UpdaterShared>) -> Result<UpdateProgress, String> {
  let progress = state
    .0
    .lock()
    .map_err(|_| "updater_state_lock".to_string())?
    .clone();
  Ok(progress)
}

#[tauri::command]
fn install_downloaded_update(app: AppHandle, state: State<'_, UpdaterShared>) -> Result<(), String> {
  let file_path = {
    let progress = state
      .0
      .lock()
      .map_err(|_| "updater_state_lock".to_string())?;
    progress
      .file_path
      .clone()
      .ok_or_else(|| "update_file_not_downloaded".to_string())?
  };

  std::process::Command::new(file_path)
    .spawn()
    .map_err(|e| format!("update_install_failed: {e}"))?;

  app.exit(0);
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(UpdaterShared(Arc::new(Mutex::new(UpdateProgress::default()))))
    .invoke_handler(tauri::generate_handler![
      check_update,
      start_update_download,
      get_update_progress,
      install_downloaded_update
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
