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

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

var plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(20,200,20,200), new THREE.MeshLambertMaterial({color:0xffffff}));
plane.position.y = -5.0;
plane.rotation.x = -Math.PI/2;
scene.add(plane);

camera.position.z = 5;

var play = document.querySelector(".play");
var stop = document.querySelector(".stop");
var audio_context = new (window.AudioContext || window.webkitAudioContext)();
var source;
var panner;
var mainVolume;
var request;
var convolver;

function getAudio() {
  source = audio_context.createBufferSource();
  mainVolume = audio_context.createGain();
  mainVolume.connect(audio_context.destination);
  request = new XMLHttpRequest();

  // request.open('GET', 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/sound.wav', true);
  //request.open('GET', 'sound.wav', true);
  request.open('Get', 'http://thingsinjars.com/lab/web-audio-tutorial/hello.mp3', true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    var audioData = request.response;
    audio_context.decodeAudioData(audioData, function(buffer) {
      source.buffer = buffer;
      // source.connect(audio_context.destination);
      source.loop = true;
      // panner.panningModel = "HRTF";
      // panner.distanceModel = "inverse";
      // panner.refDistance = 1;
      // panner.maxDistance = 10000;
      // panner.rolloffFactor = 1;
      // panner.coneInnerAngle = 360;
      // panner.coneOuterAngle = 0;
      // panner.coneOuterGain = 0;
      // panner.setOrientation(1,0,0);
      // panner.setPosition(cube.position.x, cube.position.y, cube.position.z);
      convolver = audio_context.createConvolver();
      convolver.connect(audio_context.destination);
      source.connect(convolver);
      //  setReverbImpulseResponse('http://thingsinjars.com/lab/web-audio-tutorial/dustbin.wav', convolver, playSound);
      setReverbImpulseResponse('http://thingsinjars.com/lab/web-audio-tutorial/Church-Schellingwoude.mp3', convolver, playSound);
      panner = audio_context.createPanner();
      panner.setPosition(cube.position.x,cube.position.y,cube.position.z);
      panner.panningModel = "HRTF";
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      source.connect(panner);
      audio_context.listener.setPosition(1,1,1);
      panner.connect(audio_context.destination);
    }, function(e) {
      alert("Error decoding audio"); //error decoding audio
    });
  }
  request.send();
}

function setReverbImpulseResponse(url, convolver, callback)
{
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    audio_context.decodeAudioData(request.response, function(convolverbuffer) {
      convolver.buffer = convolverbuffer;
      callback();
    });
  }
  request.send();
}

play.onclick = function() {
  getAudio();
  playSound();
}

function playSound() {
  source.start(audio_context.currentTime);
}

function stopSound() {
  source.stop(audio_context.currentTime);
}

stop.onclick = function() {
  stopSound();
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
  var dx = 0,dy =0,dz=0;
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
