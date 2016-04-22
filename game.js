var scene = new THREE.Scene();
var camera;
var person_height = 1.8; // 1 unit = 1 meter
var SOUNDSPEED = 1/343; // speed of sound in meters
var renderer;
var url = 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/caneTap.wav';
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
  getAudio(url);
  rooms[0] = new Room(new THREE.Vector3(0,0,0), 10, new THREE.Vector3(0,0,0), true, 1);
  current_room = 0;
  rooms[1] = new Room(new THREE.Vector3(0,0,-20), 30, new THREE.Vector3(0,0,-20), true, 0);
  player = new Player();
  console.log("Finished init");
}

var cube_geometry = new THREE.BoxGeometry( 1, 1, 1 );
var cube_material = new THREE.MeshBasicMaterial( { color: 0x0ff0f0 } );
var reflected_material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );

//a room needs to know its walls, its sound
function Room(origin, length, sound_origin, door, direction) {
  var wall_material = new THREE.MeshLambertMaterial({color:0xffffff});
  if (door)
    if (direction == 0)
      this.walls = createRoomBackDoor(origin, length, wall_material);
    else if (direction == 1)
      this.walls = createRoomFrontDoor(origin, length, wall_material);
  else
    this.walls = createRoom(origin, length, wall_material);
  console.log(this.walls);
  this.sound_origin = sound_origin;

  //assumption: first two walls are actually the floor and ceiling
  this.collidable = new Array();
  for (var i = 0; i < this.walls.length - 2; i++ ) {
    this.collidable[i] = this.walls[i+2];
  }
  this.corners = new Array();
  this.corners[0] = new THREE.Vector3(this.walls[2].position.x - length/2, this.walls[2].position.y - length/2, this.walls[2].position.z); //back left bottom
  this.corners[1] = new THREE.Vector3(this.walls[2].position.x + length/2, this.walls[2].position.y - length/2, this.walls[2].position.z); // back right bottom
  this.corners[2] = new THREE.Vector3(this.walls[2].position.x - length/2, this.walls[2].position.y + length/2, this.walls[2].position.z); // back left top
  this.corners[3] = new THREE.Vector3(this.walls[2].position.x + length/2, this.walls[2].position.y + length/2, this.walls[2].position.z); // back right top
  this.corners[4] = new THREE.Vector3(this.walls[3].position.x - length/2, this.walls[3].position.y - length/2, this.walls[3].position.z); //front left bottom
  this.corners[5] = new THREE.Vector3(this.walls[3].position.x + length/2, this.walls[3].position.y - length/2, this.walls[3].position.z); // front right bottom
  this.corners[6] = new THREE.Vector3(this.walls[3].position.x - length/2, this.walls[3].position.y + length/2, this.walls[3].position.z); //front left top
  this.corners[7] = new THREE.Vector3(this.walls[3].position.x + length/2, this.walls[3].position.y + length/2, this.walls[3].position.z); //front right top
  // this.sound_buffer
  // this.origin_sound
  // this.reverb_sound
  // var mesh = new Array();
  // for (var i = 0; i < this.corners.length; i++) {
  //   mesh[i] = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial( {color: 0xff0000 }));
  //   mesh[i].position.x = this.corners[i].x;
  //   mesh[i].position.y = this.corners[i].y;
  //   mesh[i].position.z = this.corners[i].z;
  //   scene.add(mesh[i]);
  // }
  // console.log(this.corners);
}

function Player() {
  this.current_room = current_room;
  this.geometry = new THREE.BoxGeometry( 1 * person_height, 2 * person_height, 1 * person_height);
  this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial( {color:0x000000} ));
  // this.mesh.position.x = camera.position.x;
  // this.mesh.position.y = camera.position.y - person_height;
  // this.mesh.position.z = camera.position.z;
  scene.add(this.mesh);

  // var mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial( {color: 0xff0000 }));
  // mesh.position.x = this.geometry.vertices[0].x;
  // mesh.position.y = this.geometry.vertices[0].y;
  // mesh.position.z = this.geometry.vertices[0].z;
  // scene.add(mesh);
  //
  // var mesh2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial( {color: 0xff0000 }));
  // mesh2.position.x = this.geometry.vertices[6].x;
  // mesh2.position.y = this.geometry.vertices[6].y;
  // mesh2.position.z = this.geometry.vertices[6].z;
  // scene.add(mesh2);
}

function SoundSource(sound_buffer, sound_origin, material) {
  this.position = sound_origin;
  // this.position.y -= person_height;
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

  if (rooms[current_room].origin_sound) {
    rooms[current_room].origin_sound.cube.rotation.x += 0.1;
    rooms[current_room].origin_sound.cube.rotation.y += 0.1;
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
    scene.add(walls[i]);
  }
  return walls;
}

function createRoomFrontDoor(center, length, material) {
  var walls = new Array();
  walls[0] = new Wall(length, length,          center.x, center.y            - person_height,          center.z, -Math.PI/2,          0, 0, material, false);    //floor
  walls[1] = new Wall(length, length,          center.x, center.y   + length - person_height,          center.z, Math.PI/2,           0, 0, material, false);    //ceiling
  walls[2] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z+length/2,          0,          0, 0, material, false);    //back wall
  walls[3] = new Wall(length, length, center.x+length/2, center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material, true);    //front left wall
  walls[4] = new Wall(length, length, center.x-length/2, center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material, true);    //front right wall
  walls[5] = new Wall(length, length, center.x+length/2, center.y + length/2 - person_height,          center.z,          0, -Math.PI/2, 0, material, false);    //left wall
  walls[6] = new Wall(length, length, center.x-length/2, center.y + length/2 - person_height,          center.z,          0,  Math.PI/2, 0, material, false);    //right wall

  for (var i = 0; i < walls.length; i++) {
    scene.add(walls[i]);
  }
  return walls;
}

function createRoomBackDoor(center, length, material) {
  var walls = new Array();
  walls[0] = new Wall(length, length,          center.x, center.y            - person_height,          center.z, -Math.PI/2,          0, 0, material, false);    //floor
  walls[1] = new Wall(length, length,          center.x, center.y   + length - person_height,          center.z, Math.PI/2,           0, 0, material, false);    //ceiling
  walls[2] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z+length/2,          0,          0, 0, material, true);    //back wall
  walls[3] = new Wall(length, length,          center.x, center.y + length/2 - person_height, center.z-length/2,          0,          0, 0, material, false);    //front wall
  walls[4] = new Wall(length, length, center.x+length/2, center.y + length/2 - person_height,          center.z,          0, -Math.PI/2, 0, material, false);    //left wall
  walls[5] = new Wall(length, length, center.x-length/2, center.y + length/2 - person_height,          center.z,          0,  Math.PI/2, 0, material, false);    //right wall

  for (var i = 0; i < walls.length; i++) {
    scene.add(walls[i]);
  }
  return walls;
}

function Door(width, height, x, y, z) {
  this.position.x = x;
  this.position.y = y;
  this.position.z = z;
  this.width = width;
  this.height = height;
}

function Wall(width, height, x, y, z, rotation_x, rotation_y, rotation_z, material, door) {
  this.door = door;
  console.log(door);
  this.mesh = new Array();
  // if (door) {
  //   // left-side
  //   this.mesh[0] = new THREE.Mesh(new THREE.PlaneGeometry(width/2, height, 1, 1), material);
  //   this.mesh[0].position.x = -width/2;
  //   this.mesh[0].position.y = y;
  //   this.mesh[0].position.z = z;
  //   this.mesh[0].rotation.x = rotation_x;
  //   this.mesh[0].rotation.y = rotation_y;
  //   this.mesh[0].rotation.z = rotation_z;
  //
  //   // right-side
  //   this.mesh[1] = new THREE.Mesh(new THREE.PlaneGeometry(width/2, height, 1, 1), material);
  //   this.mesh[1].position.x = width/2;
  //   this.mesh[1].position.y = y;
  //   this.mesh[1].position.z = z;
  //   this.mesh[1].rotation.x = rotation_x;
  //   this.mesh[1].rotation.y = rotation_y;
  //   this.mesh[1].rotation.z = rotation_z;
  // } else {
    // full wall, no door
  //   this.mesh[0] = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material);
  //   this.mesh[0].position.x = x;
  //   this.mesh[0].position.y = y;
  //   this.mesh[0].position.z = z;
  //   this.mesh[0].rotation.x = rotation_x;
  //   this.mesh[0].rotation.y = rotation_y;
  //   this.mesh[0].rotation.z = rotation_z;
  // }
  this.position = new THREE.Vector3();
  this.position.x = x;
  this.position.y = y;
  this.position.z = z;
  this.rotation = new THREE.Vector3();
  this.rotation.x = rotation_x;
  this.rotation.y = rotation_y;
  this.rotation.z = rotation_z;
}

function createWall(width, height, x, y, z, rotation_x, rotation_y, rotation_z, material, door)
{
  var wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material);
  wall.position.x = x;
  wall.position.y = y;
  wall.position.z = z;
  wall.rotation.x = rotation_x;
  wall.rotation.y = rotation_y;
  wall.rotation.z = rotation_z;
  return wall;
}
/*
* $.ajax({
    url:
}).then/done (function(buffer) {
  //success
}, function(e) {
  // error
})

call when on function/promise
$.when.apply($, my_array) //waits until everything is available then call function

promises deferred same concept as jquery deferred

can pmap over list of rooms and sounds (for multiple sounds?)
function pmap(values, func) {
calls func on all the values and wait for results then return promises
}
can see this on Tar Heel repo on GitHub in store.js under Themes
*
*
*/

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
      rooms[current_room].sound_buffer = buffer;
      rooms[current_room].origin_sound = new SoundSource(buffer, rooms[current_room].sound_origin, cube_material);
      rooms[current_room].reverb_sound = doReverb(buffer, rooms[current_room].sound_origin, rooms[current_room].walls);
    });
  }
  request.send(null);
}

function doReverb(source_buffer, source_origin, walls)
{
  var reverb_sources = new Array();
  for (var i = 0; i < walls.length; i++)
  {
    var reverb_position = reflect(source_origin, walls[i].position, walls[i].rotation, walls[i].geometry.parameters.height, walls[i].geometry.parameters.width);
    // reverb_position.y -= 2 * person_height;
    reverb_sources[i] = new SoundSource(source_buffer, reverb_position, reflected_material);
    //var listenerDistance = Math.sqrt(Math.pow(reverbPosition.x-camera.position.x,2) + Math.pow(reverbPosition.y-camera.position.y,2) + Math.pow(reverbPosition.z-camera.position.z, 2));
    //console.log(listenerDistance*SOUNDSPEED);
    //reflectedCubes[i] = new THREE.Mesh( cube_geometry, new THREE.MeshBasicMaterial( { color: 0x0000ff } ) );
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
    return new THREE.Vector3(sourcePosition.x, sourcePosition.y - wallWidth, sourcePosition.z);
  }
  else if (wallRotation.x > 0)
  {
    return new THREE.Vector3(sourcePosition.x, sourcePosition.y + wallWidth, sourcePosition.z);
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
  //update sound position before playing
  rooms[current_room].origin_sound.position.x = camera.position.x;
  rooms[current_room].origin_sound.position.y = camera.position.y;
  rooms[current_room].origin_sound.position.z = camera.position.z;
  rooms[current_room].sound_origin = camera.position;
  rooms[current_room].reverb_sound = doReverb(rooms[current_room].sound_buffer, rooms[current_room].sound_origin, rooms[current_room].walls);
  rooms[current_room].origin_sound.source.start(audio_context.currentTime);

  for (var i = 0; i < rooms[current_room].reverb_sound.length; i++)
  {
    var distance = Math.sqrt(Math.pow(rooms[current_room].reverb_sound[i].position.x-camera.position.x,2) + Math.pow(rooms[current_room].reverb_sound[i].position.y-camera.position.y,2) + Math.pow(rooms[current_room].reverb_sound[i].position.z-camera.position.z, 2));
    //console.log("current time " + audio_context.currentTime + ". sound distance " + distance * SOUNDSPEED);
    rooms[current_room].reverb_sound[i].source.start(audio_context.currentTime + distance * SOUNDSPEED);

    rooms[current_room].reverb_sound[i] = new SoundSource(rooms[current_room].sound_buffer, rooms[current_room].reverb_sound[i].position, reflected_material);
  }
  rooms[current_room].origin_sound = new SoundSource(rooms[current_room].sound_buffer, rooms[current_room].sound_origin, cube_material);
  camera.position.y += person_height;
}

function stopSound() {
  rooms[current_room].origin_sound.source.stop(audio_context.currentTime);

  for(var i = 0; i < rooms[current_room].reverb_sound.length; i++)
  {
    rooms[current_room].reverb_sound[i].source.stop(audio_context.currentTime);
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

// function didCollide() {
//   var collidedVertices = "";
//   for (var vertexIndex = 0; vertexIndex < player.geometry.vertices.length; vertexIndex++) {
//     var localVertex = player.geometry.vertices[vertexIndex].clone();
//     var globalVertex = localVertex.applyMatrix4(player.mesh.matrix);
//     var directionVector = globalVertex.sub(player.mesh.position);
//
//     var ray = new THREE.Raycaster(player.mesh.position, directionVector.clone().normalize());
//     var collisionResults = ray.intersectObjects(player.current_room.collidable);
//     if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length())
//     {
//       collidedVertices += vertexIndex;
//     }
//   }
// }

function intersect(corners) {
  var localTopVertex = player.geometry.vertices[0].clone();
  var globalTopVertex = localTopVertex.applyMatrix4(player.mesh.matrix);
  var localBottomVertex = player.geometry.vertices[6].clone();
  var globalBottomVertex = localBottomVertex.applyMatrix4(player.mesh.matrix);

  if (globalTopVertex.x >= corners[0].z && globalTopVertex.z <= corners[0].z) {
    console.log("intersect right");
    console.log(globalBottomVertex);
    console.log(corners[0]);
    console.log(corners[7]);
    return 0; //intersect right
  } else if (globalBottomVertex.x <= corners[7].z && globalBottomVertex.z <= corners[0].z) { //intersect left
    console.log("intersect left");
    console.log(globalBottomVertex);
    console.log(corners[7]);
    console.log(corners[0]);
    return 1; //intersect left
  } else if (globalTopVertex.z >= corners[7].x && globalTopVertex.x <= corners[7].x) {
    console.log("intersect behind");
    console.log(globalTopVertex);
    console.log(corners[7]);
    console.log(corners[0]);
    return 2; //intersect behind
  } else if (globalBottomVertex.z <= corners[0].x && globalBottomVertex.x >= corners[0].x) {
    console.log("intersect front");
    console.log(globalBottomVertex);
    console.log(corners[0]);
    console.log(corners[7]);
    return 3; //intersect front
  }
  return -1;
}


function updatePlayerPosition() {
  player.mesh.position.x = camera.position.x;
  player.mesh.position.y = camera.position.y - person_height;
  player.mesh.position.z = camera.position.z;

  // var intersected_wall = intersect(rooms[player.current_room].corners);
  // if (intersected_wall == 0) {
  //   camera.position.x = rooms[player.current_room].corners[0].z - 1;
  // } else if (intersected_wall == 1) {
  //   camera.position.x = rooms[player.current_room].corners[7].z + 1;
  // } else if (intersected_wall == 2) {
  //   camera.position.z = rooms[player.current_room].corners[7].x - 1;
  // } else if (intersected_wall == 3) {
  //   camera.position.z = rooms[player.current_room].corners[0].x + 1;
  // }
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
