import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// DOM selectors
const containerEl = document.querySelector(".webgl");

// Settings
const fontName = "Verdana";
const textureFontSize = 20;
const fontScaleFactor = 0.5;

// 3D scene related globals
let scene, camera, renderer, textCanvas, textCtx, particleGeometry, particleMaterial, instancedMesh, dummy, clock;

// String to show
let string = "leaf";

// Coordinates data per 2D canvas and 3D scene
let textureCoordinates = [];
let particles = [];

// Parameters of whole string per 2D canvas and 3D scene
let stringBox = {
  wTexture: 0,
  wScene: 0,
  hTexture: 0,
  hScene: 0
};

// ---------------------------------------------------------------

init();
createEvents();
refreshText();
render();

// ---------------------------------------------------------------

function init() {
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 100);

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    canvas: containerEl
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enablePan = false;

  textCanvas = document.createElement("canvas");
  textCanvas.width = textCanvas.height = 0;
  textCtx = textCanvas.getContext("2d");

  // Instanced geometry and material
  particleGeometry = new THREE.TorusGeometry(0.35, 0.15, 16, 50);
  particleMaterial = new THREE.MeshNormalMaterial({});

  dummy = new THREE.Object3D();
  clock = new THREE.Clock();
}

// ---------------------------------------------------------------

function createEvents() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ---------------------------------------------------------------

function render() {
  requestAnimationFrame(render);
  updateParticlesMatrices();
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------

function refreshText() {
  sampleCoordinates();
  textureCoordinates = textureCoordinates.map((c) => {
    return { x: c.x * fontScaleFactor, y: c.y * fontScaleFactor };
  });
  const maxX = textureCoordinates.map((v) => v.x).sort((a, b) => b - a)[0];
  const maxY = textureCoordinates.map((v) => v.y).sort((a, b) => b - a)[0];
  stringBox.wScene = maxX;
  stringBox.hScene = maxY;

  particles = textureCoordinates.map(c => 
    new Particle([c.x * fontScaleFactor, c.y * fontScaleFactor])
  );

  createInstancedMesh();
  updateParticlesMatrices();
}

// ---------------------------------------------------------------
// Input string to textureCoordinates

function sampleCoordinates() {
  // Parse text
  const lines = string.split(`\n`);
  const linesMaxLength = [...lines].sort((a, b) => b.length - a.length)[0]
    .length;
  stringBox.wTexture = textureFontSize * 0.7 * linesMaxLength;
  stringBox.hTexture = lines.length * textureFontSize;

  // Draw text
  const linesNumber = lines.length;
  textCanvas.width = stringBox.wTexture;
  textCanvas.height = stringBox.hTexture;
  textCtx.font = "100 " + textureFontSize + "px " + fontName;
  textCtx.fillStyle = "#2a9d8f";
  textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  for (let i = 0; i < linesNumber; i++) {
    textCtx.fillText(
      lines[i],
      0,
      ((i + 0.8) * stringBox.hTexture) / linesNumber
    );
  }

  // Sample coordinates
  textureCoordinates = [];
  if (stringBox.wTexture > 0) {
    const imageData = textCtx.getImageData(
      0,
      0,
      textCanvas.width,
      textCanvas.height
    );
    for (let i = 0; i < textCanvas.height; i++) {
      for (let j = 0; j < textCanvas.width; j++) {
        if (imageData.data[(j + i * textCanvas.width) * 4] > 0) {
          textureCoordinates.push({
            x: j,
            y: i
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------
// Handle points

function createInstancedMesh() {
  instancedMesh = new THREE.InstancedMesh(particleGeometry, particleMaterial, textureCoordinates.length);
  scene.add(instancedMesh);

  // centralize it in the same way as before
  instancedMesh.position.x = -.5 * stringBox.wScene;
  instancedMesh.position.y = -.5 * stringBox.hScene;
}


function updateParticlesMatrices() {
  let idx = 0;
  // textureCoordinates.forEach(p => {
    particles.forEach(p => {

      // update particles data
      p.grow();

      // we apply samples coordinates like before + some random rotation
      // dummy.rotation.set(2 * Math.random(), 2 * Math.random(), 2 * Math.random());
      dummy.rotation.set(p.rotationX, p.rotationY, p.rotationZ);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.position.set(p.x, stringBox.hScene - p.y, p.z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);
      idx ++;
  })
  instancedMesh.instanceMatrix.needsUpdate = true;
}

function Particle([x, y]) {
  this.x = x;
  this.y = y;
  this.z = 0;
  this.rotationX = Math.random() * 2 * Math.PI;
  this.rotationY = Math.random() * 2 * Math.PI;
  this.rotationZ = Math.random() * 2 * Math.PI;
  this.scale = 0;
  this.deltaRotation = .2 * (Math.random() - .5);
  this.deltaScale = .01 + .2 * Math.random();
  this.grow = function () {
      this.rotationX += this.deltaRotation;
      this.rotationY += this.deltaRotation;
      this.rotationZ += this.deltaRotation;
      if (this.scale < 1) {
          this.scale += this.deltaScale;
      }
  }
}