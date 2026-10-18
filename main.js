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
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xa9c8ff, 0x334422, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(7, 12, 5);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x26354a, roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(160, 80, 0x52709d, 0x31435e);

grid.position.y = 0.01;
scene.add(grid);

const keys = new Set();

let cameraDistance = 7.5;
addEventListener('keydown', e => {
    if (e.key.startsWith('Arrow')) e.preventDefault();
    keys.add(e.key);
});
addEventListener('keyup', e => keys.delete(e.key));
addEventListener('wheel', e => {
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + e.deltaY * 0.01, 3.5, 15);
}, { passive: true });

let character, mixer, walkAction, idleAction;
const clock = new THREE.Clock();
const direction = new THREE.Vector3();
const targetCamera = new THREE.Vector3();

function playAction(nextAction) {
    if (!nextAction || nextAction.isRunning()) return;
    const current = walkAction?.isRunning() ? walkAction : idleAction?.isRunning() ? idleAction : null;
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
            status.textContent = 'Ready — arrow keys walk, idle when stopped';
        }
    }, undefined, () => {
        status.textContent = 'Ready — add idle.fbx for standing mode';
    });
}, undefined, () => {
    status.textContent = 'Add your Mixamo file at public/models/character.fbx';
});

function updateCharacter(delta) {
    if (!character) return;
    direction.set(0, 0, 0);
    if (keys.has('ArrowUp')) direction.z -= 1;
    if (keys.has('ArrowDown')) direction.z += 1;
    if (keys.has('ArrowLeft')) direction.x -= 1;
    if (keys.has('ArrowRight')) direction.x += 1;
    const moving = direction.lengthSq() > 0;
    if (moving) {
        direction.normalize();
        character.position.addScaledVector(direction, 3.2 * delta);
        character.rotation.y = Math.atan2(direction.x, direction.z);
        playAction(walkAction);
    } else {
        playAction(idleAction);
        if (!idleAction && walkAction) walkAction.paused = true;
    }
}
function updateCamera() {
    if (!character) return;
    targetCamera.set(character.position.x, character.position.y + 3.8, character.position.z + cameraDistance);
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

