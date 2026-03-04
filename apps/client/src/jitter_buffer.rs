use std::collections::BTreeMap;

pub struct JitterBuffer {
    capacity: usize,
    next_seq: u16,
    queue: BTreeMap<u16, Vec<u8>>,
}

impl JitterBuffer {
    pub fn new(capacity: usize, start_seq: u16) -> Self {
        Self {
            capacity: capacity.max(1),
            next_seq: start_seq,
            queue: BTreeMap::new(),
        }
    }

    pub fn push(&mut self, seq: u16, payload: Vec<u8>) {
        if self.queue.len() >= self.capacity {
            if let Some((&oldest, _)) = self.queue.first_key_value() {
                self.queue.remove(&oldest);
            }
        }
        self.queue.entry(seq).or_insert(payload);
    }

    pub fn pop_next(&mut self) -> Option<Vec<u8>> {
        let payload = self.queue.remove(&self.next_seq)?;
        self.next_seq = self.next_seq.wrapping_add(1);
        Some(payload)
    }
}

#[cfg(test)]
mod tests {
    use super::JitterBuffer;

    #[test]
    fn jitter_buffer_reorders_packets() {
        let mut jb = JitterBuffer::new(16, 1);

        jb.push(2, vec![2]);
        jb.push(1, vec![1]);
        jb.push(3, vec![3]);

        assert_eq!(jb.pop_next(), Some(vec![1]));
        assert_eq!(jb.pop_next(), Some(vec![2]));
        assert_eq!(jb.pop_next(), Some(vec![3]));
        assert_eq!(jb.pop_next(), None);
    }
}
