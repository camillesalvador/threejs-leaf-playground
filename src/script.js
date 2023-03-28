import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// DOM selectors
const containerEl = document.querySelector(".webgl");

// Settings
const fontName = "Verdana";
const textureFontSize = 70;
const fontScaleFactor = .075;

// 3D scene related globals
let scene, camera, renderer, textCanvas, textCtx, particleGeometry, particleMaterial, instancedMesh, dummy, clock;
let leafInstancedMesh, leafMaterial;

// String to show
let string = "leaves";

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
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .1, 1000);
  camera.position.set(0,0,18);

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    canvas: containerEl
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enablePan = false;

  textCanvas = document.createElement("canvas");
  textCanvas.width = textCanvas.height = 0;
  textCtx = textCanvas.getContext("2d");

  // Instanced geometry and material
  particleGeometry = new THREE.PlaneGeometry(1.2, 1.2);
  const leafTexture = new THREE.TextureLoader().load('leaf.png');
  leafMaterial = new THREE.MeshBasicMaterial({
      alphaMap: leafTexture,
      opacity: .35,
      depthTest: false,
      transparent: true,
  });


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

  particles = textureCoordinates.map((c, cIdx) => {
    const x = c.x * fontScaleFactor;
    const y = c.y * fontScaleFactor;
    let p = (c.old && particles[cIdx]) ? particles[cIdx] : new Leaf([x, y]);
    if (c.toDelete) {
        p.toDelete = true;
        p.scale = p.maxScale;
    }
    return p;
});

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
  textCtx.font = "10 " + textureFontSize + "px " + fontName;
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
  scene.remove(leafInstancedMesh);
  const totalNumberOfLeafs = particles.length;
  leafInstancedMesh = new THREE.InstancedMesh(particleGeometry, leafMaterial, totalNumberOfLeafs);
  scene.add(leafInstancedMesh);

  let leafIdx = 0;
  particles.forEach(p => {
    leafInstancedMesh.setColorAt(leafIdx, new THREE.Color("hsl(" + p.color + ", 100%, 20%)"));
    leafIdx++;
  })
}


function updateParticlesMatrices() {
  let leafIdx = 0;
  particles.forEach(p => {
      p.grow();
      dummy.quaternion.copy(camera.quaternion);
      dummy.rotation.z += p.rotationZ;
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.position.set(p.x, stringBox.hScene - p.y, p.z);
      dummy.updateMatrix();
      leafInstancedMesh.setMatrixAt(leafIdx, dummy.matrix);
      leafIdx ++;
  })
  leafInstancedMesh.instanceMatrix.needsUpdate = true;
}

function Leaf([x, y]) {
    this.x = x + .2 * (Math.random() - .5);
    this.y = y + .2 * (Math.random() - .5);
    this.z = 0;

    this.color = 100 + Math.random() * 50;

    this.isGrowing = true;
    this.toDelete = false;

    this.scale = 0;
    this.maxScale = .9 * Math.pow(Math.random(), 20);
    this.deltaScale = .03 + .1 * Math.random();
    this.age = Math.PI * Math.random();
    this.ageDelta = .01 + .02 * Math.random();
    this.rotationZ = .5 * Math.random() * Math.PI;

    this.grow = function () {
        this.age += this.ageDelta;
        if (this.isGrowing) {
            this.deltaScale *= .99;
            this.scale += this.deltaScale;
            if (this.scale >= this.maxScale) {
                this.isGrowing = false;
            }
        } else if (this.toDelete) {
            this.deltaScale *= 1.1;
            this.scale -= this.deltaScale;
            if (this.scale <= 0) {
                this.scale = 0;
                this.deltaScale = 0;
            }
        } else {
            this.scale = this.maxScale + .2 * Math.sin(this.age);
            this.rotationZ += .001 * Math.cos(this.age);
        }
    }
}