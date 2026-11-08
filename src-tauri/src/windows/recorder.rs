use crate::hidpp::onboard::MacroStep;

#[derive(Default)]
pub struct Recorder;
pub enum Outcome {
    Ignored,
    Consumed,
    Armed,
    Cancelled,
    Finished { device: String, button: u8, steps: Vec<MacroStep> },
}
impl Recorder {
    pub fn mr_pressed(&self, _: &str) -> Outcome { Outcome::Ignored }
    pub fn gkey(&self, _: &str, _: u8, _: bool, _: &str) -> Outcome { Outcome::Ignored }
}
