use crate::hidpp::{Error, Result};
use winreg::{enums::HKEY_CURRENT_USER, RegKey};

const KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const NAME: &str = "OpenGHub";
pub const MINIMIZED_FLAG: &str = "--minimized";

pub fn is_enabled() -> bool {
    RegKey::predef(HKEY_CURRENT_USER).open_subkey(KEY)
        .and_then(|key| key.get_value::<String, _>(NAME)).is_ok()
}

pub fn set_enabled(on: bool) -> Result<bool> {
    use winreg::enums::KEY_SET_VALUE;
    let key = RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(KEY, KEY_SET_VALUE)
        .map_err(|e| Error::other(format!("Cannot open startup settings: {e}")))?;
    if on {
        let exe = std::env::current_exe().map_err(|e| Error::other(e.to_string()))?;
        key.set_value(NAME, &format!("\"{}\" {MINIMIZED_FLAG}", exe.display()))
            .map_err(|e| Error::other(format!("Cannot set startup: {e}")))?;
    } else {
        match key.delete_value(NAME) {
            Ok(()) => (),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(e) => return Err(Error::other(format!("Cannot remove startup: {e}"))),
        }
    }
    Ok(on)
}

pub async fn set_enabled_portal(_: bool) -> Result<bool> {
    Err(Error::other("The desktop background portal is only available on Linux"))
}

pub fn started_minimized() -> bool {
    std::env::args().skip(1).any(|a| a == MINIMIZED_FLAG)
}
