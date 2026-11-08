use std::sync::Arc;
use crate::remap::Injector;

#[derive(Default)]
pub struct GameMode;
pub fn codes_for_usages(_: &[u8]) -> Vec<u16> { Vec::new() }
impl GameMode {
    pub fn enable(&self, _: &str, _: &str, _: Vec<u16>, _: Arc<Injector>) {
        log::warn!("Game Mode is not supported on Windows");
    }
    pub fn disable(&self, _: &str) {}
    pub fn disable_all(&self) {}
}
