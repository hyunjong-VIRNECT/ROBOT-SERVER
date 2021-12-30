import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import {GUI} from 'three/examples/jsm/libs/dat.gui.module';
import URDFLoader from 'https://cdn.skypack.dev/urdf-loader';

var gui = new GUI(); // Three.js GUI 생성
let socket = opener.socket; // socket.io client object
let model_name = opener.document.getElementById("autowalk_list").value; // 렌더링 중인 gltf (Autowalk 이름)
var back_img = new Image(),
    left_img = new Image(),
    right_img = new Image();

/**
 * @brief 서버로부터 로봇의 position, rotation, joint state 에 대한 값을 수신하는 소켓 메시지, 
 *        setSpotJoint 함수를 호출하여 해당 값을 기반으로 로봇의 위치,회전정보,관절 상태를 실시간으로 시각화
 * @param data 로봇의 positon, rotation, joint state 가 담긴 json object
 */
socket.on('joint_state', (data) => {
  setSpotJoint(data)
});

/**
 * @brief 서버로부터 로봇의 후면 카메라 fisheye 이미지 데이터를 수신하는 소켓 메시지
 * @param data base64 형태로 인코딩된 후면 카메라 fisheye 이미지 데이터
 */
socket.on('spot_camera_back', (data) => {
  back_img.src= "data:image/png;base64," + data;
});

/**
 * @brief 서버로부터 로봇의 좌측 카메라 fisheye 이미지 데이터를 수신하는 소켓 메시지
 * @param data base64 형태로 인코딩된 좌측 카메라 fisheye 이미지 데이터
 */
socket.on('spot_camera_left', (data) => {
  left_img.src = "data:image/png;base64," + data;
});

/**
 * @brief 서버로부터 로봇의 우측 카메라 fisheye 이미지 데이터를 수신하는 소켓 메시지
 * @param data base64 형태로 인코딩된 우측 카메라 fisheye 이미지 데이터
 */
socket.on('spot_camera_right', (data) => {
  right_img.src = "data:image/png;base64," + data;
});

/**
 * @brief 재생을 요청한 Autowalk에 대한 결과값을 수신하는 메시지
 * @param data 미션 결과에 대한 string 메시지
 */
socket.on('spot_replay_mission_result', (data) => {
  let autowalk = $("#autowalk_list").val()
  window.alert(autowalk + " mission result : " + data) // 메시지 수신 시 alert 창 표출
});

/**
 * @brief Waypoint 이동 명령 요청에 대한 결과값을 수신하는 메시지
 * @param data 이동 명령 결과에 대한 string 메시지
 */
socket.on('go_to_response', (data) => {
  window.alert(data) // 메시지 수신 시 alert 창 표출
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

const back_plane = new THREE.Mesh(geometry, back_material); // 로봇 후면에 카메라 이미지를 그려줄 Mesh
const left_plane = new THREE.Mesh(geometry, left_material); // 로봇 좌측에 카메라 이미지를 그려줄 Mesh
const right_plane = new THREE.Mesh(geometry, right_material); // 로봇 우측에 카메라 이미지를 그려줄 Mesh

getAruco();
getWaypoint();

init();
guiSetting();
render();

/**
 * @brief 렌더링 페이지 필요한 정보 초기화 함수
 */
function init() {

  const container = document.createElement('div');
  document.body.appendChild(container);

  // Three.js Camera 생성
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 200);
  camera.position.set(2, 2, 2);
  camera.lookAt(0,0,0);
  camera.up.set(0,0,1);

  // Three.js Scene 생성
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0.05, 0.1, 0.15);
  scene.add(ambientLight);
  scene.add(scene_graph);

  // GLTFLoader 생성 및 gltf 파일 불러오기
  const gltf_loader = new GLTFLoader().setPath('/assets/Export_model/' + model_name);
  gltf_loader.load('/save.gltf', function(gltf){
    map = gltf.scene;
    scene_graph.add(map);
  });
  
  // Renderer 사이즈, 속성 설정 및 생성
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Waypoint 위치, 마커 위치에 렌더링할 2D Renderer 생성
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  document.getElementById('container').appendChild(labelRenderer.domElement);

  // Renderer 내부에서 사용되는 마우스 이벤트에 대한 OrbitControls 생성
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render); // use if there is no animation loop , 마우스 이벤트가 발생할 때 마다 render() 함수 호출
  controls.minDistance = 2;
  controls.maxDistance = 1000;
  controls.target.set(0, 0, - 0.2);
  controls.update();

  // URDFLoader 생성 및 urdf 파일 불러오기 
  const urdf_loader = new URDFLoader();
  urdf_loader.load('/assets/spot_urdf/urdf/spot.urdf', result => {
    // 서버 디렉토리에 저장되어 있는 spot.urdf 호출
    robot = result;

    // 로봇 관절에 대한 그림자 생성 
    robot.traverse(c => {
      c.castShadow = true;
    });

    spotLight.position.set(robot.position.x, robot.position.y, robot.position.z + 2.5);
    
    // 로봇 urdf 기준으로, 로봇 후면에 그려줄 plane 설정 (후면 카메라 fisheye 이미지 렌더링)
    back_plane.position.x = -0.6;
    back_plane.rotation.y = Math.PI * 0.5;
    back_plane.rotation.x = Math.PI * 0.5;
    
    // 로봇 urdf 기준으로, 로봇 좌측에 그려줄 plane 설정 (좌측 카메라 fisheye 이미지 렌더링)
    left_plane.position.x = -0.1;
    left_plane.position.y = 0.5;
    left_plane.rotation.x = Math.PI * 0.5;
  
    // 로봇 urdf 기준으로, 로봇 우측에 그려줄 plane 설정 (우측 카메라 fisheye 이미지 렌더링)
    right_plane.position.x = -0.1;
    right_plane.position.y = -0.5;
    right_plane.rotation.x = Math.PI * -0.5;
    
    back_plane.visible = false
    left_plane.visible = false
    right_plane.visible = false
    robot.visible = false;

    // Scene graph 구조 설정
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

/** 
 * @brief 맵 내부의 마커 위치 정보를 포함하는 json 파일을 읽고, 해당 위치에 2D 기반의 Renderer를 생성하는 함수
 * @param data 마커 위치 정보(x,y,z)를 담고있는 json string
 */
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

/**
 * @brief 맵 내부의 Waypoint 위치 정보를 포함하는 json 파일을 읽고, 해당 위치에 2D 기반의 Renderer를 생성하는 함수
 * @param data Waypoint 위치 정보(x,y,z)를 담고있는 json string
 */
function getWaypoint() {
  $.getJSON('/assets/Export_model/' + model_name + '/save.json', function (data) {

    var obj = new Object();
    var waypoint_list = gui.addFolder('waypoint_list'); // 전체 waypoint 리스트에 대한 guiFolder 생성
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

/**
 * @brief 로봇의 position, rotation, joint에 대한 정보를 적용하여 로봇의 위치를 시각화하는데 사용되는 함수
 * @param data position, rotation, joint에 대한 정보가 담긴 json object 
 */
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

/**
 * @brief 현재 시각화 중인 gltf 맵의 Autowalk 재생을 요청하는 함수
 * @param model_name Autowalk 맵 이름 
 */
function startMisson() {
  robot.visible = true;
  opener.startAutowalk(model_name);
}

/**
 * @brief Waypoint 리스트에 대한 이벤트 생성 함수, 버튼 클릭시 waypoint 이동 요청에 대한 소켓 메시지를 서버에게 전송
 * @param waypoint_id Waypoint id 
 */
function generateButtonCallback(waypoint_id) {
  return function(){
    console.log(waypoint_id)
    opener.waypoint_id(model_name, waypoint_id)
    if(!robot.visible){
      robot.visible = true
    }
  }
}

/**
 * @brief Three.js gui에 대한 초기화 함수 (Waypoint 리스트 표출, 이미지 시각화 여부 표출) 
 */
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

/**
 * @brief 후면 카메라 fisheye 이미지를 렌더링할 plane 에 대한 visible 설정
 * @param visibility visible 에 대한 True/False
 */
function back_visible(visibility){ 
  back_plane.visible = visibility;
  render();
}

/**
 * @brief 좌측 카메라 fisheye 이미지를 렌더링할 plane 에 대한 visible 설정
 * @param visibility visible 에 대한 True/False
 */
function left_visible(visibility){ 
  left_plane.visible = visibility;
  render();
}

/**
 * @brief 우측 카메라 fisheye 이미지를 렌더링할 plane 에 대한 visible 설정
 * @param visibility visible 에 대한 True/False
 */
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

/**
 * @brief 웹페이지 resize 이벤트 발생시 호출되는 함수, 웹페이지 크기가 변할때마다 카메라, 렌더러 크기를 재설정하는 기능
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

/**
 * @brief Three.js render 호출 함수
 */
function render() {
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera)
}

