import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import URDFLoader from 'https://cdn.skypack.dev/urdf-loader';

var gui = new GUI();
let socket = opener.socket;
let model_name = opener.document.getElementById("autowalk_list").value;
var back_img = new Image(),
    left_img = new Image(),
    right_img = new Image();

socket.on('joint_state', (data) => {
  setSpotJoint(data)
});

socket.on('spot_camera_back', (data) => {
  back_img.src= "data:image/png;base64," + data;
});

socket.on('spot_camera_left', (data) => {
  left_img.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_right', (data) => {
  right_img.src = "data:image/png;base64," + data;
});

socket.on('spot_replay_mission_result', (data) => {
  let autowalk = $("#autowalk_list").val()
  window.alert(autowalk + " mission result : " + data)
});

socket.on('go_to_response', (data) => {
  window.alert(data)
})

let camera, scene, renderer, labelRenderer;

var robot = new THREE.Object3D(),
    map = new THREE.Object3D(),
    gpe = new THREE.Object3D(),
    scene_graph = new THREE.Object3D();


const spotLight = new THREE.SpotLight(0xffffff);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)


var back_texture = new THREE.Texture();
var left_texture = new THREE.Texture();
var right_texture = new THREE.Texture();

const geometry = new THREE.PlaneGeometry(1,1);
const back_material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
const left_material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
const right_material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
const back_plane = new THREE.Mesh(geometry, back_material);
const left_plane = new THREE.Mesh(geometry, left_material);
const right_plane = new THREE.Mesh(geometry, right_material);

getAruco();
getWaypoint();

init();
guiSetting();
render();

function init() {

  const container = document.createElement('div');
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 200);
  camera.position.set(2, 2, 2);
  camera.lookAt(0,0,0);
  camera.up.set(0,0,1);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0.05, 0.1, 0.15);
  scene.add(ambientLight);
  scene.add(scene_graph);

  // Load .gltf
  const gltf_loader = new GLTFLoader().setPath('/assets/Export_model/' + model_name);
  gltf_loader.load('/save.gltf', function(gltf){
    map = gltf.scene;
    scene_graph.add(map);
  });
  
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

  // Load .urdf 
  const urdf_loader = new URDFLoader();
  urdf_loader.load('/assets/spot_urdf/urdf/spot.urdf', result => {
    robot = result;

    robot.traverse(c => {
      c.castShadow = true;
    });

    spotLight.position.set(robot.position.x, robot.position.y, robot.position.z + 2.5);
    
    back_plane.position.x = -0.6;
    back_plane.rotation.y = Math.PI * 0.5;
    back_plane.rotation.x = Math.PI * 0.5;
    
    left_plane.position.x = -0.1;
    left_plane.position.y = 0.5;
    left_plane.rotation.x = Math.PI * 0.5;
  
    right_plane.position.x = -0.1;
    right_plane.position.y = -0.5;
    right_plane.rotation.x = Math.PI * -0.5;
    
    back_plane.visible = false
    left_plane.visible = false
    right_plane.visible = false
    robot.visible = false;

    robot.add(back_plane);
    robot.add(left_plane);
    robot.add(right_plane);
    robot.add(spotLight);

    gpe.add(robot);

    scene_graph.add(gpe);
    
    render();
  });

  const button = document.createElement('button')
  button.innerHTML = "Start Mission"
  menu.appendChild(button);

  button.addEventListener('click', startMisson, false);

  window.addEventListener('resize', onWindowResize);

  render();
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
      scene_graph.add(label)
    }

  });
}

function getWaypoint() {
  $.getJSON('/assets/Export_model/' + model_name + '/save.json', function (data) {

    var obj = new Object();
    var waypoint_list = gui.addFolder('waypoint_list');
    waypoint_list.open();

    for (const key in data) {

      obj = { [key]: data[key] }

      const text = document.createElement('div');
      text.setAttribute('id', key)
      text.className = 'label';
      text.style.color = 'rgb(' + 255 + ',' + 255 + ',' + 0 + ')';
      text.textContent = key;

      const label = new CSS2DObject(text);
      label.position.set(obj[key][0], obj[key][1], obj[key][2]);
      scene_graph.add(label);

      const wp = {[key] : generateButtonCallback(key)};
      waypoint_list.add(wp,[key]);
    }

  });

}

function setSpotJoint(data){
  // front leg joint
  robot.setJointValue("front_left_hip_x", data.joint_state.front_left_hip_x)
  robot.setJointValue("front_left_hip_y", data.joint_state.front_left_hip_y)
  robot.setJointValue("front_left_knee", data.joint_state.front_left_knee)
  robot.setJointValue("front_right_hip_x", data.joint_state.front_right_hip_x)
  robot.setJointValue("front_right_hip_y", data.joint_state.front_right_hip_y)
  robot.setJointValue("front_right_knee", data.joint_state.front_right_knee)

  // back leg joint 
  robot.setJointValue("rear_left_hip_x", data.joint_state.rear_left_hip_x)
  robot.setJointValue("rear_left_hip_y", data.joint_state.rear_left_hip_y)
  robot.setJointValue("rear_left_knee", data.joint_state.rear_left_knee)
  robot.setJointValue("rear_right_hip_x", data.joint_state.rear_right_hip_x)
  robot.setJointValue("rear_right_hip_y", data.joint_state.rear_right_hip_y)
  robot.setJointValue("rear_right_knee", data.joint_state.rear_right_knee)
  
  // robot position
  robot.position.x = data.position_state.x
  robot.position.y = data.position_state.y
  robot.position.z = data.position_state.z

  // robot pose (quaternion) 
  robot.quaternion.x = data.rotation_state.x
  robot.quaternion.y = data.rotation_state.y 
  robot.quaternion.z = data.rotation_state.z 
  robot.quaternion.w = data.rotation_state.w 

  gpe.position.z = 0
  robot.updateMatrixWorld(true);
  render();  
}

function startMisson() {
  robot.visible = true;
  opener.startAutowalk(model_name);
}

function generateButtonCallback(waypoint_id) {
  return function(){
    console.log(waypoint_id)
    opener.waypoint_id(model_name, waypoint_id)
    if(!robot.visible){
      robot.visible = true
    }
  }
}

function guiSetting(){
  
  var gui_img_setting = {
    'back image' : false,
    'left image' : false,
    'right image' : false
  }

  var image_folder = gui.addFolder('camera_image');
  
  image_folder.add(gui_img_setting, 'back image').onChange(back_visible);
  image_folder.add(gui_img_setting, 'left image').onChange(left_visible);
  image_folder.add(gui_img_setting, 'right image').onChange(right_visible);
  image_folder.open();

  back_texture.image = back_img;
  left_texture.image = left_img;
  right_texture.image = right_img;

  back_material.map = back_texture;
  back_material.needsUpdate = true;

  left_material.map = left_texture;
  left_material.needsUpdate = true;

  right_material.map = right_texture;
  right_material.needsUpdate = true;
}

function back_visible(visibility){ 
  back_plane.visible = visibility;
  render();
}
function left_visible(visibility){ 
  left_plane.visible = visibility;
  render();
}
function right_visible(visibility){ 
  right_plane.visible = visibility;
  render();
}

back_img.onload = function(){
  back_texture.needsUpdate= true;
  render()
};

left_img.onload = function(){
  left_texture.needsUpdate= true;
  render()
};

right_img.onload = function(){
  right_texture.needsUpdate= true;
  render()
};

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

