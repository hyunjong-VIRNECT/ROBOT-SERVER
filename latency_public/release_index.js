//Spot Control Key
var spot_control_keycode = 
{
  w     : 87,
  a     : 65,
  s     : 83,
  d     : 68,
  q     : 81,
  e     : 69
}

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);
 
function onKeyDown(event) 
{
  var keyCode = event.keyCode;
  switch (keyCode) 
  {
    case spot_control_keycode.d:
      keyD = true;
      break;
    case spot_control_keycode.s:
      keyS = true;
      break;
    case spot_control_keycode.a:
      keyA = true;
      break;
    case spot_control_keycode.w:
      keyW = true;
      break;
    case spot_control_keycode.q:
      keyQ = true;
      break;
    case spot_control_keycode.e:
      keyE = true;
      break;
  }
}
 
function onKeyUp(event) 
{
  var keyCode = event.keyCode;
  switch (keyCode) 
  {
    case spot_control_keycode.d:
      keyD = false;
      break;
    case spot_control_keycode.s:
      keyS = false;
      break;
    case spot_control_keycode.a:
      keyA = false;
      break;
    case spot_control_keycode.w:
      keyW = false;
      break;
    case spot_control_keycode.q:
      keyQ = false;
      break;
    case spot_control_keycode.e:
      keyE = false;
      break; 
  }
}
 
var v_x=0.0, v_y=0.0, v_rot=0.0
var yaw=0.0, roll=0.0, pitch=0.0

var keyW = false;
var keyA = false;
var keyS = false;
var keyD = false;
var keyQ = false;
var keyE = false;
 
setInterval(function()
{
  if(keyD) 
  {
    v_rot = -0.5
  }
  if(keyS) 
  {
    v_x = -0.5
  }
  if(keyA) 
  {
    v_rot = 0.5
  }
  if(keyW) 
  {
    v_x = 0.5
  }
  if(keyQ) 
  {
    v_y = 0.5
  }
  if(keyE) 
  {
    v_y = -0.5
  }

  if(v_x!=0.0 || v_y!=0.0 || v_rot!=0.0)
  {
    socket.emit('spot_drive_cmd', [v_x, v_y, v_rot])
    v_x = 0.0 , v_y = 0.0, v_rot = 0.0
  } 
}, 300);


//Robot State 정보
var motor_power, estop_state

//socket
const socket = io({transports: ['websocket'], upgrade: false}).connect('http://localhost:3458');

//사용자 구분(socket client info object)
const client_info = new Object()

//Remote WebClient 인증 하드코딩
client_info.remoteId = "REMOTE" 

//사용자 구분을 위해 client_info object를 서버에 전송
socket.on('connect', () => 
{
  socket.emit('web_client_id', client_info)
});

socket.on('disconnect', () => 
{

});

// 서버와의 연결 여부 확인 메시지 입니다.
socket.on('connect_response', function(data){
  if(data){
    window.alert("REMOTE 연결")
  }else{
    window.alert("이미 연결중인 REMOTE 계정이 있습니다")
  }
});

// 스팟 연결 여부 확인 메시지 입니다.
socket.on('spot_connect_response', function(data){
  if(data){
    console.log('spot 연결 완료')
  }else{
    console.log('spot 연결 실패')
  }
})

//spot control function
function spot_control_estop()
{
  socket.emit('spot_control_estop');
};

function spot_control_power_on()
{
  socket.emit('spot_control_power_on');
};

function spot_control_sit()
{
  socket.emit('spot_control_sit');
};

function spot_control_stand()
{
  socket.emit('spot_control_stand');
};

function spot_control_power_off()
{
  socket.emit('spot_control_power_off');
};

//element
var input_text_error   = document.getElementById("text_spot_error_message")
var input_text_battery = document.getElementById("text_battery")
var btn_estop          = document.getElementById('btn_spot_control_estop')
var btn_power_on       = document.getElementById('btn_spot_control_power_on')
var btn_power_off      = document.getElementById('btn_spot_control_power_off')
var btn_sit            = document.getElementById('btn_spot_control_sit')
var btn_stand          = document.getElementById('btn_spot_control_stand')

var yaw_slider = document.getElementById('yaw_slider');
var roll_slider = document.getElementById('roll_slider');
var pitch_slider = document.getElementById('pitch_slider');

rangesliderJs.create(yaw_slider, {
  min: -0.5, 
  max: 0.5, 
  value: 0.0, 
  step: 0.05,
  onSlideEnd: (value, percent, position) => {
    yaw = value
    socket.emit('spot_pose_cmd', [yaw, roll, pitch])
  }
});

rangesliderJs.create(roll_slider, {
  min: -0.5, 
  max: 0.5, 
  value: 0.0, 
  step: 0.05,
  onSlideEnd: (value, percent, position) => {
    roll = value
    socket.emit('spot_pose_cmd', [yaw, roll, pitch])
  }
});

rangesliderJs.create(pitch_slider, {
  min: -0.5, 
  max: 0.5, 
  value: 0.0, 
  step: 0.05,
  onSlideEnd: (value, percent, position) => {
    pitch = value
    socket.emit('spot_pose_cmd', [yaw, roll, pitch])
  }
});


//spot camera image resource
var camera_resource_front_R = new Image(); 
var camera_resource_front_L = new Image();
var camera_resource_left    = new Image();
var camera_resource_right   = new Image();
var camera_resource_back    = new Image();

//spot camera image canvas
var camera_canvas_front_R = document.getElementById("camera_stream_front_R").getContext("2d"); 
var camera_canvas_front_L = document.getElementById("camera_stream_front_L").getContext("2d");
var camera_canvas_left    = document.getElementById("camera_stream_left").getContext("2d");
var camera_canvas_right   = document.getElementById("camera_stream_right").getContext("2d");
var camera_canvas_back    = document.getElementById("camera_stream_back").getContext("2d");

socket.on('running_state', function(data){
  // data.battery : battery , data.estop : ESTOP , data.power : power_state
  
  battery_state = data.battery
  estop_state   = data.estop
  motor_power   = data.power

  input_text_battery.value = battery_state + "%"

  if(estop_state == "ESTOPPED")
  {
    btn_power_off.disabled = true
    btn_power_on.disabled  = true
    btn_sit.disabled       = true
    btn_stand.disabled     = true
    btn_estop.disabled     = false
  }
  else if(estop_state == "NOT_ESTOPPED")
  { // ESTOP 아닌 상태, motor
    if(motor_power == "ON")
    {
      btn_power_off.disabled = false
      btn_power_on.disabled  = true
      btn_sit.disabled       = false
      btn_stand.disabled     = false
    }
    else if(motor_power == "OFF")
    {
      btn_power_on.disabled  = false
      btn_power_off.disabled = true
      btn_sit.disabled       = true
      btn_stand.disabled     = true
    }
    btn_estop.disabled = false
  }
});


//receive error message
socket.on('spot_error_message', (data) =>
{
  input_text_error.value = data;
});

//receive camera img resource
socket.on('spot_camera_front_R', (data) => 
{
  camera_resource_front_R.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_front_L', (data) => 
{
  camera_resource_front_L.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_left', (data) => 
{
  camera_resource_left.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_right', (data) => 
{
  camera_resource_right.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_back', (data) => 
{
  camera_resource_back.src = "data:image/png;base64," + data;
});

//camera_canvas_onload
camera_resource_front_R.onload = function()
{
  camera_canvas_front_R.clearRect(0,0,480,640);
  camera_canvas_front_R.save();
  camera_canvas_front_R.translate(240, 320);
  camera_canvas_front_R.rotate(90*Math.PI/180);
  camera_canvas_front_R.drawImage(camera_resource_front_R, -320, -240);
  camera_canvas_front_R.restore();
}

camera_resource_front_L.onload = function()
{
  camera_canvas_front_L.clearRect(0,0,480,640);
  camera_canvas_front_L.save();
  camera_canvas_front_L.translate(240, 320);
  camera_canvas_front_L.rotate(90*Math.PI/180);
  camera_canvas_front_L.drawImage(camera_resource_front_L, -320, -240);
  camera_canvas_front_L.restore();
}

camera_resource_left.onload = function()
{
  camera_canvas_left.drawImage(camera_resource_left, 0, 0);
}

camera_resource_right.onload = function()
{
  camera_canvas_right.clearRect(0,0,640,480);
  camera_canvas_right.save();
  camera_canvas_right.translate(320, 240);
  camera_canvas_right.rotate(180*Math.PI/180);
  camera_canvas_right.drawImage(camera_resource_right, -320, -240);
  camera_canvas_right.restore();
}

camera_resource_back.onload = function()
{
  camera_canvas_back.drawImage(camera_resource_back, 0, 0);
}
