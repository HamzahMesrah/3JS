# Three.js Mixamo Walker

## Setup

1. Download a Mixamo character with its walking animation as FBX and save it as `public/models/character.fbx`. This file provides the walking animation.
2. Download matching `Idle` and `Running` animations and save them as `public/models/Idle.fbx` and `public/models/Running.fbx`.
3. Start a local server from this folder:

   ```bash
   npx serve .
   ```

4. Open the printed URL in a browser.

## Controls

- Arrow keys or `WASD`: move relative to the camera.
- `Shift` + movement key: run.
- Click the scene: lock the cursor and enable camera orbit.
- Move the mouse while the cursor is locked: orbit the camera.
- `Escape`: unlock the cursor.
- Mouse wheel: zoom in or out.

The ground and grid recenter around the character as they move, keeping the map visible beyond the camera range. Shadows follow the character with the directional light. The character uses cross-faded idle, walking, and running animations; if an optional animation file is missing, the available animations continue to work.
