<p align="center">
  <img src="static/logo.svg" width="96" alt="OpenGHub logo">
</p>

<h1 align="center">OpenGHub</h1>

<p align="center">
  Open-source Logitech device configuration for Linux, with an experimental Windows port.<br>
  Configure supported HID++ peripherals using a familiar interface.
</p>

<p align="center">
  <a href="https://github.com/Sanalex4/OpenGHub/releases"><img alt="Windows preview" src="https://img.shields.io/badge/Windows-preview-orange"></a>
  <a href="https://github.com/Slyvan25/OpenGHub/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Slyvan25/OpenGHub/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

<p align="center">
  <img src="docs/screenshots/devices.png" width="860" alt="OpenGHub's device list">
</p>

---

This fork of [Slyvan25/OpenGHub](https://github.com/Slyvan25/OpenGHub) adds an experimental Windows port. OpenGHub talks to Logitech peripherals over **HID++ 2.0** through HIDAPI; Linux uses `hidraw`. It is built with Tauri 2, Svelte 5 and Rust. Windows support is still incomplete and does not yet match the Linux feature set.

## Install

### Web app

Open [OpenGHub Web](https://openghubweb.github.io/) in a desktop browser with WebHID support, connect a Logitech mouse or receiver, and select its vendor HID interface when prompted. Tabs provide DPI, polling rate, supported lighting effects, lift-off height, battery status and device mode where supported. Read an onboard profile to change DPI stages, assign mouse buttons or keyboard shortcuts, or build a macro from key combinations, mouse clicks and delays. Text macros are also available. A G102 LIGHTSYNC user confirmed DPI and polling rate reading, lighting zone detection and a memory write; the new macro editor and individual button assignments have not yet been verified on hardware. Other models, including Superlight 2, remain unverified. Profile writes currently require format 4 with 255-byte sectors. Before a profile sector is changed, its original contents are saved in the browser for the current connection, and a write is read back and checked. The web app does not upload device data or require an installed application. Live settings may be temporary or require host mode; support differs by model. Firmware updates, automatic game switching and host-side macros are not implemented.

### Windows x64

Download the latest `OpenGHub_*_x64-setup.exe` from the [Windows preview releases](https://github.com/Sanalex4/OpenGHub/releases), run the installer, and launch OpenGHub. Microsoft Edge WebView2 is required.

The preview has been tested on Windows with a **G102 LIGHTSYNC**: device discovery and reading DPI, polling rate and capabilities work. Writing settings has not yet been verified on this device. The **PRO X SUPERLIGHT 2** receiver and extended DPI protocol are implemented but have not been tested on the physical mouse. Other models may work if they expose compatible HID++ features, but compatibility is not guaranteed.

Button assignments, macros, scripting input, automatic game detection, software lighting effects and the virtual wheel are not yet available on Windows. Do not use the preview for firmware updates.

### Linux

Grab the package for your distribution from the [upstream Linux release](https://github.com/Slyvan25/OpenGHub/releases/latest).

| Distribution | Package | Install |
| --- | --- | --- |
| Debian, Ubuntu, Mint, Pop!_OS | `OpenGHub_x.y.z_amd64.deb` | `sudo apt install ./OpenGHub_*_amd64.deb` |
| Fedora, openSUSE, RHEL | `OpenGHub-x.y.z-1.x86_64.rpm` | `sudo dnf install ./OpenGHub-*.rpm` |
| Arch, Manjaro, EndeavourOS | `PKGBUILD` | `makepkg -si` in a folder with the PKGBUILD (AUR: `openghub-bin`) |
| Flatpak (any distribution) | `OpenGHub_x.y.z.flatpak` | `flatpak install --user OpenGHub_*.flatpak` |
| Anything else | `OpenGHub_x.y.z_amd64.AppImage` | `chmod +x OpenGHub_*.AppImage && ./OpenGHub_*.AppImage` |

The .deb and .rpm install the udev rule that lets you talk to the devices. The Flatpak, the AppImage and a build from source offer to install it the first time you start the app — your desktop asks for your password once, nothing else to configure. Details in [docs/permissions.md](docs/permissions.md).

Optional, for the LIGHTSYNC software effects: `gstreamer1.0-tools` + `gstreamer1.0-pipewire` (screen sampler) and `pulseaudio-utils` (audio visualizer).

## Linux features

These are upstream Linux features; the Windows preview has the limitations listed above.

- **Devices** — every HID++ 2.0 device is discovered automatically, wired, over Bluetooth or behind a LIGHTSPEED / Unifying / Bolt receiver, with its battery, firmware and the exact renders and button/zone geometry G HUB uses (fetched from Logitech's public CDN at runtime, never bundled).
- **Sensitivity** — DPI stages, default and shift stage, polling rate up to 8 kHz.
- **Assignments** — drag commands, keys, system actions or macros onto any button, with G-Shift as a second layer and a guard that never leaves you without a primary click. Applied live through the button spy and written to the device's on-board memory so they survive without the app.
- **Macros** — G HUB's three-step editor, written to on-board memory with a backup first.
- **LIGHTSYNC** — per-zone fixed / breathing / colour cycle on the device, plus a screen sampler and an audio visualizer streamed from the app.
- **Profiles** — per game, switched automatically when the game runs; rename, duplicate, disable; import your existing G HUB `settings.db`; share and install community profiles.
- **Games** — a launcher that finds Steam, Heroic (Epic / GOG) and Lutris libraries.
- **Racing wheels** — G923 and its relatives: operating range, centering spring, sensitivity, pedal curves, RPM LEDs, centre calibration, and a userspace force-feedback driver so games get real FFB. TrueForce works under Proton. A *gamepad mode* makes the wheel show up as an Xbox controller for games without wheel support (Rocket League, say).
- **Lua scripting** — G HUB's scripting API (`OnEvent`, `PressKey`, `OutputLogMessage`, …) per profile; scripts written for G HUB run unchanged.
- **Firmware** — release notes and version checks from Logitech's own firmware packages, and updates over the standard HID++ DFU sequence.
- **Everything else** — tray menu, launch at startup, start minimised, low-battery mode, sleep timers, left-handed layout, on-board memory mode.

## Tested hardware on Linux

Developed against a **G502 LIGHTSPEED** (mouse features, on-board memory, lighting, macros, scripting) and a **G923 Racing Wheel** (PS4/PC edition: force feedback, TrueForce, shifter, pedals, gamepad mode). Any other HID++ 2.0 device should work for the features it exposes — the app reads the device's own feature list and adapts. If yours doesn't, open an issue with the output of *Device settings → HID++ features*.

## Games and Proton on Linux

Native games and anything through SDL see OpenGHub's virtual wheel with full force feedback. Proton routes Logitech wheels over hidraw by default (that is what lets TrueForce reach the wheel); to give a Proton game the driver's wheel *and* keep TrueForce, launch it with `PROTON_DISABLE_HIDRAW=0x046d/0xc266 %command%`. The [wheel notes](docs/wheels.md) explain the trade-offs.

## Where things live on Linux

| | Path |
| --- | --- |
| Configuration (profiles, settings) | `~/.config/openghub/config.json` |
| Device renders, layouts, firmware packages, backups | `~/.local/share/openghub/` |
| udev rule | `/etc/udev/rules.d/70-openghub.rules` (installed by the package or from the app) |
| Launch at startup | `~/.config/autostart/openghub.desktop` |

On Windows, OpenGHub keeps its application data under `%APPDATA%\openghub\OpenGHub\`. Startup is registered under the current user's Windows `Run` key when enabled.

## Building from source

### Windows preview

The Windows build is experimental. HID++ device discovery and read-only DPI,
polling-rate and lighting capability detection have been checked with a G102
LIGHTSYNC. Other devices, including PRO X SUPERLIGHT 2, are not yet verified.
Button assignments, macros, software lighting effects, game detection and the
virtual wheel are not supported on Windows. Do not use this preview for
firmware updates. Windows requires WebView2 and Visual Studio C++ Build Tools.

From an x64 Visual Studio developer prompt:

```powershell
npm ci
npm run tauri build -- --bundles nsis
```

The installer is written to `src-tauri/target/release/bundle/nsis/`.

### Linux

```sh
# Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libudev-dev libssl-dev build-essential pkg-config patchelf
# Fedora:        sudo dnf install webkit2gtk4.1-devel libayatana-appindicator-gtk3-devel librsvg2-devel systemd-devel openssl-devel gcc patchelf
npm install
npm run tauri dev            # against your hardware
npm run tauri build          # .deb, .rpm and AppImage in src-tauri/target/release/bundle
```

Rust 1.77+ and Node 20+. `npm run dev` serves the interface in a browser against a mock backend, handy for UI work without hardware. Tests: `cargo test --lib` in `src-tauri`, `npm run check` for the frontend. More in [docs/development.md](docs/development.md).

## Documentation

- [Device permissions and startup](docs/permissions.md)
- [HID++ and the device layer](docs/hidpp.md) — protocol, on-board memory, remapping, G-Shift, device settings, firmware
- [Racing wheels](docs/wheels.md) — the classic command channel, the FFB driver, pedals, TrueForce, Proton
- [Lighting and artwork](docs/lighting.md) — zones, software effects, where the renders come from
- [Profiles, games and scripting](docs/profiles.md) — per-game profiles, community profiles, G HUB import, Lua
- [Developing](docs/development.md)
- [Publishing on Flathub](docs/flathub.md)

## Contributing

Issues and pull requests are welcome. Community profiles live in a separate repository, [openghub-community](https://github.com/Slyvan25/openghub-community), one JSON file per profile under a CC0 licence; the app's *Share…* menu exports the file for you.

Please don't contribute Logitech's own files (artwork, firmware, databases): the app fetches what it needs from Logitech's public CDN at runtime, and the repository stays clean.

## Trademarks and licence

OpenGHub is not affiliated with or endorsed by Logitech. G HUB, LIGHTSPEED, LIGHTSYNC and TrueForce are trademarks of Logitech.

Released under the [MIT licence](LICENSE).
