//wasd element
var input_text_battery = document.getElementById('text_battery')
var btn_estop = document.getElementById('btn_spot_control_estop')
var btn_power_on = document.getElementById('btn_spot_control_power_on')
var btn_power_off = document.getElementById('btn_spot_control_power_off')
var btn_sit = document.getElementById('btn_spot_control_sit')
var btn_stand = document.getElementById('btn_spot_control_stand')
var yaw_slider = document.getElementById('yaw_slider');
var roll_slider = document.getElementById('roll_slider');
var pitch_slider = document.getElementById('pitch_slider');

//autowalk & viemap
var btn_autowalk = document.getElementById('btn_spot_autowalk_list')
var btn_viewmap = document.getElementById('btn_spot_load_map')

//spot cam function element
var btn_cam_default = document.getElementById('btn_spot_cam_control_default')
var btn_cam_pan_plus = document.getElementById('btn_spot_cam_control_plus')
var btn_cam_pan_minus = document.getElementById('btn_spot_cam_control_minus')
var btn_cam_tilt_plus = document.getElementById('btn_spot_cam_control_tilt_plus')
var btn_cam_tilt_minus = document.getElementById('btn_spot_cam_control_tilt_minus')
var btn_cam_zoom_plus = document.getElementById('btn_spot_cam_control_zoom_plus')
var btn_cam_zoom_minus = document.getElementById('btn_spot_cam_control_zoom_minus')
var btn_cam_audio_beep = document.getElementById('btn_spot_cam_audio_beep')
var btn_cam_webrtc = document.getElementById('btn_spot_cam_webrtc_capture')
var input_cam_audio_sound_value = document.getElementById('input_cam_audio_volume')
var select_cam_compositor = document.getElementById('select_spot_cam_compositor')
var text_area_uuid = document.getElementById('text_uuid_list');

//spot camera image resource
var camera_resource_front_R = new Image();
var camera_resource_front_L = new Image();
var camera_resource_left = new Image();
var camera_resource_right = new Image();
var camera_resource_back = new Image();
var spot_cam_resource_receive_image = new Image();

//spot camera image canvas
var camera_canvas_front_R = document.getElementById("camera_stream_front_R").getContext("2d");
var camera_canvas_front_L = document.getElementById("camera_stream_front_L").getContext("2d");
var camera_canvas_left = document.getElementById("camera_stream_left").getContext("2d");
var camera_canvas_right = document.getElementById("camera_stream_right").getContext("2d");
var camera_canvas_back = document.getElementById("camera_stream_back").getContext("2d");
var spot_cam_canvas_receive_image = document.getElementById("spot_cam_receive_image").getContext("2d");

//Spot Control Key
var spot_control_keycode = {
    w: 87,
    a: 65,
    s: 83,
    d: 68,
    q: 81,
    e: 69
}

window.addEventListener("keydown", onKeyDown, false); // WASDQE 키보드에 대한 keydown 이벤트
window.addEventListener("keyup", onKeyUp, false); // WASDQE 키보드에 대한 keyup 이벤트

function onKeyDown(event) {
    var keyCode = event.keyCode;
    switch (keyCode) {
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

function onKeyUp(event) {
    var keyCode = event.keyCode;
    switch (keyCode) {
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

var v_x = 0.0, v_y = 0.0, v_rot = 0.0;
var yaw = 0.0, roll = 0.0, pitch = 0.0;

var keyW = false;
var keyA = false;
var keyS = false;
var keyD = false;
var keyQ = false;
var keyE = false;

setInterval(function () {
    if (keyD) {
        v_rot = -0.5
    }
    if (keyS) {
        v_x = -0.5
    }
    if (keyA) {
        v_rot = 0.5
    }
    if (keyW) {
        v_x = 0.5
    }
    if (keyQ) {
        v_y = 0.5
    }
    if (keyE) {
        v_y = -0.5
    }

    if (v_x != 0.0 || v_y != 0.0 || v_rot != 0.0) {
        socket.emit('spot_drive_cmd', [v_x, v_y, v_rot])
        v_x = 0.0,
        v_y = 0.0,
        v_rot = 0.0
    }
}, 300);

//Robot State 정보
var motor_power, estop_state

//socket client 생성
var socket = io({transports: ['websocket'], upgrade: false}).connect('https://192.168.6.3:3458');

//사용자 구분(socket client info object)
const client_info = new Object()

//Remote WebClient 인증 하드코딩
client_info.remoteId = "REMOTE"


/**
 * @brief 서버 접속 여부를 수신하는 메시지, 서버 접속시 인증 관련 정보를 서버에 전송
 */
socket.on('connect', () => {
    socket.emit('web_client_id', client_info)
});

/**
 * @brief 서버와 접속이 끊어졌을때 수신하는 메시지
 */
socket.on('disconnect', () => {});

/**
 * @brief 현재 접속한 웹 클라이언트의 서버 접속 여부를 수신하는 메시지 (True: 로봇 제어가 가능한 상태, False: 로봇 제어가 불가능한 상태)
 * @param data boolean
 */
socket.on('connect_response', function (data) {
    if (data) {
        window.alert("REMOTE 연결")
    } else {
        window.alert("이미 연결중인 REMOTE 계정이 있습니다")
    }
});

/**
 * @brief 파이썬 클라이언트(SPOT)의 서버 접속 여부를 수신하는 메시지
 * @param data boolean
 */
socket.on('spot_connect_response', function (data) {
    if (data) {
        console.log('spot 연결 완료')
    } else {
        console.log('spot 연결 실패')
    }
})

/**
 * @brief estop 제어에 대한 버튼 클릭 이벤트 발생시 호출되는 함수, 서버에 estop 제어에 대한 메시지 전송
 */
function spot_control_estop() {
    socket.emit('spot_control_estop');
};

/**
 * @brief 로봇 모터 제어(ON)에 대한 버튼 클릭 이벤트 발생시 호출되는 함수, 서버에 모터 제어(ON)에 대한 메시지 전송
 */
function spot_control_power_on() {
    socket.emit('spot_control_power_on');
};

/**
 * @brief 로봇 모터 제어(OFF)에 대한 버튼 클릭 이벤트 발생시 호출되는 함수, 서버에 모터 제어(OFF)에 대한 메시지 전송
 */
 function spot_control_power_off() {
    socket.emit('spot_control_power_off');
};

/**
 * @brief sit 버튼 클릭 이벤트 발생시 호출되는 함수, 서버에 로봇 sit 제어 요청에 대한 메시지 전송
 */
function spot_control_sit() {
    socket.emit('spot_control_sit');
};

/**
 * @brief stand 버튼 클릭 이벤트 발생시 호출되는 함수, 서버에 로봇 stand 제어 요청에 대한 메시지 전송
 */
function spot_control_stand() {
    socket.emit('spot_control_stand');
};

/**
 * @brief Autowalk 버튼 클릭 웹 클라이언트로부터 서버 디렉토리 내에 저장된 autowalk gltf 파일 리스트를 요청받는 메시지
 */
function get_autowalk_list() {
    socket.emit('get_autowalk_list')
}

/**
 * @brief 현재 선택되어 있는 Autowalk 맵의 이름을 반환하는 함수
 */
function call() {
    let autowalk = $("#autowalk_list").val()
    console.log(autowalk)
    btn_viewmap.disabled = false
}

/**
 * @brief Autowalk replay mission 에 대한 요청을 서버에 전송하는 함수
 * @param data Autowalk 파일 이름
 */
function startAutowalk(data) {
    socket.emit('start_autowalk', data)
}

/**
 * @brief 선택한 gltf 파일을 렌더링하는 웹 페이지 호출 함수
 * @var autowalk gltf 형식으로 변환한 Autowalk 맵 이름
 */
function load_autowalk_map() {
    let autowalk = $("#autowalk_list").val()		
    // html 파일을 호출하고, 해당 html 파일에서 gltf 파일을 렌더링해주는 rederer.js 를 import
    const url = 'https://192.168.6.3:3458/autowalk_map_viewer.html'
    window.open(url)
}

/**
 * @brief Waypoint 이동에 대한 요청을 서버에 전송하는 함수
 * @param data Autowalk 맵 이름
 * @param data1 이동할 Waypoint의 id
 */
function waypoint_id(data, data1){
    socket.emit('waypoint_id', data, data1)
}

/**
 * @brief 로봇의 자세 중, yaw 를 제어할 slider gui 생성, slider의 값이 변할때 마다 해당 값을 소켓 메시지로 서버에 전송
 * @param min yaw 설정 범위 중, 최솟값
 * @param max yaw 설정 범위 중, 최대값
 * @param value yaw 초기 값 설정
 * @param step slider 이동시 한 step 에 대한 설정 값
 */
rangesliderJs.create(yaw_slider, {
    min: -0.5,
    max: 0.5,
    value: 0.0,
    step: 0.05,
    onSlideEnd: (value, percent, position) => { // slide 이벤트가 끝난 위치에서의 yaw 값을 서버에 전송
        yaw = value
        socket.emit('spot_pose_cmd', [yaw, roll, pitch])
    }
});

/**
 * @brief 로봇의 자세 중, roll 을 제어할 slider gui 생성, slider의 값이 변할때 마다 해당 값을 소켓 메시지로 서버에 전송
 * @param min roll 설정 범위 중, 최솟값
 * @param max roll 설정 범위 중, 최대값
 * @param value roll 초기 값 설정
 * @param step slider 이동시 한 step 에 대한 설정 값
 */
rangesliderJs.create(roll_slider, {
    min: -0.5,
    max: 0.5,
    value: 0.0,
    step: 0.05,
    onSlideEnd: (value, percent, position) => { // slide 이벤트가 끝난 위치에서의 roll 값을 서버에 전송
        roll = value
        socket.emit('spot_pose_cmd', [yaw, roll, pitch])
    }
});

/**
 * @brief 로봇의 자세 중, pitch 를 제어할 slider gui 생성, slider의 값이 변할때 마다 해당 값을 소켓 메시지로 서버에 전송
 * @param min pitch 설정 범위 중, 최솟값
 * @param max pitch 설정 범위 중, 최대값
 * @param value pitch 초기 값 설정
 * @param step slider 이동시 한 step 에 대한 설정 값
 */
rangesliderJs.create(pitch_slider, {
    min: -0.5,
    max: 0.5,
    value: 0.0,
    step: 0.05,
    onSlideEnd: (value, percent, position) => { // slide 이벤트가 끝난 위치에서 pitch 값을 서버에 전송
        pitch = value
        socket.emit('spot_pose_cmd', [yaw, roll, pitch])
    }
});

/**
 * @author Chulhee Lee
 * @brief All spot cam control functions
 * @SocketMessage : Send spot cam control command parameters to robot server
*/
// spot cam control parameter
var spot_cam_pan = 0.0,
    spot_cam_tilt = 0.0,
    spot_cam_zoom = 0.0;
var spot_cam_tilt_max = 90.0,
    spot_cam_tilt_min = -30.0,
    spot_cam_zoom_max = 30.0,
    spot_cam_zoom_min = 1.0;

/**
 * @author : Chulhee Lee
 * @brief : spot ptz move to initial position of camera(facing the front)
*/
function spot_cam_control_default() {

    //spot ptz initial position
    spot_cam_pan = 140.0
    spot_cam_tilt = 0.0
    spot_cam_zoom = 1.0

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        ptz_name: 'mech',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Rotate the spot cam to the right with respect to the spot robot
 * @variable : 'spot_cam_pan' is a variable that changes the spot cam position.
*/
function spot_cam_control_plus() {
    spot_cam_pan += 5.0;

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Rotate the spot cam to the left with respect to the spot robot
 * @variable : 'spot_cam_pan' is a variable that changes the spot cam position.
*/
function spot_cam_control_minus() {
    spot_cam_pan -= 5.0;

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Rotate the spot cam upwards relative to the spot robot
 * @variable : 'spot_cam_tilt' is a variable that changes the spot cam position.
*/
function spot_cam_control_tilt_plus() {
    spot_cam_tilt += 5.0;

    if (spot_cam_tilt > spot_cam_tilt_max) 
        spot_cam_tilt = spot_cam_tilt_max

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Rotating the spot cam in the direction of the ground based on the spot robot
 * @variable : 'spot_cam_tilt' is a variable that changes the spot cam position.
*/
function spot_cam_control_tilt_minus() {
    spot_cam_tilt -= 5.0;

    if (spot_cam_tilt < spot_cam_tilt_min) 
        spot_cam_tilt = spot_cam_tilt_min

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Zoom in on spot cam
 * @variable : 'spot_cam_zoom' is a variable that changes the zoom value of the spot cam.
*/
function spot_cam_control_zoom_plus() {
    spot_cam_zoom += 1.0;

    if (spot_cam_zoom > spot_cam_zoom_max) 
        spot_cam_zoom = spot_cam_zoom_max

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Zoom in on spot cam
 * @variable : 'spot_cam_zoom' is a variable that changes the zoom value of the spot cam.
*/
function spot_cam_control_zoom_minus() {
    spot_cam_zoom -= 1.0;

    if (spot_cam_zoom < spot_cam_zoom_min) 
        spot_cam_zoom = spot_cam_zoom_min

    socket.emit('spot_cam_control', {
        command: 'ptz',
        ptz_command: 'set_position',
        pan: spot_cam_pan,
        tilt: spot_cam_tilt,
        zoom: spot_cam_zoom
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Switching the camera mode of the spot cam. Available on Spotcam's webrtc page.
*/
function spot_cam_compositor() {
    socket.emit('spot_cam_control', {
        command: 'compositor',
        compositor_command: 'set',
        name: select_cam_compositor.value
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Spot cam buzzer sound
*/
function spot_cam_audio_beep() {
    socket.emit('spot_cam_control', {
        command: 'audio',
        audio_command: 'play',
        name: 'beep',
        gain: null
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Set the spot cam's audio sound. (Set a numeric value between 0 and 100 in the input text component)
*/
function spot_cam_audio_sound() {
    socket.emit('spot_cam_control', {
        command: 'audio',
        audio_command: 'set_volume',
        percentage: input_cam_audio_sound_value.value
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Capture the webrtc screen of the spot cam. After that, it is saved in the robot client directory.
 * @description : Prevents the webrtc screen from being overwritten in the robot client directory
 *                (If capture_count is removed, it is saved in the form of an overwrite in the robot client directory.)
*/
var capture_count = 0;
function spot_cam_webrtc_capture() {
    capture_count++;
    socket.emit('spot_cam_control', {
        command: 'webrtc',
        webrtc_command: 'save',
        cam_ssl_cert: null,
        count: capture_count,
        dst_prefix: 'h264.sdp',
        sdp_filename: 'h264.sdp',
        sdp_port: 31102,
        track: 'video'
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Change the camera mode of the spot cam to save the changed camera image
*/
function spot_cam_capture() {

    //save the images can from other cameras by changing the camera_name parameter. 
    socket.emit('spot_cam_control', {
        camera_name: 'ir',
        command: 'media_log',
        media_log_command: 'store_retrieve',
        dst: null,
        stitching: true,
        save_as_rgb24: false,
        raw_ir:false        
    });
}

/**
 * @author : Chulhee Lee
 * @brief : turn off the spot cam's light
*/
function spot_cam_light_off() {

    //adjust the brightness of the light by adjusting the value of the brightness parameter.
    socket.emit('spot_cam_control', {
        command: 'lighting',
        lighting_command: 'set',
        brightnesses: ['0.0', '0.0', '0.0', '0.0']
    });
}

/**
 * @author : Chulhee Lee
 * @brief : get the name property data of the spot cam image
*/
function spot_cam_data_receive_uuid_list() {
    socket.emit('spot_cam_control', {
        command: 'media_log',
        media_log_command: 'list_logpoints_name'
    });
}

/**
 * @author : Chulhee Lee
 * @brief : get data in the form of a byte array for the ptz camera image stored in the spot cam.
 *          (specify the name(uuid) for the ptz image stored in the spot cam)
*/
function spot_cam_data_receive_ptz_image() {
    socket.emit('spot_cam_control', {
        command: 'media_log',
        media_log_command: 'retrieve',
        dst: null,
        stitching: true,
        save_as_rgb24: false,
        raw_ir: false,
        name: '63252d8a-4136-11ec-b296-48b02d182c42'
    });
}

/**
 * @author : Chulhee Lee
 * @brief : get data in the form of a byte array for the ir camera image stored in the spot cam.
 *               (specify the name(uuid) for the ir image stored in the spot cam)
*/
function spot_cam_data_receive_ir_image() {
    socket.emit('spot_cam_control', {
        command: 'media_log',
        media_log_command: 'retrieve',
        dst: null,
        stitching: true,
        save_as_rgb24: false,
        raw_ir: false,
        name: '32b98184-566f-11ec-8bcd-48b02d182c42'   
    });
}

/**
 * @author : Chulhee Lee
 * @brief : Visualize the spot cam image data received from the robot server on canvas.
*/
socket.on('spot_cam_data_receive_image', function(data) {
    spot_cam_resource_receive_image.src = "data:image/jpg;base64," + data;
});

/**
 * @author : Chulhee Lee
 * @brief : Visualize the name property data of the spotcam image received from the robot server in the text area component
*/
socket.on('spot_cam_data_receive_uuid_list', function(data) {
    text_uuid_list.value = data;
});


/**
 * @brief 로봇 배터리 정보에 대해 수신하는 메시지
 * @param data 로봇 배터리 정보에 대한 json 문자열 (id, charge percentage, voltage, temperature)
 */
socket.on('battery_state', function (data) {
    var battery_state = JSON.stringify(JSON.parse(data), null, 4)
    input_text_battery.value = battery_state
});

/**
 * @brief 로봇의 배터리 충전량, Estop 상태 정보, 모터 Power 상태 정보를 수신하는 메시지
 * @param data 배터리, Estop 상태, 모터 Power 상태에 대한 Object (data.battery : battery , data.Estop : estop_state , data.Power : power_state)
 */
socket.on('running_state', function (data) {

    battery_state = data.battery
    estop_state = data.estop
    motor_power = data.power

    //input_text_battery.value = battery_state + "%"

    if (estop_state == "ESTOPPED") {
        btn_power_off.disabled = true
        btn_power_on.disabled = true
        btn_sit.disabled = true
        btn_stand.disabled = true
        btn_estop.disabled = false
        //spot cam btn
        btn_cam_pan_plus.disabled = false
        btn_cam_pan_minus.disabled = false
        btn_cam_tilt_plus.disabled = false
        btn_cam_tilt_minus.disabled = false
        btn_cam_zoom_plus.disabled = false
        btn_cam_zoom_minus.disabled = false
        btn_cam_default.disabled = false
    } else if (estop_state == "NOT_ESTOPPED") { 
        if (motor_power == "ON") {
            btn_power_off.disabled = false
            btn_power_on.disabled = true
            btn_sit.disabled = false
            btn_stand.disabled = false
        } else if (motor_power == "OFF") {
            btn_power_on.disabled = false
            btn_power_off.disabled = true
            btn_sit.disabled = true
            btn_stand.disabled = true
        }
        btn_estop.disabled = false
    }
});

//receive camera img resource
socket.on('spot_camera_front_R', (data) => {
    camera_resource_front_R.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_front_L', (data) => {
    camera_resource_front_L.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_left', (data) => {
    camera_resource_left.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_right', (data) => {
    camera_resource_right.src = "data:image/png;base64," + data;
});

socket.on('spot_camera_back', (data) => {
    camera_resource_back.src = "data:image/png;base64," + data;
});

/**
 * @brief 서버로부터 저장되어 있는 gltf 리스트를 수신하는 메시지
 * @param data gltf file list
 */
socket.on('spot_autowalk_list', (data) => {
    // select box에 추가되어 있는 모든 option 값 삭제
    $('#autowalk_list').children('option').remove();

    // select box에 gltf 파일 리스트 추가
    for (var cnt = 0; cnt < data.length; cnt++) {
        var option = $("<option>" + data[cnt] + "</option>");
        $('#autowalk_list').append(option)
    }

});

//spot_cam_init_position
socket.on('spot_cam_init_position', (data) => {
    spot_cam_pan = data["pan"];
    spot_cam_tilt = data["tilt"];
    spot_cam_zoom = data["zoom"];
    console.log(spot_cam_pan, spot_cam_tilt, spot_cam_zoom)
});

//camera_canvas_onload
camera_resource_front_R.onload = function () {
    camera_canvas_front_R.clearRect(0, 0, 480, 640);
    camera_canvas_front_R.save();
    camera_canvas_front_R.translate(240, 320);
    camera_canvas_front_R.rotate(90 * Math.PI / 180);
    camera_canvas_front_R.drawImage(camera_resource_front_R, -320, -240);
    camera_canvas_front_R.restore();
}

camera_resource_front_L.onload = function () {
    camera_canvas_front_L.clearRect(0, 0, 480, 640);
    camera_canvas_front_L.save();
    camera_canvas_front_L.translate(240, 320);
    camera_canvas_front_L.rotate(90 * Math.PI / 180);
    camera_canvas_front_L.drawImage(camera_resource_front_L, -320, -240);
    camera_canvas_front_L.restore();
}

camera_resource_left.onload = function () {
    camera_canvas_left.drawImage(camera_resource_left, 0, 0);
}

camera_resource_right.onload = function () {
    camera_canvas_right.clearRect(0, 0, 640, 480);
    camera_canvas_right.save();
    camera_canvas_right.translate(320, 240);
    camera_canvas_right.rotate(180 * Math.PI / 180);
    camera_canvas_right.drawImage(camera_resource_right, -320, -240);
    camera_canvas_right.restore();
}

camera_resource_back.onload = function () {
    camera_canvas_back.drawImage(camera_resource_back, 0, 0);
}
/**
 * @author : Chulhee Lee
 * @brief : Visualize the spot cam image data received from the robot server on canvas.
*/
spot_cam_resource_receive_image.onload = function () {
    spot_cam_canvas_receive_image.clearRect(0, 0, 1920, 1080);
    spot_cam_canvas_receive_image.drawImage(spot_cam_resource_receive_image, 0, 0);
}
