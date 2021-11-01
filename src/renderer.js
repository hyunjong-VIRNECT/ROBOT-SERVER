import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

let camera, scene, root, renderer, labelRenderer;
let model_name = opener.document.getElementById("autowalk_list").value;

getAruco();

getWaypoint();

init();

function init() {

  const container = document.createElement('div');
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 200);
  camera.position.set(0.8, 0.6, 3.0);
  camera.up = new THREE.Vector3(0, 0, 1);

  scene = new THREE.Scene();
  root = new THREE.Group();
  scene.background = new THREE.Color(0.05, 0.1, 0.15);
  scene.add(root);

  loadGLTF();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  document.getElementById('container').appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render); // use if there is no animation loop
  controls.minDistance = 2;
  controls.maxDistance = 1000;
  controls.target.set(0, 0, - 0.2);
  controls.update();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(1, 1, 1);
  root.add(light);

  window.addEventListener('resize', onWindowResize);
}

function getAruco() {
  $.getJSON('/assets/Export_model/' + model_name + '/aruco.json', function (data) {

    var obj = new Object();

    for (const key in data) {

      obj = { [key]: data[key] }

      const text = document.createElement('div');
      text.setAttribute('id', key)
      text.className = 'label';
      text.style.color = 'rgb(' + 0 + ',' + 255 + ',' + 0 + ')';
      text.textContent = key;

      const label = new CSS2DObject(text);
      label.position.set(obj[key][0], obj[key][1], obj[key][2]);

      root.add(label);

    }

  });
}

function getWaypoint() {
  $.getJSON('/assets/Export_model/' + model_name + '/save.json', function (data) {

    var obj = new Object();

    for (const key in data) {

      obj = { [key]: data[key] }

      const text = document.createElement('div');
      text.setAttribute('id', key)
      text.className = 'label';
      text.style.color = 'rgb(' + 255 + ',' + 255 + ',' + 0 + ')';
      text.textContent = key;

      const label = new CSS2DObject(text);
      label.position.set(obj[key][0], obj[key][1], obj[key][2]);

      root.add(label);

    }

  });

}

function loadGLTF() {

  const loader = new GLTFLoader().setPath('/assets/Export_model/' + model_name);

  loader.load('/save.gltf', function (gltf) {
    root.add(gltf.scene);
    render();
  });

  const button = document.createElement('button')
  button.innerHTML = "Start Mission"
  menu.appendChild(button);

  button.addEventListener('click', startMisson, false);
}

function startMisson() {
  opener.startAutowalk(model_name)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function render() {
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera)
}