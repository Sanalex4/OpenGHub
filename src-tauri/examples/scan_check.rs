//! Read-only regression check for duplicate device IDs after rescanning.
use std::collections::HashSet;

fn main() {
    let manager = openghub_lib::state::DeviceManager::new();
    for scan in 1..=3 {
        let devices = manager.refresh();
        let mut ids = HashSet::new();
        for device in &devices {
            assert!(ids.insert(&device.id), "duplicate device ID on scan {scan}: {}", device.id);
        }
        println!("scan {scan}: {} unique device(s)", devices.len());
    }
}
