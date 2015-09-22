var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

var render = function () {
  requestAnimationFrame( render );

  cube.rotation.x += 0.1;
  cube.rotation.y += 0.1;

  renderer.render(scene, camera);
};

render();


var play = document.querySelector(".play");
var stop = document.querySelector(".stop");
var audio_context = new (window.AudioContext || window.webkitAudioContext)();
var source;
var mainVolume;
var request;

function getAudio() {
  source = audio_context.createBufferSource();
  mainVolume = audio_context.createGain();
  mainVolume.connect(audio_context.destination);
  request = new XMLHttpRequest();

  request.open('GET', 'https://www.cs.unc.edu/~gb/uploaded-files/serust@CS.UNC.EDU/sound.wav', true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    var audioData = request.response;
    audio_context.decodeAudioData(audioData, function(buffer) {
      source.buffer = buffer;
      source.connect(audio_context.destination);
      source.loop = true;
      source.panner = audio_context.createPanner();
      source.volume.connect(source.panner);
      source.panner.connect(mainVolume);
      audio_context.listener.setPosition(1,1,1);
    }, function(e) {
      alert("Error decoding audio");//error decoding audio
    });
  }
  request.send();
}

play.onclick = function() {
  getAudio();
  source.start(0);
}

stop.onclick = function() {
  source.stop(0);
}


// var oscillator = audio_context.createOscillator();
// var volume = audio_context.createGain();
// oscillator.connect(volume);
// volume.connect(audio_context.destination);

// oscillator.type = 'sine'; // sine wave - other values are 'square', 'sawtooth', 'triangle', and 'custom'
// oscillator.frequency.value = 2500; // in Hz
// oscillator.start(0);
