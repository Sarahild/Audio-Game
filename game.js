var scene = new THREE.Scene();
var camera;
var person_height = 1.8; // 1 unit = 1 meter
var SOUNDSPEED = 1/343; // speed of sound in meters
var renderer;
var url_step = 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/319654__manuts__gravel-footstep.wav';
var url_tap = 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/tap.wav';
var audio_context = new (window.AudioContext || window.webkitAudioContext)();
var source;
var source_buffer;
var reflectedCubes = new Array();
var current_room; //index into the room the player is currently
var rooms = new Array();
var player;

//look into left wall bounces if closer to left wall

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild(renderer.domElement);

  camera = createCamera(new THREE.Vector3(0,person_height,2.00));
  createLight(new THREE.Vector3(0,0,0), 0xFFFFFF);

  rooms[0] = new Room(new THREE.Vector3(0,0,0), 30, new THREE.Vector3(0,0,0), true, 5, new THREE.Vector3(0,0,-15), 1, 1, null);
  current_room = 0;
  rooms[1] = new Room(new THREE.Vector3(0,0,-20), 10, new THREE.Vector3(0,0,-20), true, 5, new THREE.Vector3(0,0,-15), 0, null, 0);
  player = new Player();
  getAudio(url_tap);
  console.log("Finished init");
}

var cube_geometry = new THREE.BoxGeometry( 1, 1, 1 );
var cube_material = new THREE.MeshBasicMaterial( { color: 0x0ff0f0 } );
var reflected_material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );

//a room needs to know its walls, its doors
function Room(origin, length, sound_origin, door, door_length, door_position, direction, next_room, prev_room) {
  this.door = door;
  this.door_direction = direction;
  this.door_length = door_length;
  this.door_position = door_position;
  this.next_room = next_room;
  this.prev_room = prev_room;

  this.isInDoorWay = function(x, y, z) {
    if (this.door_direction == 0) { //back door
      if (z <= this.door_position.z + person_height && z >= this.door_position.z - person_height) {
        if (x <= this.door_position.x + this.door_length/2 && x >= this.door_position.x - this.door_length/2) {
          return 0; //back door
        }
      } else if (z > this.door_position.z + person_height) {
        player.current_room = this.prev_room;
      }
    } else if (this.door_direction == 1) {
      if (z <= this.door_position.z + person_height && z >= this.door_position.z - person_height) {
        if (x <= this.door_position.x + this.door_length/2 && x >= this.door_position.x - this.door_length/2) {
          player.current_room = this.next_room;
          return 1; //front door
        }
      } else if (z < this.door_position.z - person_height) {
        player.current_room = this.next_room;
      }
    }
    return -1;
  }

  this.isInDoorView = function(x,y,z, wall) {
    if ((this.door_direction == 0 || this.door_direction == 1) && wall.mesh.position.z == this.door_position.z) { //back door
      if (x <= this.door_position.x + this.door_length/2 && x >= this.door_position.x - this.door_length/2) {
        return true; //back door
      }
    } else if ((this.door_direction == 2 || this.door_direction == 3) && wall.mesh.position.x == this.door_position.x) { //back door
      if (z <= this.door_position.z + this.door_length/2 && x >= this.door_position.z - this.door_length/2) {
        return true; //back door
      }
    }
    return false;
  }

  var wall_material = new THREE.MeshLambertMaterial({wireframe:true});
  if (door)
    if (direction == 0)
      this.walls = createRoomBackDoor(origin, length, wall_material, door_length, door_position);
    else if (direction == 1)
      this.walls = createRoomFrontDoor(origin, length, wall_material, door_length, door_position);
  else
    this.walls = createRoom(origin, length, wall_material);

  this.corners = new Array();
  this.corners[0] = new THREE.Vector3(origin.x - length/2, origin.y - person_height, origin.z+length/2); //back left bottom
  this.corners[1] = new THREE.Vector3(origin.x + length/2, origin.y - person_height, origin.z+length/2); // back right bottom
  this.corners[2] = new THREE.Vector3(origin.x - length/2, origin.y + length - person_height, origin.z + length/2); // back left top
  this.corners[3] = new THREE.Vector3(origin.x + length/2, origin.y + length - person_height, origin.z + length/2); // back right top
  this.corners[4] = new THREE.Vector3(origin.x - length/2, origin.y - person_height, origin.z - length/2); //front left bottom
  this.corners[5] = new THREE.Vector3(origin.x + length/2, origin.y - person_height, origin.z - length/2); // front right bottom
  this.corners[6] = new THREE.Vector3(origin.x - length/2, origin.y + length - person_height, origin.z - length/2); //front left top
  this.corners[7] = new THREE.Vector3(origin.x + length/2, origin.y + length - person_height, origin.z - length/2); //front right top
}

function Player() {
  this.current_room = current_room;
  this.geometry = new THREE.BoxGeometry( 1 * person_height, 2 * person_height, 1 * person_height);
  this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial( {wireframe: true} ));
  scene.add(this.mesh);
  this.sound_buffer;
  this.sound_origin = Object.assign({}, camera.position);
  this.sound_origin.y -= 1.5*person_height; //check to make sure this doesn't mess up top and bottom reflections
  this.sound_source;
}

function SoundSource(sound_buffer, sound_origin, material) {
  this.position = sound_origin;
  this.cube = new THREE.Mesh(cube_geometry, material);
  this.cube.position.x = sound_origin.x;
  this.cube.position.y = sound_origin.y;
  this.cube.position.z = sound_origin.z;
  scene.add(this.cube);

  this.sound_buffer = sound_buffer;
  this.source = audio_context.createBufferSource();
  this.source.buffer = sound_buffer;

  this.panner = audio_context.createPanner();
  this.panner.setPosition(sound_origin.x, sound_origin.y, sound_origin.z);
  this.panner.panningModel = "HRTF";
  this.panner.distanceModel = "inverse";
  this.panner.refDistance = 1;
  this.panner.maxDistance = 1000;
  this.panner.rolloffFactor = 1; // 1 / distance squared should be the right thing but it seemed too strong. 1 / distance seems right though. read into inverse square law

  audio_context.listener.setPosition(camera.position.x, camera.position.y, camera.position.z); //move elsewhere so only done once

  this.source.connect(this.panner);
  this.panner.connect(audio_context.destination);
}

function replaySoundSource(sound_buffer) {
  var source = audio_context.createBufferSource();
  source.buffer = sound_buffer;
  //sound_source.source.connect(sound_source.panner); //is this necessary?
  return source;
}

function createCamera(position) {
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.x = position.x;
  camera.position.y = position.y;
  camera.position.z = position.z;
  return camera;
}

function createLight(position, color) {
  var light = new THREE.PointLight(color);
  light.position.x = position.x;
  light.position.y = position.y;
  light.position.z = position.z;
  scene.add(light);
}

function render() {
  requestAnimationFrame( render );

  if (player.sound_source) {
    player.sound_source.cube.rotation.x += 0.1;
    player.sound_source.cube.rotation.y += 0.1;
  }

  update();

  renderer.render(scene, camera);
};

var planeMaterial = new THREE.MeshLambertMaterial({color:0xffffff});

var reverbPositions = new Array();

function createRoom(center, length, material)
{
  var walls = new Array();
  walls[0] = new Wall(length, length,          center.x, center.y            - person_height,          center.z, -Math.PI/2,          0, 0, material);    //floor
  walls[1] = new Wall(length, length,          center.x, center.y   + length - person_height,          center.z, Math.PI/2,          0, 0, material);    //ceiling
  walls[2] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z+length/2,          0,          0, 0, material);    //back wall
  walls[3] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material);    //front wall
  walls[4] = new Wall(length, length, center.x+length/2, center.y + length/2 - person_height,          center.z,          0, -Math.PI/2, 0, material);    //left wall
  walls[5] = new Wall(length, length, center.x-length/2, center.y + length/2 - person_height,          center.z,          0,  Math.PI/2, 0, material);    //right wall

  for (var i = 0; i < walls.length; i++) {
    scene.add(walls[i].mesh);
  }
  return walls;
}

function createRoomFrontDoor(center, length, material, door_length, door_position) {
  var walls = new Array();
  walls[0] = new Wall(length, length,          center.x, center.y            - person_height,          center.z, -Math.PI/2,          0, 0, material, false);    //floor
  walls[1] = new Wall(length, length,          center.x, center.y   + length - person_height,          center.z, Math.PI/2,           0, 0, material, false);    //ceiling
  walls[2] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z+length/2,          0,          0, 0, material, false);    //back wall
  walls[3] = new Wall(length/2-door_length/2, length, center.x + (length/2 - door_length/2), center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material, true, door_length, door_position);    //front left wall
  walls[4] = new Wall(length/2-door_length/2, length, center.x - (length/2 - door_length/2), center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material, true, door_length, door_position);    //front right wall
  walls[5] = new Wall(length, length, center.x+length/2, center.y + length/2 - person_height,          center.z,          0, -Math.PI/2, 0, material, false);    //left wall
  walls[6] = new Wall(length, length, center.x-length/2, center.y + length/2 - person_height,          center.z,          0,  Math.PI/2, 0, material, false);    //right wall

  for (var i = 0; i < walls.length; i++) {
    scene.add(walls[i].mesh);
  }
  return walls;
}

function createRoomBackDoor(center, length, material, door_length, door_position) {
  var walls = new Array();
  walls[0] = new Wall(length, length,          center.x, center.y            - person_height,          center.z, -Math.PI/2,          0, 0, material, false);    //floor
  walls[1] = new Wall(length, length,          center.x, center.y   + length - person_height,          center.z, Math.PI/2,           0, 0, material, false);    //ceiling
  walls[2] = new Wall(length/2-door_length/2, length,          center.x + (length/2 - door_length/2), center.y + length/2 - person_height, center.z+length/2,          0,          0, 0, material, true, door_length, door_position);    //back wall
  walls[3] = new Wall(length/2-door_length/2, length,          center.x - (length/2 - door_length/2), center.y + length/2 - person_height, center.z+length/2,          0,          0, 0, material, true, door_length, door_position);    //back wall
  walls[4] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material, false);    //front wall
  walls[5] = new Wall(length, length, center.x+length/2, center.y + length/2 - person_height,          center.z,          0, -Math.PI/2, 0, material, false);    //left wall
  walls[6] = new Wall(length, length, center.x-length/2, center.y + length/2 - person_height,          center.z,          0,  Math.PI/2, 0, material, false);    //right wall

  for (var i = 0; i < walls.length; i++) {
    scene.add(walls[i].mesh);
  }
  return walls;
}

function Wall(width, height, x, y, z, rotation_x, rotation_y, rotation_z, material, door, door_length, door_position) {
  this.door = door;
  this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material);

  this.mesh.position.x = x;
  this.mesh.position.y = y;
  this.mesh.position.z = z;
  this.mesh.rotation.x = rotation_x;
  this.mesh.rotation.y = rotation_y;
  this.mesh.rotation.z = rotation_z;
}

function Door(center, width, height, rooms) {
  this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,height), 1, 1, new THREE.MeshLambertMaterial({color:0xff0000 }));
  this.mesh.position.x = center.x;
  this.mesh.position.y = center.y;
  this.mesh.position.z = center.z;
  this.length = width;
  this.rooms = rooms;
}

function getAudio(url) {
  source = audio_context.createBufferSource();
  var mainVolume = audio_context.createGain();
  mainVolume.connect(audio_context.destination);
  var request = new XMLHttpRequest();

  request.open('GET', url, true);
  //request.open('GET', 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/caneTap.wav', true);
  //request.open('Get', 'http://thingsinjars.com/lab/web-audio-tutorial/hello.mp3', true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    var audioData = request.response;
    audio_context.decodeAudioData(audioData).then(function(buffer) {
      player.sound_buffer = buffer;
      player.sound_source = new SoundSource(buffer, player.sound_origin, cube_material);
      player.reverb_sound = doReverb(buffer, player.sound_origin, rooms[player.current_room].walls);
    });
  }
  request.send(null);
}

function doReverb(source_buffer, source_origin, walls)
{
  var reverb_sources = new Array();
  var array_index = 0;
  for (var i = 0; i < walls.length; i++)
  {
    var reverb_position = reflect(source_origin, walls[i].mesh.position, walls[i].mesh.rotation, walls[i].mesh.geometry.parameters.height, walls[i].mesh.geometry.parameters.width);
    if (rooms[player.current_room].isInDoorView(reverb_position.x, reverb_position.y, reverb_position.z, walls[i])) {
      continue;
    }
    reverb_sources[array_index] = new SoundSource(source_buffer, reverb_position, reflected_material);
    array_index++;
  }
  return reverb_sources;
}

function reflect(sourcePosition, wallPosition, wallRotation, wallWidth)
{
  //compute equation of plane
  var point1 = wallPosition;
  var point2;
  var point3;
  if (wallRotation.y != 0)
  {
    point2 = new THREE.Vector3(wallPosition.x, wallPosition.y, wallPosition.z + wallWidth);
    point3 = new THREE.Vector3(wallPosition.x, wallPosition.y + wallWidth, wallPosition.z);
  }
  else if (wallRotation.x < 0)
  {

    return new THREE.Vector3(sourcePosition.x, sourcePosition.y - Math.abs(wallPosition.y - sourcePosition.y), sourcePosition.z);
  }
  else if (wallRotation.x > 0)
  {
    console.log(wallPosition.y);
    console.log(sourcePosition.y);
    return new THREE.Vector3(sourcePosition.x, wallPosition.y + Math.abs(wallPosition.y + sourcePosition.y), sourcePosition.z);
  }
  else
  {
    point2 = new THREE.Vector3(wallPosition.x + wallWidth, wallPosition.y, wallPosition.z);
    point3 = new THREE.Vector3(wallPosition.x, wallPosition.y + wallWidth, wallPosition.z);
  }
  var point12_y = point2.y - point1.y;
  var point13_z = point3.z - point1.z;
  var point13_y = point3.y - point1.y;
  var point12_z = point2.z - point1.z;
  var point12_x = point2.x - point1.x;
  var point13_x = point3.x - point1.x;
  // Plane equation: ax+by+cz+d=0
  var a = ( point12_y * point13_z ) - ( point13_y * point12_z );
  var b = ( point12_z * point13_x ) - ( point13_z * point12_x );
  var c = ( point12_x * point13_y ) - ( point13_x * point12_y );
  var d = - ( a * point1.x + b * point1.y + c * point1.z );
  // (a,b,c) is perpendicular to plane, so only need to find a point on the line
  var t = (-(a*sourcePosition.x + b * sourcePosition.y + c * sourcePosition.z + d) / (Math.pow(a,2) + Math.pow(b,2) + Math.pow(c,2)));
  // reflectedPosition = (2*(sourcePosition + t*(a,b,c)) - sourcePosition) + sourcePosition
  var reflectedPosition = new THREE.Vector3(2*t*a+sourcePosition.x, 2*t*b + sourcePosition.y, 2*t*c + sourcePosition.z);
  return reflectedPosition;
}

function playSound() {
  player.sound_origin.x = camera.position.x;
  player.sound_origin.y = camera.position.y - 1.5 * person_height;
  player.sound_origin.z = camera.position.z;

  player.reverb_sound = doReverb(player.sound_buffer, player.sound_origin, rooms[player.current_room].walls);
  player.sound_source.source.start(audio_context.currentTime);

  for (var i = 0; i < player.reverb_sound.length; i++)
  {
    var distance = Math.sqrt(Math.pow(player.reverb_sound[i].position.x-camera.position.x,2) + Math.pow(player.reverb_sound[i].position.y-camera.position.y,2) + Math.pow(player.reverb_sound[i].position.z-camera.position.z, 2));
    player.reverb_sound[i].source.start(audio_context.currentTime + distance * SOUNDSPEED);
    player.reverb_sound[i] = new SoundSource(player.sound_buffer, player.reverb_sound[i].position, reflected_material);
  }
  player.sound_source = new SoundSource(player.sound_buffer, player.sound_origin, cube_material);
}

function stopSound() {
  player.sound_source.source.stop(audio_context.currentTime);

  for(var i = 0; i < player.reverb_sound.length; i++)
  {
    player.reverb_sound[i].source.stop(audio_context.currentTime);
  }
}

var keyForward = keyBackward = keyLeft = keyRight = false;

window.addEventListener('keydown', function(event) {
  switch(event.keyCode) {
    case 'W'.charCodeAt(0):
    case 38:
      keyForward = true;
      break;
    case 'S'.charCodeAt(0):
    case 40:
      keyBackward = true;
      break;
    case 'A'.charCodeAt(0):
    case 37:
      keyLeft = true;
      break;
    case 'D'.charCodeAt(0):
    case 39:
      keyRight = true;
      break;
    case ' '.charCodeAt(0):
    case 32:
      playSound();
    }
}, false);

window.addEventListener('keyup', function(event) {
  switch(event.keyCode) {
    case 'W'.charCodeAt(0):
    case 38:
      keyForward = false;
      break;
    case 'S'.charCodeAt(0):
    case 40:
      keyBackward = false;
      break;
    case 'A'.charCodeAt(0):
    case 37:
      keyLeft = false;
      break;
    case 'D'.charCodeAt(0):
    case 39:
      keyRight = false;
      break;
  }
}, false);

function didIntersect(corners) {
  var localTopVertex = player.geometry.vertices[0].clone();
  var globalTopVertex = localTopVertex.applyMatrix4(player.mesh.matrix);
  var localBottomVertex = player.geometry.vertices[6].clone();
  var globalBottomVertex = localBottomVertex.applyMatrix4(player.mesh.matrix);

  if (rooms[player.current_room].isInDoorWay(globalTopVertex.x, globalTopVertex.y, globalTopVertex.z) != -1) {
    return;
  }

  if (globalTopVertex.x + person_height >= corners[7].x) { //intersect right
    camera.position.x = rooms[player.current_room].corners[7].x - 1.5*person_height;
    player.sound_origin.x = rooms[player.current_room].corners[7].x - 1.5*person_height;
  } if (globalBottomVertex.x - person_height <= corners[0].x) { //intersect left
    camera.position.x = rooms[player.current_room].corners[0].x + 1.5*person_height;
    player.sound_origin.x = rooms[player.current_room].corners[7].x + 1.5*person_height;
  } if (globalBottomVertex.z + person_height >= corners[0].z) {
    camera.position.z = rooms[player.current_room].corners[0].z - 1;
    player.sound_origin.z = rooms[player.current_room].corners[0].z - 1;
  } if (globalTopVertex.z - person_height <= corners[7].z) {
    camera.position.z = rooms[player.current_room].corners[7].z + 1;
    player.sound_origin.z = rooms[player.current_room].corners[7].z + 1;
  }
}

function updatePlayerPosition() {
  player.mesh.position.x = camera.position.x;
  player.mesh.position.y = camera.position.y - person_height;
  player.mesh.position.z = camera.position.z;

  didIntersect(rooms[player.current_room].corners);
}

var update = function() {
  var dx = 0,dy = 0,dz = 0;
  var speed = 1/6;

  if (keyForward)
  {
    camera.translateZ(-speed); //local Z axis to object, not world Z axis
    // player.mesh.translateZ(-speed);
    updatePlayerPosition();
  }
  if (keyBackward)
  {
    camera.translateZ(speed); // local Z axis to object, not world Z axis
    // player.mesh.translateZ(speed);
    updatePlayerPosition();
  }
  if (keyLeft)
  {
    camera.rotation.y += speed/2; //world Rotation
    // player.mesh.rotation.y += speed/2;
    updatePlayerPosition();
  }
  if (keyRight)
  {
    camera.rotation.y -= speed/2; //world Rotation
    // player.mesh.rotation.y -= speed/2;
    updatePlayerPosition();
  }

  audio_context.listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
};

init();

render();
