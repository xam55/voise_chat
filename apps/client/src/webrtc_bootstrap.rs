use std::f32::consts::PI;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, Mutex,
};
use std::time::Duration;

use anyhow::Context;
use bytes::Bytes;
use rand::Rng;
use webrtc::api::media_engine::MediaEngine;
use webrtc::api::APIBuilder;
use webrtc::ice_transport::ice_server::RTCIceServer;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::peer_connection::RTCPeerConnection;

use crate::audio_fx;
use crate::jitter_buffer::JitterBuffer;
use crate::opus_codec::{OpusCodec, OPUS_FRAME_SIZE, OPUS_SAMPLE_RATE};

pub async fn create_offer_sdp() -> anyhow::Result<String> {
    let pc = build_peer_connection().await?;

    pc.on_peer_connection_state_change(Box::new(|state: RTCPeerConnectionState| {
        println!("webrtc state: {state:?}");
        Box::pin(async {})
    }));

    let _dc = pc
        .create_data_channel("nexuschat-signal-test", None)
        .await
        .context("failed to create data channel")?;

    let offer = pc
        .create_offer(None)
        .await
        .context("failed to create offer")?;

    pc.set_local_description(offer)
        .await
        .context("failed to set local offer")?;

    let mut gather_complete = pc.gathering_complete_promise().await;
    let _ = gather_complete.recv().await;

    let local = pc
        .local_description()
        .await
        .ok_or_else(|| anyhow::anyhow!("missing local offer description"))?;

    Ok(local.sdp)
}

pub async fn create_answer_sdp(remote_offer_sdp: &str) -> anyhow::Result<String> {
    let pc = build_peer_connection().await?;

    pc.on_peer_connection_state_change(Box::new(|state: RTCPeerConnectionState| {
        println!("webrtc state: {state:?}");
        Box::pin(async {})
    }));

    let remote_offer = RTCSessionDescription::offer(remote_offer_sdp.to_string())
        .context("failed to parse remote offer sdp")?;

    pc.set_remote_description(remote_offer)
        .await
        .context("failed to set remote offer")?;

    let answer = pc
        .create_answer(None)
        .await
        .context("failed to create answer")?;

    pc.set_local_description(answer)
        .await
        .context("failed to set local answer")?;

    let mut gather_complete = pc.gathering_complete_promise().await;
    let _ = gather_complete.recv().await;

    let local = pc
        .local_description()
        .await
        .ok_or_else(|| anyhow::anyhow!("missing local answer description"))?;

    Ok(local.sdp)
}

async fn build_peer_connection() -> anyhow::Result<Arc<webrtc::peer_connection::RTCPeerConnection>>
{
    let mut media_engine = MediaEngine::default();
    media_engine
        .register_default_codecs()
        .context("failed to register default codecs")?;

    let api = APIBuilder::new().with_media_engine(media_engine).build();

    let config = RTCConfiguration {
        ice_servers: vec![RTCIceServer {
            urls: vec!["stun:stun.l.google.com:19302".to_string()],
            ..Default::default()
        }],
        ..Default::default()
    };

    let peer_connection = api
        .new_peer_connection(config)
        .await
        .context("failed to create peer connection")?;

    Ok(Arc::new(peer_connection))
}

pub async fn p2p_audio_selftest(seconds: u64, gain: f32, drop_rate: f32) -> anyhow::Result<()> {
    let seconds = seconds.max(1);
    let drop_rate = drop_rate.clamp(0.0, 1.0);

    let pc_offer = build_peer_connection().await?;
    let pc_answer = build_peer_connection().await?;

    let recv_packets = Arc::new(AtomicUsize::new(0));
    let recv_bytes = Arc::new(AtomicUsize::new(0));
    let recv_decoded_samples = Arc::new(AtomicUsize::new(0));
    let latency_sum_ms = Arc::new(AtomicUsize::new(0));
    let latency_samples = Arc::new(AtomicUsize::new(0));
    let recv_codec = Arc::new(Mutex::new(OpusCodec::new_mono_48k()?));
    let jitter_buffer = Arc::new(Mutex::new(JitterBuffer::new(128, 0)));

    let recv_packets_cl = Arc::clone(&recv_packets);
    let recv_bytes_cl = Arc::clone(&recv_bytes);
    let recv_decoded_samples_cl = Arc::clone(&recv_decoded_samples);
    let latency_sum_ms_cl = Arc::clone(&latency_sum_ms);
    let latency_samples_cl = Arc::clone(&latency_samples);
    let recv_codec_cl = Arc::clone(&recv_codec);
    let jitter_buffer_cl = Arc::clone(&jitter_buffer);

    pc_answer.on_data_channel(Box::new(move |dc| {
        let recv_packets_cl = Arc::clone(&recv_packets_cl);
        let recv_bytes_cl = Arc::clone(&recv_bytes_cl);
        let recv_decoded_samples_cl = Arc::clone(&recv_decoded_samples_cl);
        let latency_sum_ms_cl = Arc::clone(&latency_sum_ms_cl);
        let latency_samples_cl = Arc::clone(&latency_samples_cl);
        let recv_codec_cl = Arc::clone(&recv_codec_cl);
        let jitter_buffer_cl = Arc::clone(&jitter_buffer_cl);

        Box::pin(async move {
            dc.on_message(Box::new(move |msg| {
                let recv_packets_cl = Arc::clone(&recv_packets_cl);
                let recv_bytes_cl = Arc::clone(&recv_bytes_cl);
                let recv_decoded_samples_cl = Arc::clone(&recv_decoded_samples_cl);
                let latency_sum_ms_cl = Arc::clone(&latency_sum_ms_cl);
                let latency_samples_cl = Arc::clone(&latency_samples_cl);
                let recv_codec_cl = Arc::clone(&recv_codec_cl);
                let jitter_buffer_cl = Arc::clone(&jitter_buffer_cl);

                Box::pin(async move {
                    recv_packets_cl.fetch_add(1, Ordering::Relaxed);
                    recv_bytes_cl.fetch_add(msg.data.len(), Ordering::Relaxed);

                    let data = msg.data.as_ref();
                    if data.len() < 10 {
                        return;
                    }

                    let seq = u16::from_be_bytes([data[0], data[1]]);
                    let sent_ms = u64::from_be_bytes([
                        data[2], data[3], data[4], data[5], data[6], data[7], data[8], data[9],
                    ]);
                    let now_ms = now_unix_ms();
                    if now_ms >= sent_ms {
                        let latency = (now_ms - sent_ms) as usize;
                        latency_sum_ms_cl.fetch_add(latency, Ordering::Relaxed);
                        latency_samples_cl.fetch_add(1, Ordering::Relaxed);
                    }

                    let packet = data[10..].to_vec();

                    if let Ok(mut jb) = jitter_buffer_cl.lock() {
                        jb.push(seq, packet);

                        if let Ok(mut codec) = recv_codec_cl.lock() {
                            while let Some(ordered_packet) = jb.pop_next() {
                                if let Ok(decoded) = codec.decode_i16_frame(&ordered_packet) {
                                    recv_decoded_samples_cl
                                        .fetch_add(decoded.len(), Ordering::Relaxed);
                                }
                            }
                        }
                    }
                })
            }));
        })
    }));

    let dc_open = Arc::new(tokio::sync::Notify::new());
    let dc = pc_offer
        .create_data_channel("nexuschat-audio", None)
        .await
        .context("failed to create audio data channel")?;
    let dc_open_cl = Arc::clone(&dc_open);
    dc.on_open(Box::new(move || {
        let dc_open_cl = Arc::clone(&dc_open_cl);
        Box::pin(async move {
            dc_open_cl.notify_one();
        })
    }));

    signal_pair_locally(&pc_offer, &pc_answer).await?;

    tokio::time::timeout(Duration::from_secs(10), dc_open.notified())
        .await
        .context("data channel did not open in time")?;

    let mut send_codec = OpusCodec::new_mono_48k()?;
    let mut phase = 0.0_f32;
    let phase_step = 2.0 * PI * 440.0 / OPUS_SAMPLE_RATE as f32;

    let mut sent_packets = 0usize;
    let mut sent_bytes = 0usize;
    let mut intentionally_dropped = 0usize;
    let mut seq = 0_u16;
    let total_frames = (seconds as usize * 1000) / 20;
    let mut rng = rand::rng();

    for _ in 0..total_frames {
        let mut frame = vec![0_i16; OPUS_FRAME_SIZE];
        for sample in &mut frame {
            let s = phase.sin() * 0.2;
            phase += phase_step;
            if phase > 2.0 * PI {
                phase -= 2.0 * PI;
            }
            *sample = (s * i16::MAX as f32) as i16;
        }

        audio_fx::apply_gain_i16(&mut frame, gain);
        let packet = send_codec.encode_i16_frame(&frame)?;
        let mut wire = Vec::with_capacity(packet.len() + 2);
        wire.extend_from_slice(&seq.to_be_bytes());
        wire.extend_from_slice(&now_unix_ms().to_be_bytes());
        wire.extend_from_slice(&packet);
        seq = seq.wrapping_add(1);

        if rng.random::<f32>() < drop_rate {
            intentionally_dropped += 1;
            tokio::time::sleep(Duration::from_millis(20)).await;
            continue;
        }

        sent_packets += 1;
        sent_bytes += wire.len();
        let _ = dc.send(&Bytes::from(wire)).await?;
        tokio::time::sleep(Duration::from_millis(20)).await;
    }

    tokio::time::sleep(Duration::from_millis(250)).await;

    let delivered_packets = recv_packets.load(Ordering::Relaxed);
    let packet_loss = sent_packets.saturating_sub(delivered_packets);
    let avg_latency_ms = if latency_samples.load(Ordering::Relaxed) == 0 {
        0.0
    } else {
        latency_sum_ms.load(Ordering::Relaxed) as f64
            / latency_samples.load(Ordering::Relaxed) as f64
    };

    println!(
        "p2p audio selftest ok: sent_packets={} sent_bytes={} recv_packets={} recv_bytes={} recv_decoded_samples={} intentional_drop={} measured_loss={} avg_latency_ms={:.2}",
        sent_packets,
        sent_bytes,
        delivered_packets,
        recv_bytes.load(Ordering::Relaxed),
        recv_decoded_samples.load(Ordering::Relaxed),
        intentionally_dropped,
        packet_loss,
        avg_latency_ms,
    );

    let _ = pc_offer.close().await;
    let _ = pc_answer.close().await;

    Ok(())
}

fn now_unix_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

async fn signal_pair_locally(
    pc_offer: &Arc<RTCPeerConnection>,
    pc_answer: &Arc<RTCPeerConnection>,
) -> anyhow::Result<()> {
    let offer = pc_offer
        .create_offer(None)
        .await
        .context("failed to create local offer")?;
    pc_offer
        .set_local_description(offer)
        .await
        .context("failed to set offer local description")?;
    let mut offer_gather = pc_offer.gathering_complete_promise().await;
    let _ = offer_gather.recv().await;
    let local_offer = pc_offer
        .local_description()
        .await
        .ok_or_else(|| anyhow::anyhow!("missing gathered local offer"))?;

    pc_answer
        .set_remote_description(local_offer)
        .await
        .context("failed to set answer remote offer")?;

    let answer = pc_answer
        .create_answer(None)
        .await
        .context("failed to create local answer")?;
    pc_answer
        .set_local_description(answer)
        .await
        .context("failed to set answer local description")?;
    let mut answer_gather = pc_answer.gathering_complete_promise().await;
    let _ = answer_gather.recv().await;
    let local_answer = pc_answer
        .local_description()
        .await
        .ok_or_else(|| anyhow::anyhow!("missing gathered local answer"))?;

    pc_offer
        .set_remote_description(local_answer)
        .await
        .context("failed to set offer remote answer")?;

    Ok(())
}
