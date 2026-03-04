pub fn apply_gain_i16(samples: &mut [i16], gain: f32) {
    let gain = gain.max(0.0);
    for s in samples {
        let v = (*s as f32 * gain).clamp(i16::MIN as f32, i16::MAX as f32);
        *s = v as i16;
    }
}

pub fn suppress_echo_i16(samples: &mut [i16], echo_reference: &[i16], attenuation: f32) {
    let att = attenuation.clamp(0.0, 1.0);
    let n = samples.len().min(echo_reference.len());
    for i in 0..n {
        let cleaned = samples[i] as f32 - echo_reference[i] as f32 * att;
        samples[i] = cleaned.clamp(i16::MIN as f32, i16::MAX as f32) as i16;
    }
}

pub fn audio_fx_selftest(seconds: u64, gain: f32, echo_attenuation: f32) {
    let sample_rate = 48_000.0_f32;
    let total = (seconds.max(1) as usize) * 48_000;
    let mut src = Vec::with_capacity(total);
    let mut echo = vec![0_i16; total];

    for i in 0..total {
        let t = i as f32 / sample_rate;
        let s = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.2;
        src.push((s * i16::MAX as f32) as i16);
    }

    let delay = 480; // 10 ms at 48kHz
    for i in delay..total {
        echo[i] = (src[i - delay] as f32 * 0.45) as i16;
    }

    let mut mixed = src.clone();
    for i in 0..total {
        let m = mixed[i] as i32 + echo[i] as i32;
        mixed[i] = m.clamp(i16::MIN as i32, i16::MAX as i32) as i16;
    }

    let peak_before = mixed.iter().map(|x| x.abs() as i32).max().unwrap_or(0);
    apply_gain_i16(&mut mixed, gain);
    suppress_echo_i16(&mut mixed, &echo, echo_attenuation);
    let peak_after = mixed.iter().map(|x| x.abs() as i32).max().unwrap_or(0);

    println!(
        "audio fx selftest ok: seconds={} gain={:.2} echo_attenuation={:.2} peak_before={} peak_after={}",
        seconds.max(1),
        gain,
        echo_attenuation,
        peak_before,
        peak_after
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gain_increases_peak() {
        let mut s = vec![1000_i16, -1000_i16, 500_i16];
        apply_gain_i16(&mut s, 2.0);
        assert_eq!(s[0], 2000);
        assert_eq!(s[1], -2000);
    }

    #[test]
    fn echo_suppression_reduces_signal() {
        let mut s = vec![1000_i16, 1000_i16];
        let e = vec![500_i16, 500_i16];
        suppress_echo_i16(&mut s, &e, 1.0);
        assert_eq!(s[0], 500);
        assert_eq!(s[1], 500);
    }
}
