# Three.js Mixamo Walker

1. In Mixamo, choose **Download → Format: FBX** and include the walking animation.
2. Copy the downloaded file to `public/models/character.fbx`.
3. Download Mixamo’s **Idle** animation using the same character and copy it to `public/models/idle.fbx`.
4. Start a local server in this folder: `npx serve .`
5. Open the printed URL.

The example uses `FBXLoader`, plays `idle.fbx` when no arrow key is pressed, cross-fades to the walking clip while moving, rotates the character toward movement, and follows it with the camera. The `0.01` scale compensates for Mixamo FBX units. If `idle.fbx` is absent, the walk animation is paused when movement stops.

Use the arrow keys to walk and the mouse wheel to zoom the camera. The character plays the idle animation when stopped and the walk animation while moving.
