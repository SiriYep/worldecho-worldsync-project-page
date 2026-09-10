# World-model interface preview

This is a working local UI preview, as requested, with inference deferred. It does not send commands, start a service, or synthesize a rollout. The model output starts empty and Generate rollout is disabled.

## Supported interactions

- Choose Grab roller, Handover block, or Place bread in basket. Changing scenes clears the previous draft and recorded example.
- Select the left or right arm. Commands retain their original arm when switching controls.
- Translate by 1, 2, or 5 cm; rotate by 5, 10, or 15 degrees; open or close the gripper.
- Add commands by clicking or using the displayed keys while focus is within Action controls. Repeated keydown events, modifier shortcuts, and typing within selects do not add commands. Keyboard activity elsewhere on the page does not change the draft.
- Undo the last command, reset the draft, or download a JSON draft. Each sequence supports at most 48 commands.
- Inspect each arm's accumulated UI deltas and gripper setting. These numbers are command summaries, not measured or simulated robot poses. Rotation sums are not SE(3) composition.
- Play an existing simulator example separately. Editing the draft does not affect this recording. Hiding the example or resetting clears its media source; out-of-view playback pauses.

## Media provenance

All media already exists in this repository. The reference PNGs were checked against their corresponding simulator videos and match the following zero-based frames at 30 fps:

| Scene | Reference PNG | Source recording | Frame |
| --- | --- | --- | --- |
| Grab roller | `assets/posters/grab-gt.png` | `assets/videos/grab-gt.mp4` | 22 |
| Handover block | `assets/posters/handover-gt.png` | `assets/videos/handover-gt.mp4` | 20 |
| Place bread in basket | `assets/posters/bread-gt.png` | `assets/videos/bread-gt.mp4` | 20 |

These are reference frames from existing experiment recordings, not verified initial observations and not paper figures. They remain uncropped. The optional video is explicitly labeled Recorded simulator rollout / Example recording, with a note that it was not generated from the current actions.

## Export and future integration

`wm-preview-state.js` provides validated immutable state operations and JSON serialization. Exports use `worldsync-ui-preview/v1`, `mode: interface-preview`, and `executed: false`. Translation values use meters and rotations use radians. `actionSpace: ui-end-effector-delta` identifies a UI-only schema; the export includes the reference asset, frame index, and frame rate.

Before connecting inference, agree the actual model deployment, initial observations and camera inputs, coordinate frames, rotation representation, action timing, gripper convention, and transport. Add an explicit adapter instead of treating these UI deltas as the model's native commands. Keep prerecorded examples separate from service results, and handle loading, cancellation, errors, and stale responses when a scene changes. No endpoint, credentials, or dependency on the local GE-Sim implementation is included in this preview.
