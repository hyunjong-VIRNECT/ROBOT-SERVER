//socket server
const express = require('express');
const fs = require('fs');
const options = {
  key : fs.readFileSync(__dirname + '/ssl/virnect.key'),
  cert : fs.readFileSync(__dirname + '/ssl/virnect.crt')
}
const app = express();
const server = require('https').createServer(options, app);

// add path module
const path = require('path');
const io = require('socket.io')(server);
const port = process.env.PORT || 3458;

app.use(express.static(path.join(__dirname + '/src')));
app.use('/assets', express.static(path.join(__dirname , '/assets')));
app.use('/node_modules', express.static(path.join(__dirname , "/node_modules")));
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')));
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')));

app.get('/healthcheck', (req,res) => {
  res.header('Content-Type', 'application/json')
  res.send(200)
})
/*
//Eureka Spot_Socket_Server info
const SERVER_HOST_IP = '192.168.6.3'
const PORT_Eureka_App = 3458;
const BASE_URL = `http://${SERVER_HOST_IP}:${PORT_Eureka_App}/`
const APPLICATION_NAME = 'RM-ROBOT-SERVER'

//Eureka
const Eureka = require('eureka-js-client').Eureka;

const Eureka_client = new Eureka({
  instance: {
      // {현재 서버 아이피}:{어플리케이션이름}:{서버포트}
      instanceId: `${SERVER_HOST_IP}:${APPLICATION_NAME}:${PORT_Eureka_App}`,
      // {어플리케이션 이름}
      app: APPLICATION_NAME,
      // 현재 서버 어플리케이션 호스트 IP
      hostName: SERVER_HOST_IP,
      // 현재 서버 어플리케이션 호스트 IP
      ipAddr: SERVER_HOST_IP,
      port: {
          // 서버 포트
          '$': PORT_Eureka_App,
          // 서버 포트 사용 활성화
          '@enabled': true,
      },
      dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
      },
      homePageUrl: BASE_URL,
      statusPageUrl: BASE_URL + 'actuator/info',
      healthCheckUrl: BASE_URL + 'actuator/health',
      vipAddress: APPLICATION_NAME,
      secureVipAddress: APPLICATION_NAME,
      metadata: {
          'management.port': PORT_Eureka_App,
      },
  },
  eureka: {
      // 플랫폼 유레카 서버 주소
      host: '192.168.6.3',
      // 플랫폼 유레카 서버 포트
      port: 8761,
      // IP 주소 우선 설정
      preferIpAddress: true,
      // 유레카 서버 api path 설정
      servicePath: '/eureka/apps/'
  },
});
*/

// 서버에 접속한 클라이언트들의 정보를 저장할 배열
var clients = [];
var clientInfo;
// io.to().emit 시 사용되는 클라이언트들의 socket.id를 저장할 변수
var spot_control_client_id = "", web_client_id = "";

var spot_cam_pan, spot_cam_tilt, spot_cam_zoom;
var spot_cam_tilt_max = 90.0, spot_cam_tilt_min = -30.0,
    spot_cam_zoom_max = 30.0, spot_cam_zoom_min = 1.0;

io.sockets.on('connection', function(socket)
{
  /**
   * @brief 파이썬 클라이언트가 서버에 접속하는 경우 수신되는 메시지, 메시지를 전송한 클라이언트의 정보 저장
   * @param data 파이썬 클라이언트 robot_id.nickname 문자열
   */
  socket.on('spot_control_client_id', function(data)
  {
    // robot_id.ninkname 과 socket.id 를 저장하는 Object 생성
    clientInfo = new Object();
    clientInfo.id = data;
    clientInfo.clientId = socket.id;
    clients.push(clientInfo);
    spot_control_client_id = socket.id

    if(web_client_id == "")
    {
      io.to(spot_control_client_id).emit('remote_client_not_yet');
    }
    else
    {
      io.to(spot_control_client_id).emit('remote_client_connect', web_client_id);
      io.to(web_client_id).emit('spot_connect_response', true)
    }
    
    console.log('connected spot : ' , data , socket.request.connection.remoteAddress)
  });

  /**
   * @brief 웹 클라이언트가 서버에 접속하는 경우 수신되는 메시지, 메시지를 전송한 웹 클라이언트의 정보 저장
   * @param data 웹 클라이언트의 remoteId 문자열 정보 
   */
  socket.on('web_client_id', function(data)
  {
    if(clients.length == 0)
    {
      try{
        clientInfo = new Object();
        clientInfo.id = data.remoteId;
        clientInfo.clientId = socket.id;
        clients.push(clientInfo);

        web_client_id = socket.id;      
     
        io.to(web_client_id).emit('connect_response', true);
        io.to(web_client_id).emit('spot_connect_response', false)

        //web_client 접속시 SPOT CAM Position 전송
        io.to(web_client_id).emit('spot_cam_init_position', {pan : spot_cam_pan, tilt : spot_cam_tilt, zoom : spot_cam_zoom})
	
        console.log('connected web_client : ' , data, socket.request.connection.remoteAddress)  
      
      }catch(err){
        console.log('unauthenticated socket : ' , socket.id)
        io.to(socket.id).emit('connect_response', false);
        socket.disconnect()
      }
    }
    else if(clients.length == 1){
      if(clients[0].id == "REMOTE"){
        io.to(socket.id).emit('connect_response', false); 
        socket.disconnect()
      }else{
        try
        {
          clientInfo = new Object();
          clientInfo.id = data.remoteId;
          clientInfo.clientId = socket.id;
          clients.push(clientInfo); 
          web_client_id = socket.id;

          io.to(spot_control_client_id).emit('remote_client_connect', web_client_id);
          io.to(web_client_id).emit('connect_response', true);
          io.to(web_client_id).emit('spot_connect_response', true)

          console.log('connected web_client : ' , data, socket.request.connection.remoteAddress)  

        }catch(err){
          console.log('unauthenticated socket : ' , socket.id)
          io.to(socket.id).emit('connect_response', false);
          socket.disconnect()
        } 
      }
    }else{
      console.log('unauthenticated socket : ' , socket.id)
      io.to(socket.id).emit('connect_response', false);
      socket.disconnect()
    }
  });

  /**
   * @brief 서버에 접속한 클라이언트의 연결이 끊어질 경우 수신되는 메시지
   */
  socket.on('disconnect', () => 
  {
    // disconnect 이벤트가 발생한 클라이언트의 socket.id 를 검색하여 클라이언트 정보 관리
    for (var i = 0, len = clients.length; i < len; ++i) 
    {
      var c = clients[i];
      if (c.clientId == socket.id) 
      {
        if (c.id == "REMOTE") 
        {
          console.log('diconnect socket' , c.id , socket.id);
          clients.splice(i, 1);
          web_client_id = "";
          io.to(spot_control_client_id).emit('remote_client_disconnect');
          break;    
        }
        else if(c.id == "spot-BD-01110009") // robot_id.nickname
        {
          console.log('disconnect spot : ' , c.id);
          io.to(web_client_id).emit('spot_connect_response', false)          
          clients.splice(i, 1);
          break;
        }
      }
    }
  });

  /**
   * @brief 웹 클라이언트로부터 로봇의 주행 제어 요청을 수신하는 메시지
   * @param data 로봇 이동 제어에 대한 파라미터 (data[0]: 전진 후진에 대한 속도, data[1]: 좌우 이동에 대한 속도, data[2]: 로봇 회전에 대한 속도)
   */
  socket.on('spot_drive_cmd', function(data){
    io.to(spot_control_client_id).emit('spot_control_cmd', data)
  });

  /**
   * @brief 웹 클라이언트로부터 로봇의 자세 제어 요청을 수신하는 메시지
   * @param data yaw, roll, pitch 값 List (data[0]:yaw, data[1]:roll, data[2]:pitch]
   */
  socket.on('spot_pose_cmd', function(data){
    io.to(spot_control_client_id).emit('spot_pose_cmd', data)
  });

  /**
   * @brief 파이썬 클라이언트로부터 로봇의 배터리 충전량, Estop 상태 정보, 모터 Power 상태 정보를 수신하는 메시지
   * @param data 배터리, Estop 상태, 모터 Power 상태에 대한 Object (data.battery : battery , data.Estop : estop_state , data.Power : power_state)
   */
  socket.on('spot_running_state', function(data)
  {
    io.to(web_client_id).emit('running_state', data)
  });

  /**
   * @brief 웹 클라이언트로부터 로봇의 Estop 상태 제어 요청을 수신하는 메시지
   * @param data ''
   */  
  socket.on('spot_control_estop', function(data) 
  {  
    io.to(spot_control_client_id).emit('spot_control_estop')
  });

  /**
   * @brief 웹 클라이언트로부터 모터 전원 제어(On) 요청을 수신하는 메시지
   * @param data ''
   */  
  socket.on('spot_control_power_on', function(data) 
  {
    io.to(spot_control_client_id).emit('spot_control_power_on')
  });

  /**
   * @brief 웹 클라이언트로부터 로봇의 sit 제어 요청을 수신하는 메시지
   */
  socket.on('spot_control_sit', () => 
  {
    io.to(spot_control_client_id).emit('spot_control_sit')
  });

  /**
   * @brief 웹 클라이언트로부터 로봇의 stand 제어 요청을 수신하는 메시지
   */
  socket.on('spot_control_stand', () => 
  {
    io.to(spot_control_client_id).emit('spot_control_stand')
  });

  /**
   * @brief 웹 클라이언트로부터 모터 전원 제어(Off) 요청을 수신하는 메시지
   * @param data ''
   */  
  socket.on('spot_control_power_off', function(data) 
  {
    io.to(spot_control_client_id).emit('spot_control_power_off')
  });

  //spot cam
  socket.on('spot_cam_init_position', function(data)
  {
    console.log(data)
    spot_cam_pan  = data["pan"]
    spot_cam_tilt = data["tilt"]
    spot_cam_zoom = data["zoom"]
    
    if(web_client_id != '')
      io.to(web_client_id).emit('spot_cam_init_position', data)
  });
  
  socket.on('spot_cam_control', function(data)  {
    console.log('pan : ' + data['pan'] + ' tilt : ' + data['tilt'] + ' zoom : ' + data['zoom'])

    if(data['tilt'] || data['zoom'])
    {
      //spot cam tilt min, max 
      if(data['tilt'] > spot_cam_tilt_max)
        data['tilt'] = spot_cam_tilt_max
      else if(data['tilt'] < spot_cam_tilt_min)
        data['tilt'] = spot_cam_tilt_min
      else
        true
    
      //spot cam zoom min, max
      if(data['zoom'] > spot_cam_zoom_max)
        data['zoom'] = spot_cam_zoom_max
      else if(data['zoom'] < spot_cam_zoom_min)
        data['zoom'] = spot_cam_zoom_min
      else
        true
    }
    else
    {
      true
    }

    io.to(spot_control_client_id).emit('spot_cam_control', data)
  });


  /**
   * @brief 로봇의 5대 카메라 중, 전면 우측 카메라의 fisheye 이미지를 수신하는 메시지
   * @param data base64 포맷으로 인코딩된 이미지 데이터
  */
  socket.on('frontright_fisheye_image', (data) => 
  {
    if(socket.id == spot_control_client_id)
      io.to(web_client_id).emit('spot_camera_front_R', data);
  });

  /**
  * @brief 로봇의 5대 카메라 중, 전면 좌측 카메라의 fisheye 이미지를 수신하는 메시지
  * @param data base64 포맷으로 인코딩된 이미지 데이터
  */
  socket.on('frontleft_fisheye_image', (data) => 
  {
    if(socket.id == spot_control_client_id)
      io.to(web_client_id).emit('spot_camera_front_L', data);
  });

  /**
  * @brief 로봇의 5대 카메라 중, 좌측 카메라의 fisheye 이미지를 수신하는 메시지
  * @param data base64 포맷으로 인코딩된 이미지 데이터
  */
  socket.on('left_fisheye_image', (data) => 
  {
    if(socket.id == spot_control_client_id)
      io.to(web_client_id).emit('spot_camera_left', data);
  });

  /**
  * @brief 로봇의 5대 카메라 중, 우측 카메라의 fisheye 이미지를 수신하는 메시지
  * @param data base64 포맷으로 인코딩된 이미지 데이터
  */
  socket.on('right_fisheye_image', (data) => 
  {
    if(socket.id == spot_control_client_id)
      io.to(web_client_id).emit('spot_camera_right', data);
  });

  /**
  * @brief 로봇의 5대 카메라 중, 후면 카메라의 fisheye 이미지를 수신하는 메시지
  * @param data base64 포맷으로 인코딩된 이미지 데이터
  */
  socket.on('back_fisheye_image', (data) => 
  {
    if(socket.id == spot_control_client_id)
      io.to(web_client_id).emit('spot_camera_back', data);
  });

  /**
  * @brief 웹 클라이언트로부터 서버 디렉토리 내에 저장된 autowalk gltf 파일 리스트를 요청받는 메시지
  * @param filelist 서버 디렉토리 내에 저장된 gltf 파일 리스트
  */
  socket.on('get_autowalk_list', () => {
    fs.readdir(path.join(__dirname + '/assets/Export_model'), function(err, filelist){
      io.to(web_client_id).emit('spot_autowalk_list', filelist)
    });
  });

  /**
  * @brief 웹 클라이언트로부터 Autowalk replay mission 에 대한 요청을 수신하는 메시지
  * @param data 요청하는 autowalk 파일 이름
  */
  socket.on('start_autowalk', (data) =>{
    autowalk_map = data
    io.to(spot_control_client_id).emit('replay_misson', autowalk_map);
    console.log('autowalk_map : ' , autowalk_map)
  });

  /**
  * @brief Autowalk replay mission 에 대한 결과를 수신하는 메시지
  * @param data Autowalk replay mission 결과 메시지 (Success, Failed, Pauesd)
  */
  socket.on('mission_result', (data) => {
    io.to(web_client_id).emit('spot_replay_mission_result', data);
  });

  /**
  * @brief 로봇 배터리 정보에 대해 수신하는 메시지
  * @param data 로봇 배터리 정보에 대한 json 문자열 (id, charge percentage, voltage, temperature)
  */
  socket.on('battery_state', (data) => {
    io.to(web_client_id).emit('battery_state', data);
  });

  /**
  * @brief Autowalk 또는 Waypoint 이동 시, 로봇의 position, rotation, joint 에 대한 값을 수신하는 메시지
  * @param data position, rotation, joint 에 대한 json 문자열 
  */
  socket.on('joint_state', (data) => {
    io.to(web_client_id).emit('joint_state', data)
  });

  /**
  * @brief 웹 클라이언트로부터 Waypoint 이동 명령에 대한 요청을 수신하는 메시지
  * @param map autowalk 파일 이름 
  * @param id 이동할 waypoint의 이름
  */
  socket.on('waypoint_id', (map , id) => {
    autowalk_map = map
    console.log('autowalk_map : ' , autowalk_map)
    io.to(spot_control_client_id).emit('go_to_waypoint', autowalk_map, id)
  });

  /**
  * @brief Waypoint 이동 명령에 대한 결과를 수신하는 메시지
  * @param data Waypoint 이동에 대한 결과 메시지
  */
  socket.on('go_to_response', (data) => {
    io.to(web_client_id).emit('go_to_response', data)
  });

});

server.listen(port, () => {
  /*
  //Eureka client
  Eureka_client.start(err => {
      console.log(`eureka client error : ${JSON.stringify(err)}`)
  })
  */
  console.log(`server listening on port ${port}`)
});
