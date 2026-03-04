use std::f32::consts::PI;

use anyhow::Context;
use audiopus::coder::{Decoder as OpusDecoder, Encoder as OpusEncoder};
use audiopus::packet::Packet;
use audiopus::{Application, Channels, SampleRate};
use std::convert::TryInto;

pub const OPUS_SAMPLE_RATE: usize = 48_000;
pub const OPUS_FRAME_SIZE: usize = 960;

pub struct OpusCodec {
    encoder: OpusEncoder,
    decoder: OpusDecoder,
    channels: Channels,
}

impl OpusCodec {
    pub fn new_mono_48k() -> anyhow::Result<Self> {
        let channels = Channels::Mono;
        let encoder = OpusEncoder::new(SampleRate::Hz48000, channels, Application::Voip)
            .context("failed to create opus encoder")?;
        let decoder = OpusDecoder::new(SampleRate::Hz48000, channels)
            .context("failed to create opus decoder")?;

        Ok(Self {
            encoder,
            decoder,
            channels,
        })
    }

    pub fn encode_i16_frame(&mut self, pcm: &[i16]) -> anyhow::Result<Vec<u8>> {
        let channels = match self.channels {
            Channels::Mono => 1,
            Channels::Stereo => 2,
            Channels::Auto => {
                return Err(anyhow::anyhow!(
                    "invalid opus channel mode: auto is not supported at runtime"
                ));
            }
        };
        if pcm.len() != OPUS_FRAME_SIZE * channels {
            return Err(anyhow::anyhow!(
                "invalid frame len: got {}, expected {}",
                pcm.len(),
                OPUS_FRAME_SIZE * channels
            ));
        }

        let mut out = vec![0_u8; 4000];
        let size = self
            .encoder
            .encode(pcm, &mut out)
            .context("opus encode failed")?;
        out.truncate(size);
        Ok(out)
    }

    pub fn decode_i16_frame(&mut self, packet: &[u8]) -> anyhow::Result<Vec<i16>> {
        let channels = match self.channels {
            Channels::Mono => 1,
            Channels::Stereo => 2,
            Channels::Auto => {
                return Err(anyhow::anyhow!(
                    "invalid opus channel mode: auto is not supported at runtime"
                ));
            }
        };
        let mut out = vec![0_i16; OPUS_FRAME_SIZE * channels];
        let packet: Packet<'_> = packet.try_into().context("invalid opus packet")?;
        let output = (&mut out)
            .try_into()
            .context("invalid output signal buffer")?;
        let decoded_samples = self
            .decoder
            .decode(Some(packet), output, false)
            .context("opus decode failed")?;
        out.truncate(decoded_samples * channels);
        Ok(out)
    }
}

pub fn f32_to_i16(samples: &[f32]) -> Vec<i16> {
    samples
        .iter()
        .map(|s| {
            let clamped = s.clamp(-1.0, 1.0);
            (clamped * i16::MAX as f32) as i16
        })
        .collect()
}

pub fn i16_to_f32(samples: &[i16]) -> Vec<f32> {
    samples
        .iter()
        .map(|s| *s as f32 / i16::MAX as f32)
        .collect()
}

pub fn opus_selftest(seconds: u64) -> anyhow::Result<()> {
    let seconds = seconds.max(1) as usize;
    let total_samples = seconds * OPUS_SAMPLE_RATE;

    let mut source = Vec::with_capacity(total_samples);
    for i in 0..total_samples {
        let t = i as f32 / OPUS_SAMPLE_RATE as f32;
        let sample = (2.0 * PI * 440.0 * t).sin() * 0.2;
        source.push(sample);
    }

    let source_i16 = f32_to_i16(&source);
    let mut codec = OpusCodec::new_mono_48k()?;

    let mut encoded_packets = 0usize;
    let mut encoded_bytes = 0usize;
    let mut decoded = Vec::<i16>::new();

    for frame in source_i16.chunks(OPUS_FRAME_SIZE) {
        if frame.len() < OPUS_FRAME_SIZE {
            break;
        }
        let packet = codec.encode_i16_frame(frame)?;
        encoded_packets += 1;
        encoded_bytes += packet.len();

        let decoded_frame = codec.decode_i16_frame(&packet)?;
        decoded.extend(decoded_frame);
    }

    let decoded_f32 = i16_to_f32(&decoded);
    let compare_len = decoded_f32.len().min(source.len());
    let mse = if compare_len == 0 {
        0.0
    } else {
        let mut acc = 0.0_f64;
        for i in 0..compare_len {
            let diff = source[i] as f64 - decoded_f32[i] as f64;
            acc += diff * diff;
        }
        acc / compare_len as f64
    };

    println!(
        "opus selftest ok: seconds={} packets={} bytes={} mse={:.8}",
        seconds, encoded_packets, encoded_bytes, mse
    );

    Ok(())
}
