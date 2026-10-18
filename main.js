import * as THREE from 'three';

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const status = document.querySelector('#status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10182a);
scene.fog = new THREE.Fog(0x10182a, 25, 90);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 4.2, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xa9c8ff, 0x334422, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(7, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

// Keep the recentered tile larger than the camera's visible range so its edge
// stays beyond the fog while the character moves through the world.
const mapSize = 1000;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(mapSize, mapSize), new THREE.MeshStandardMaterial({ color: 0x26354a, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(mapSize, 200, 0x52709d, 0x31435e);

grid.position.y = 0.01;
scene.add(grid);

const keys = new Set();

let cameraDistance = 7.5;
let orbitYaw = 0;
let orbitPitch = 0.35;
addEventListener('keydown', e => {
    if (e.key.startsWith('Arrow')) e.preventDefault();
    keys.add(e.key);
});
addEventListener('keyup', e => keys.delete(e.key));
addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => {
    if (document.hidden) keys.clear();
});
addEventListener('wheel', e => {
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + e.deltaY * 0.01, 3.5, 15);
}, { passive: true });
addEventListener('pointermove', e => {
    if (document.pointerLockElement === renderer.domElement) {
        orbitYaw -= e.movementX * 0.004;
        orbitPitch = THREE.MathUtils.clamp(orbitPitch + e.movementY * 0.003, -0.2, 1.1);
    }
});
renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock());

let character, mixer, walkAction, idleAction, runAction;
const clock = new THREE.Clock();
const direction = new THREE.Vector3();
const targetCamera = new THREE.Vector3();

function playAction(nextAction) {
    if (!nextAction || nextAction.isRunning()) return;
    const current = runAction?.isRunning() ? runAction
        : walkAction?.isRunning() ? walkAction
            : idleAction?.isRunning() ? idleAction : null;
    if (current) current.fadeOut(0.15);
    nextAction.reset().fadeIn(0.15).play();
}
new FBXLoader().load('./public/models/character.fbx', object => {
    character = object;
    character.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    character.scale.setScalar(0.01);
    scene.add(character);
    mixer = new THREE.AnimationMixer(character);
    const clip = object.animations.find(animation => /walk/i.test(animation.name)) ?? object.animations[0];
    if (clip) walkAction = mixer.clipAction(clip);
    playAction(walkAction);
    new FBXLoader().load('./public/models/idle.fbx?v=2', idleObject => {
        if (idleObject.animations[0]) {
            idleAction = mixer.clipAction(idleObject.animations[0]);
            playAction(idleAction);
            status.textContent = 'Ready — arrows/WASD walk, Shift runs';
        }
    }, undefined, () => {
        status.textContent = 'Ready — add idle.fbx for standing mode';
    });
    new FBXLoader().load('./public/models/Running.fbx', runningObject => {
        const clip = runningObject.animations.find(animation => /run/i.test(animation.name)) ?? runningObject.animations[0];
        if (clip) runAction = mixer.clipAction(clip);
    }, undefined, () => {
        status.textContent = 'Ready — add Running.fbx for running mode';
    });
}, undefined, () => {
    status.textContent = 'Add your Mixamo file at public/models/character.fbx';
});

function updateCharacter(delta) {
    if (!character) return;
    direction.set(0, 0, 0);
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) direction.z -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) direction.z += 1;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) direction.x -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) direction.x += 1;
    const moving = direction.lengthSq() > 0;
    if (moving) {
        direction.normalize();
        const inputX = direction.x;
        const inputZ = direction.z;
        const sinYaw = Math.sin(orbitYaw);
        const cosYaw = Math.cos(orbitYaw);
        direction.set(
            inputX * cosYaw + inputZ * sinYaw,
            0,
            -inputX * sinYaw + inputZ * cosYaw,
        );
        const running = keys.has('Shift');
        character.position.addScaledVector(direction, (running ? 9 : 3.2) * delta);
        character.rotation.y = Math.atan2(direction.x, direction.z);
        playAction(running && runAction ? runAction : walkAction);
    } else {
        playAction(idleAction);
        if (!idleAction && walkAction) walkAction.paused = true;
    }
}
function updateCamera() {
    if (!character) return;
    const tileX = Math.floor(character.position.x / mapSize + 0.5) * mapSize;
    const tileZ = Math.floor(character.position.z / mapSize + 0.5) * mapSize;
    ground.position.set(tileX, 0, tileZ);
    grid.position.set(tileX, 0.01, tileZ);

    sun.position.set(character.position.x + 7, character.position.y + 12, character.position.z + 5);
    sun.target.position.copy(character.position);
    sun.target.updateMatrixWorld();

    const horizontalDistance = Math.cos(orbitPitch) * cameraDistance;
    targetCamera.set(
        character.position.x + Math.sin(orbitYaw) * horizontalDistance,
        character.position.y + 1.8 + Math.sin(orbitPitch) * cameraDistance,
        character.position.z + Math.cos(orbitYaw) * horizontalDistance,
    );
    camera.position.lerp(targetCamera, 0.08);
    camera.lookAt(character.position.x, character.position.y + 1.2, character.position.z);
}
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (mixer) mixer.update(delta);
    updateCharacter(delta);
    updateCamera();
    renderer.render(scene, camera);
} animate();

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

