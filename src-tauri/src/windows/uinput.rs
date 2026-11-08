use std::io;

pub const EV_KEY: u16 = 1;
pub const EV_REL: u16 = 2;
pub const REL_X: u16 = 0;
pub const REL_Y: u16 = 1;
pub const REL_WHEEL: u16 = 8;
pub const REL_HWHEEL: u16 = 6;
pub const BTN_LEFT: u16 = 0x110;
pub const BTN_RIGHT: u16 = 0x111;
pub const BTN_MIDDLE: u16 = 0x112;
pub const BTN_SIDE: u16 = 0x113;
pub const BTN_EXTRA: u16 = 0x114;
pub const BTN_FORWARD: u16 = 0x115;
pub const BTN_BACK: u16 = 0x116;
pub const BTN_TASK: u16 = 0x117;

pub struct VirtualDevice;
impl VirtualDevice {
    pub fn create_keyboard(_: &str, _: u16, _: u16) -> io::Result<Self> {
        Err(io::Error::new(io::ErrorKind::Unsupported, "Virtual keyboard is not available on Windows"))
    }
    pub fn emit(&self, _: &[(u16, u16, i32)]) -> io::Result<()> {
        Err(io::Error::new(io::ErrorKind::Unsupported, "Virtual input is not available on Windows"))
    }
}
