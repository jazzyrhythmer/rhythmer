# RHYTHMER OS — SMK-37 Pro test build

Candidate: **0.1.2-smk2** · USB identity: **SMK-37 Pro_9748025**.
This is a separate SMK-37 Pro target. The FM-1 firmware and installer are unchanged.
Software checks have passed; this candidate has not yet been installed on the owner's keyboard.
Only the **Pro** model is targeted. Elite, MKE-P37 and Starrykey packages are different.

## Browser installation

After saving and verifying the full-flash backup described below, open https://jazzyrhythmer.github.io/rhythmer/installer/?board=smk37 in desktop Chrome or Edge. Complete the three initial checks and press **INSTALL** once. Allow MIDI access if the browser asks. The installer checks the model and package, requests a CRC-checked musical-backup download on supported custom firmware, transfers the image and verifies the identity and sample banks after restart. There is no second approval dialog. Stock 1.16 and the update loader cannot export a musical archive; the separate full-flash backup remains necessary before first installation.


## Before installing

The reference board/partition layout is the official Pro **1.16 (v016)**. Check your current identity with `--info` first. If it reports another official version, share that identity before installing.

Back up the full 1 MiB flash **before the first install**. Initialisation replaces stock settings and custom-firmware projects in the VM region; the included two Break banks replace the user-sample area. Factory calibration, Bluetooth pairing, stock resources and the unit key are outside our loader's write ranges. A package for the other product replaces the same shared storage: Rhythmer and Jazzy projects are not stored side by side on this keyboard.

## Installer setup (Mac)

Keep the extracted folder on the SSD. Open Terminal in that folder:

```sh
python3 -m venv /Volumes/SSD/Development/Toolchains/smk37-installer
/Volumes/SSD/Development/Toolchains/smk37-installer/bin/pip install --cache-dir /Volumes/SSD/Development/Caches/pip mido python-rtmidi
/Volumes/SSD/Development/Toolchains/smk37-installer/bin/python smk37_install.py --info
```

Connect directly over a USB data cable; close DAWs and other MIDI applications. If several MIDI devices are connected, add `--port "SMK-37"`. The installer also checks the device's reported model before starting an update.

### Full flash backup

```sh
/Volumes/SSD/Development/Toolchains/smk37-installer/bin/python smk37_install.py RHYTHMER-OS-SMK37-Pro-0.1.2-smk2.fwsc --prepare-backup
```

This requests the check/staging step and then UBOOT; it does not request an app-area write. Look for **WL82 UBOOT1.00**. Read the flash twice using [jl-uboot-tool](https://github.com/kagaimiq/jl-uboot-tool) on Linux or an elevated Windows terminal:

```sh
python jluboottool.py --device DEVICE --chip wl82 "read 0 0x100000 smk37-backup-1.bin"
python jluboottool.py --device DEVICE --chip wl82 "read 0 0x100000 smk37-backup-2.bin"
python smk37_verify_backup.py smk37-backup-1.bin smk37-backup-2.bin
```

`DEVICE` is the WL82 device (`/dev/sgN` on Linux or `\\.\PhysicalDriveN` on Windows), not another storage disk. Follow the tool's platform instructions. The verifier requires identical 1,048,576-byte dumps and the `trimdat` calibration marker. Keep your unit's backup privately in two places. macOS can run our USB-MIDI installer; this raw SCSI backup procedure needs Linux or Windows.

Power-cycle after the backup. The staged loader may remain in update mode; finish the install with the same package. To stay stock instead, install the original Pro v016 package.

### Install

```sh
/Volumes/SSD/Development/Toolchains/smk37-installer/bin/python smk37_install.py RHYTHMER-OS-SMK37-Pro-0.1.2-smk2.fwsc
```

Confirm the displayed **SMK-37 Pro** model. Keep power and USB connected until writing, reboot and identity verification finish. An interrupted update can be resumed by reconnecting and running the same command. `--info` must then report `SMK-37 Pro_9748025`.

On Windows use Python 3.9+ with `mido` and `python-rtmidi`; run the same script/arguments. Put its virtual environment and caches on your development SSD.

## Physical controls

The printed labels differ from the FM-1. This is the default mapping to verify on the unit:

| Printed control | RHYTHMER function |
|---|---|
| K1 | Master level |
| K2 | SELECT: pages in the current section |
| K3 | ALGORITHM: select track |
| K4 | Presets |
| K5–K8 | Screen's four parameter knobs |
| PATCH | HOME; hold for Menu |
| PARA | EDIT |
| CHORD | ENV |
| NOTE REPEAT | LFO |
| SCALE / FX / GLOBE / ARP / SEQ | SCL / FX / GLO / ARP / SEQ |
| BT | SAVE/project family; this is not Bluetooth pairing |
| SEQ PLAY / SEQ REC | Play/stop / record |
| OCTAVE − / + | Original octave and cancel/confirm actions |
| `<` / `>` | Previous/next page outside dialogs |
| KNOB BANK | Pads PLAY ↔ STEPS; lit in STEPS |
| FADER BANK | LEVEL → PAN → REVERB → DELAY |

All 37 keys use the original note/chord/arp/record path with velocity. With octave zero and no scale remapping they cover MIDI **48–84**; the central 27 retain the FM-1 key functions. The ten outer keys play extra notes, rather than extra menu shortcuts.

Pads are numbered **1–8 on the top row, 9–16 on the bottom row**. PLAY maps them to the original 16 white-key functions, including Break performance rolls. STEPS toggles the current 16-step page; on Rhythmer's drum grid it edits the selected lane. Use the existing SEQ step/page controls for longer patterns. Switching modes while holding pads waits for their release before reopening PLAY, to avoid stray notes. Step hits and the playback position appear on the pad LEDs.

Faders 1–4 control tracks 1–4. Select track 5 or 6 to control tracks 5–6 with faders 1–2; faders 3–4 then do nothing. A fader must cross the stored value before it changes that value. Changing bank, track window or editing the value elsewhere re-arms pickup. Wheels control pitch bend and modulation of the selected track; modulation still needs a patch destination.

## TRS MIDI OUT

The 3.5 mm MIDI OUT works without a USB host or computer. Connect the supplied MIDI adapter to the external synth's MIDI IN. Use its channel 1 for track 1, channel 2 for track 2, through channel 6 for track 6.

Hold PATCH for Menu, find **CONTROL → MIDI OUT** (the MIDI controls), then select:

- **KEYS:** keyboard/chord input, pitch bend and modulation.
- **CLOCK:** keys plus MIDI Clock and Start/Stop when the keyboard uses its internal clock.
- **ALL:** sequencer and arpeggiator notes as well as keys, clock and transport.
- **OFF:** silence held outgoing notes and stop TRS output. KICK LINK remains a USB-only function.

To hear only the external synth, turn that track's LEVEL down; muting a track also suppresses its sequencer MIDI. Changing MIDI OUT mode releases outgoing held notes.

TRS follows the existing MIDI OUT setting; USB MIDI continues to work independently. Editor/update SysEx is not copied to the jack. On a queue overload the driver clears held notes instead of leaving missing note-offs. A nonresponsive UART cannot block sound or the UI; change MIDI OUT OFF and back to recover it. Actual jack signal, adapter wiring and timing still need the owner's hardware test. Prefer the adapter supplied with the keyboard; third-party TRS wiring must match the keyboard.

1. With no USB host, select KEYS and play/release notes and chords on an external synth. Check track channels and the wheels.
2. Select ALL, record a pattern, and check note/arp playback and Stop. Switch track and release a held key; it must release the original track's note.
3. Select CLOCK/ALL with internal clock; check external tempo and Start/Stop, then change to OFF while a note is held.
4. Repeat with USB MIDI/audio active and while striking pads / moving faders. Check no duplicate notes, hanging notes or input/display glitches.

## Hardware test checklist

1. Confirm screen orientation, legibility, all encoders and every printed button against the table. Report any reversed or swapped encoder.
2. Play all 37 keys softly/hard; hold a chord, change track and release it. Check no note remains held accidentally. Test octave, scale, arp, strum and record.
3. Strike all 16 pads in PLAY; check each pad and its LED. Test held Break rolls and release.
4. Enter STEPS; edit all 16 positions, erase some, change page/lane, then play. Check pad numbers, LEDs and the playhead. Switch mode with a pad held.
5. Test all four fader banks and both track windows. Loading a project must not jump to the physical fader positions.
6. Change engines/presets; test sound editing, GEN/Acid/Break navigation and cancel/confirm using the original workflow.
7. Save a named project and user sound, power-cycle, reload and compare notes/parameters. Test an FM6 voice-bank transfer if you use it.
8. Play a dense arrangement for 15 minutes; note CPU/load, crackles, freezes, USB MIDI/audio behaviour and battery operation.

This first candidate targets internal sound, USB MIDI/audio, keys, encoders, pads, faders and wheels. **Pedal sustain and Bluetooth MIDI are not implemented in this port.** FM-1 UART input is disabled because its pin is used by the SMK key matrix. USB host mode needs a powered hub/device; do not assume the keyboard supplies USB bus power. Physical timing, key/pad sensitivity and load must be confirmed on the real unit.

## Return to official firmware / recovery

Obtain **SMK-37_Pro_016.fwsc** for the Pro, not Elite/MKE. [Version archive](https://github.com/jonathaslacerda/smk-37-pro-docs/tree/main/firmware/smk37pro). Expected SHA-256:

`2d98ce72530e71d617384963423820536f094501299e2cfec0a8d3c3fb6bcfb0`

Use M-Vave's official updater, or the supplied script with that file. It understands the official package's 36 interleave blocks and accepts this exact stock file. Rhythmer permits the official loader only when the package head matches the device's retained head. Its success on your unit has not been physically verified; keep the original full dump and follow the [reference backup/recovery guide](https://github.com/genkigenki/fm1-to-smk37/blob/main/docs/02-update-and-recovery.md) if normal USB-MIDI updating is unavailable. Never substitute another unit's calibration/key data.

While booted and stopped, holding OCTAVE − and + for about five seconds requests UBOOT. Holding both while powering on instead enters panel calibration; these are different paths.

## Source and credits

Port by Jazzy Rhythmer. Rhythmer is based on JIANT/Felucca and credits its original authors and engines in the included license/source files. SMK board wiring, input, display and LED layer are adapted from [genkigenki/Felucca, smk37 branch](https://github.com/genkigenki/Felucca/tree/smk37), using the [FM-1 to SMK-37 porting reference](https://github.com/genkigenki/fm1-to-smk37). Original author/license notices are retained. The source archive contains the conditional target and build scripts; `VALIDATION.json` records the exact software-check status and package hash.
