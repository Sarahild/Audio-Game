//document.onload = init();

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 8.00
camera.position.y = -0.50;

function position(x,y,z,w) {
  this.x = x;
  this.y = y;
  this.z = z;
}

// function camera(position) {
//   this = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.1, 1000 );
//   // this.setPosition = function(position) {
//   //   this.position.x = position.x;
//   //   this.position.y = position.y;
//   //   this.position.z = position.z;
//   // }
// }
// var cam = new camera(new position(1,-0.5,8.00,1));

var light = new THREE.PointLight(0xFFFFFF);
light.position.x = 4;
light.position.y = 4;
light.position.z = 4;
scene.add(light);

var SOUNDSPEED = 1/343; //speed of sound

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var cube_geometry = new THREE.BoxGeometry( 1, 1, 1 );
var cube_material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( cube_geometry, cube_material );
scene.add( cube );

var planeMaterial = new THREE.MeshLambertMaterial({color:0xffffff});
var floor = createWall(20,200,20,200, 0, -5.0, 0, -Math.PI/2, planeMaterial);
scene.add(floor);
var walls = new Array();
walls[0] = createWall(10, 10, 10, 10, 0, 0,  10, 0, planeMaterial);
scene.add(walls[0]);
walls[1] = createWall(10, 10, 10, 10, 0, 0, -10, 0, planeMaterial);
scene.add(walls[1]);

var reverbPositions = new Array();

function createWall(width, height, widthSegments, heightSegments, x, y, z, rotation_x, material)
{
  var wall = new THREE.Mesh(new THREE.PlaneGeometry(width,height,widthSegments,heightSegments), material);
  wall.position.x = x;
  wall.position.y = y;
  wall.position.z = z;
  wall.rotation.x = rotation_x;
  return wall;
}

camera.position.z = 5;

var play = document.querySelector(".play");
var stop = document.querySelector(".stop");
var audio_context = new (window.AudioContext || window.webkitAudioContext)();
var source;
var panner;
var mainVolume;
var request;
var convolver;
var reverbSources = new Array();
var reflectedCubes = new Array();

function init() {
  getAudio();
}

init();

function getAudio() {
  source = audio_context.createBufferSource();
  mainVolume = audio_context.createGain();
  mainVolume.connect(audio_context.destination);
  request = new XMLHttpRequest();

  //request.open('GET', 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/sound.wav', true);
  //request.open('GET', 'sound.wav', true);
  request.open('Get', 'http://thingsinjars.com/lab/web-audio-tutorial/hello.mp3', true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    var audioData = request.response;
    audio_context.decodeAudioData(audioData, function(buffer) {
      source.buffer = buffer;
      //source.loop = true;
      panner = audio_context.createPanner();
      panner.setPosition(cube.position.x, cube.position.y, cube.position.z);
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 1;
      panner.maxDistance = 1000;
      panner.rolloffFactor = 1;
      // panner.coneInnerAngle = 360;
      // panner.coneOuterAngle = 0;
      // panner.coneOuterGain = 0;
      // panner.setOrientation(1,0,0);
      audio_context.listener.setPosition(1,1,1);
      doReverb(buffer);
//      playSound();
      convolver = audio_context.createConvolver();
      //setReverbImpulseResponse('http://thingsinjars.com/lab/web-audio-tutorial/Church-Schellingwoude.mp3', convolver, playSound);
      //setReverbImpulseResponse('http://thingsinjars.com/lab/web-audio-tutorial/dustbin.wav', convolver, playSound);
      //source.connect(convolver);
      //convolver.connect(panner);
      source.connect(panner);
      panner.connect(audio_context.destination);
      //source.connect(convolver);
    }, function(e) {
      alert("Error decoding audio"); //error decoding audio
    });
  }
  request.send();
}

function doReverb(sourceBuffer)
{
  var originalPosition = new THREE.Vector3(0,0,0);
  for (var i = 0; i < walls.length; i++)
  {
    reverbSources[i] = audio_context.createBufferSource();
    reverbVolume = audio_context.createGain();
    // reverbVolume.gain.value = 1;
    reverbSources[i].buffer = sourceBuffer;
    reverbSources[i].connect(reverbVolume);
    //reverbSources[i].loop = true;
    var panner = audio_context.createPanner();
    var reverbPosition = reflect(originalPosition, walls[i].position, walls[i].geometry.parameters.height, walls[i].geometry.parameters.width);
    //var listenerDistance = Math.sqrt(Math.pow(reverbPosition.x-camera.position.x,2) + Math.pow(reverbPosition.y-camera.position.y,2) + Math.pow(reverbPosition.z-camera.position.z, 2));
    //console.log(listenerDistance*SOUNDSPEED);
    //var reverbDelay = audio_context.createDelay(1);
    reflectedCubes[i] = new THREE.Mesh( cube_geometry, new THREE.MeshBasicMaterial( { color: 0x0000ff } ) );
    reflectedCubes[i].position.x = reverbPosition.x;
    reflectedCubes[i].position.y = reverbPosition.y;
    reflectedCubes[i].position.z = reverbPosition.z;
    scene.add(reflectedCubes[i]);
    panner.setPosition(reverbPosition.x, reverbPosition.y, reverbPosition.z);
    reverbVolume.connect(panner);
    //reverbVolume.connect(reverbDelay);
    //reverbDelay.connect(panner);
    panner.connect(audio_context.destination);
    //reverbDelay.connect(audio_context.destination);
  }
  // return reverbSources;
}

function reflect(sourcePosition, wallPosition, wallWidth)
{
  //compute equation of plane
  var point1 = wallPosition;
  var point2 = new THREE.Vector3(wallPosition.x + wallWidth, wallPosition.y, wallPosition.z);
  var point3 = new THREE.Vector3(wallPosition.x, wallPosition.y + wallWidth, wallPosition.z);
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

function setReverbImpulseResponse(url, convolver, callback)
{
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    audio_context.decodeAudioData(request.response, function(convolverbuffer) {
      convolver.buffer = convolverbuffer;
      //callback();
    });
  }
  request.send();
}

var first = true;

play.onclick = function() {
  playSound();
}

stop.onclick = function() {
  stopSound();
}

function playSound() {
  source.start(audio_context.currentTime);
  for (var i = 0; i < reverbSources.length; i++)
  {
    var distance = Math.sqrt(Math.pow(reflectedCubes[i].position.x-camera.position.x,2) + Math.pow(reflectedCubes[i].position.y-camera.position.y,2) + Math.pow(reflectedCubes[i].position.z-camera.position.z, 2));
    console.log("current time " + audio_context.currentTime + ". sound distance " + distance/343);
    reverbSources[i].start(audio_context.currentTime + distance / 343);
  }
}

function stopSound() {
  source.stop(audio_context.currentTime);
  for(var i = 0; i < reverbSources.length; i++)
  {
    console.log(reverbSources[i]);
    reverbSources[i].stop(audio_context.currentTime);
  }
}

var keyForward = keyBackward = keyLeft = keyRight = false;
var mx = 0, my = 0;

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

var setListenerPosition = function(dx,dy,dz)
{
  camera.position.y += dy;
  camera.position.x += dx;
  camera.position.z += dz;
  audio_context.listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
  // panner.setVelocity(dx,dy,dz);
};

var update = function() {
  var dx = 0,dy = 0,dz = 0;
  var speed = 1/6;

  if (keyForward)
  {
    dz = -speed;
  }
  if (keyBackward)
  {
    dz = speed;
  }
  if (keyLeft)
  {
    dx = -speed;
  }
  if (keyRight)
  {
    dx = speed;
  }
  setListenerPosition(dx,dy,dz);
};

var render = function () {
  requestAnimationFrame( render );

  cube.rotation.x += 0.1;
  cube.rotation.y += 0.1;

  update();

  renderer.render(scene, camera);
};

render();
