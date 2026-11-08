use std::sync::Arc;
use hidapi::HidDevice;
use parking_lot::Mutex;
use crate::hidpp::{Error, Result};
use super::{WheelModel, WheelSettings, WheelState};

pub struct Bridge;
impl Bridge {
    pub fn start(_: &'static WheelModel, _: Arc<Mutex<HidDevice>>, _: Arc<Mutex<WheelState>>, _: Arc<Mutex<WheelSettings>>, _: Vec<String>) -> Result<Self> {
        Err(Error::other("The virtual wheel is not available on Windows"))
    }
    pub fn update_settings(&self, _: &WheelSettings) {}
    pub fn stop(self) {}
}
