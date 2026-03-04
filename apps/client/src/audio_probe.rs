use std::f32::consts::PI;
use std::sync::mpsc;
use std::time::{Duration, Instant};

use anyhow::Context;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub fn list_audio_devices() -> anyhow::Result<()> {
    let host = cpal::default_host();

    println!("Input devices:");
    for device in host
        .input_devices()
        .context("cannot enumerate input devices")?
    {
        let name = device.name().unwrap_or_else(|_| "<unknown>".to_string());
        println!("- {}", name);
    }

    println!("Output devices:");
    for device in host
        .output_devices()
        .context("cannot enumerate output devices")?
    {
        let name = device.name().unwrap_or_else(|_| "<unknown>".to_string());
        println!("- {}", name);
    }

    Ok(())
}

pub fn mic_probe(seconds: u64) -> anyhow::Result<()> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow::anyhow!("no default input device"))?;

    let config = device
        .default_input_config()
        .context("failed to get default input config")?;

    let (tx, rx) = mpsc::channel::<f32>();
    let err_fn = |err| eprintln!("audio stream error: {err}");

    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => build_stream_f32(&device, &config.into(), tx.clone(), err_fn)?,
        cpal::SampleFormat::I16 => build_stream_i16(&device, &config.into(), tx.clone(), err_fn)?,
        cpal::SampleFormat::U16 => build_stream_u16(&device, &config.into(), tx.clone(), err_fn)?,
        _ => return Err(anyhow::anyhow!("unsupported input sample format")),
    };

    stream.play().context("failed to start audio stream")?;

    let deadline = Instant::now() + Duration::from_secs(seconds.max(1));
    let mut peak = 0.0_f32;
    let mut sum = 0.0_f32;
    let mut count = 0_u64;

    while Instant::now() < deadline {
        if let Ok(sample) = rx.recv_timeout(Duration::from_millis(50)) {
            let abs = sample.abs();
            if abs > peak {
                peak = abs;
            }
            sum += abs;
            count += 1;
        }
    }

    let avg = if count == 0 { 0.0 } else { sum / count as f32 };
    println!(
        "Mic probe complete: seconds={} samples={} avg_level={:.4} peak_level={:.4}",
        seconds, count, avg, peak
    );

    Ok(())
}

pub fn speaker_probe(seconds: u64) -> anyhow::Result<()> {
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or_else(|| anyhow::anyhow!("no default output device"))?;

    let config = device
        .default_output_config()
        .context("failed to get default output config")?;

    let seconds = seconds.max(1);
    let sample_rate = config.sample_rate().0 as f32;
    let tone_hz = 440.0_f32;
    let duration = Duration::from_secs(seconds);
    let start = Instant::now();

    let err_fn = |err| eprintln!("audio output error: {err}");
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => build_output_stream_f32(
            &device,
            &config.into(),
            sample_rate,
            tone_hz,
            start,
            duration,
            err_fn,
        )?,
        cpal::SampleFormat::I16 => build_output_stream_i16(
            &device,
            &config.into(),
            sample_rate,
            tone_hz,
            start,
            duration,
            err_fn,
        )?,
        cpal::SampleFormat::U16 => build_output_stream_u16(
            &device,
            &config.into(),
            sample_rate,
            tone_hz,
            start,
            duration,
            err_fn,
        )?,
        _ => return Err(anyhow::anyhow!("unsupported output sample format")),
    };

    stream.play().context("failed to start output stream")?;
    std::thread::sleep(duration + Duration::from_millis(100));
    println!("Speaker probe complete: played {}s tone", seconds);
    Ok(())
}

fn build_stream_f32(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    tx: mpsc::Sender<f32>,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> anyhow::Result<cpal::Stream> {
    let channels = config.channels as usize;
    let stream = device.build_input_stream(
        config,
        move |data: &[f32], _| {
            for frame in data.chunks(channels) {
                let _ = tx.send(frame[0]);
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}

fn build_stream_i16(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    tx: mpsc::Sender<f32>,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> anyhow::Result<cpal::Stream> {
    let channels = config.channels as usize;
    let stream = device.build_input_stream(
        config,
        move |data: &[i16], _| {
            for frame in data.chunks(channels) {
                let s = frame[0] as f32 / i16::MAX as f32;
                let _ = tx.send(s);
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}

fn build_stream_u16(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    tx: mpsc::Sender<f32>,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> anyhow::Result<cpal::Stream> {
    let channels = config.channels as usize;
    let stream = device.build_input_stream(
        config,
        move |data: &[u16], _| {
            for frame in data.chunks(channels) {
                let centered = frame[0] as f32 - 32768.0;
                let s = centered / 32768.0;
                let _ = tx.send(s);
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}

fn build_output_stream_f32(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_rate: f32,
    tone_hz: f32,
    start: Instant,
    duration: Duration,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> anyhow::Result<cpal::Stream> {
    let channels = config.channels as usize;
    let mut sample_clock = 0_f32;
    let stream = device.build_output_stream(
        config,
        move |output: &mut [f32], _| {
            if start.elapsed() >= duration {
                for sample in output.iter_mut() {
                    *sample = 0.0;
                }
                return;
            }
            for frame in output.chunks_mut(channels) {
                let value = (2.0 * PI * tone_hz * sample_clock / sample_rate).sin() * 0.15;
                sample_clock += 1.0;
                for sample in frame.iter_mut() {
                    *sample = value;
                }
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}

fn build_output_stream_i16(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_rate: f32,
    tone_hz: f32,
    start: Instant,
    duration: Duration,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> anyhow::Result<cpal::Stream> {
    let channels = config.channels as usize;
    let mut sample_clock = 0_f32;
    let stream = device.build_output_stream(
        config,
        move |output: &mut [i16], _| {
            if start.elapsed() >= duration {
                for sample in output.iter_mut() {
                    *sample = 0;
                }
                return;
            }
            for frame in output.chunks_mut(channels) {
                let value = (2.0 * PI * tone_hz * sample_clock / sample_rate).sin() * 0.15;
                sample_clock += 1.0;
                let sample_i16 = (value * i16::MAX as f32) as i16;
                for sample in frame.iter_mut() {
                    *sample = sample_i16;
                }
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}

fn build_output_stream_u16(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_rate: f32,
    tone_hz: f32,
    start: Instant,
    duration: Duration,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> anyhow::Result<cpal::Stream> {
    let channels = config.channels as usize;
    let mut sample_clock = 0_f32;
    let stream = device.build_output_stream(
        config,
        move |output: &mut [u16], _| {
            if start.elapsed() >= duration {
                for sample in output.iter_mut() {
                    *sample = 32768;
                }
                return;
            }
            for frame in output.chunks_mut(channels) {
                let value = (2.0 * PI * tone_hz * sample_clock / sample_rate).sin() * 0.15;
                sample_clock += 1.0;
                let sample_u16 = ((value * 32767.0) + 32768.0) as u16;
                for sample in frame.iter_mut() {
                    *sample = sample_u16;
                }
            }
        },
        err_fn,
        None,
    )?;
    Ok(stream)
}
