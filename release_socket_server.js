const express = require('express');
const fs = require('fs');
const options = {
  key : fs.readFileSync(__dirname + '/ssl/virnect.key'),
  cert : fs.readFileSync(__dirname + '/ssl/virnect.crt')
}
const app = express();
const server = require('https').createServer(options ,app);
// const server = require('http').createServer(app);

const io = require('socket.io')(server);
const port = process.env.PORT || 3458;

app.use(express.static(__dirname + '/latency_public'));

app.get('/healthcheck', (req,res) => {
  res.header('Content-Type', 'application/json')
  res.send(200)
})

//client_id
var clients = [];
var clientInfo
var spot_control_client_id = "", web_client_id = ""; 

io.sockets.on('connection', function(socket)
{
  //spot client id 구분
  socket.on('spot_control_client_id', function(data)
  {
    clientInfo = new Object();
    clientInfo.id = data;
    clientInfo.clientId = socket.id;
    clients.push(clientInfo);
    spot_control_client_id = socket.id

    if(web_client_id == "")
    {
      io.to(spot_control_client_id).emit('remote_client_not_yet', "wait");
    }
    else
    {
      io.to(spot_control_client_id).emit('remote_client_connect', "web_client_id");
      io.to(web_client_id).emit('spot_connect_response', true)
    }
    
    console.log('connected spot : ' , data)
  });

  //web client id 구분
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

        console.log('connected web_client : ' , data)  
      
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

          console.log('connected web_client : ' , data)  

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

  //연결 해제
  socket.on('disconnect', () => 
  {
    // disconnect 일때 누가 disconnect 인지 판단하고 접속 정보 관리
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
          io.to(spot_control_client_id).emit('remote_client_disconnect', web_client_id);
          break;    
        }
        else if(c.id == "spot-BD-01110009")
        {
          console.log('disconnect spot : ' , c.id);
          io.to(web_client_id).emit('spot_connect_response', false)          
          clients.splice(i, 1);
          break;
        }
      }
    }
  });

  socket.on('spot_drive_cmd', function(data){
    io.to(spot_control_client_id).emit('spot_control_cmd', data)
  });

  socket.on('spot_running_state', function(data)
  {
    // data.battery : battery , data.Estop : estop_state , data.Power : power_state
    io.to(web_client_id).emit('running_state', data)
  });

  //spot control
  socket.on('spot_control_estop', () => 
  {
    socket.to(spot_control_client_id).emit('spot_control_estop')
  });

  socket.on('spot_control_power_on', () => 
  {
    socket.to(spot_control_client_id).emit('spot_control_power_on')
  });

  socket.on('spot_control_sit', () => 
  {
    socket.to(spot_control_client_id).emit('spot_control_sit')
  });

  socket.on('spot_control_stand', () => 
  {
    socket.to(spot_control_client_id).emit('spot_control_stand')
  });

  socket.on('spot_control_power_off', () => 
  {
    socket.to(spot_control_client_id).emit('spot_control_power_off')
  });

  //spot camera img stream
  socket.on('frontright_fisheye_image', (data) => 
  {
    socket.to(web_client_id).emit('spot_camera_front_R', data);
  });

  socket.on('frontleft_fisheye_image', (data) => 
  {
    socket.to(web_client_id).emit('spot_camera_front_L', data);
  });

  socket.on('left_fisheye_image', (data) => 
  {
    socket.to(web_client_id).emit('spot_camera_left', data);
  });

  socket.on('right_fisheye_image', (data) => 
  {
    socket.to(web_client_id).emit('spot_camera_right', data);
  });

  socket.on('back_fisheye_image', (data) => 
  {
    socket.to(web_client_id).emit('spot_camera_back', data);
  });

  //spot error message
  socket.on('spot_error_message', (data) => 
  {
    socket.to(web_client_id).emit('spot_error_message', data);
  });
});

server.listen(port, () => console.log(`server listening on port ${port}`));
