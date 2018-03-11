// https://codeandsound.wordpress.com/2015/04/08/implementing-binaural-hrtf-panner-node-with-web-audio-api/

var pi = Math.PI;
var exp = Math.exp;
var sin = Math.sin;
var cos = Math.cos;
var tan = Math.tan;
var sinh = Math.sinh;
var cosh = Math.cosh;
var tanh = Math.tanh;
var asin = Math.asin;
var acos = Math.acos;
var atan = Math.atan;
var abs = Math.abs;
var sqrt = Math.sqrt;
var log = Math.log;
var pow = Math.pow;

var settings = document.getElementById("settings");
var plot = document.getElementById("plot");
var overlay = document.getElementById("overlay");
var fx = document.getElementById("fx");
var fxform = document.getElementById("fxform");
var W = plot.width;
var H = plot.height;
var ctx = plot.getContext("2d");
ctx.translate(W/2, H/2);
var octx = overlay.getContext("2d");
octx.translate(W/2, H/2);

var actx = new (window.AudioContext || window.webkitAudioContext)();
var osc0 = actx.createOscillator();
var osc1 = actx.createOscillator();
var osc2 = actx.createOscillator();
var gain0 = actx.createGain();
var gain1 = actx.createGain();
var gain2 = actx.createGain();
var gain3 = actx.createGain();
var pan = actx.createStereoPanner();

// White noise
var bufferSize = 4096;
var whiteNoise = actx.createScriptProcessor(bufferSize, 1, 1);
whiteNoise.onaudioprocess = function(e) {
	var output = e.outputBuffer.getChannelData(0);
	for (var i = 0; i < bufferSize; i++) {
		output[i] = Math.random() * 2 - 1;
	}
}
whiteNoise.connect(gain3);
gain3.gain.value = 0.1;

var beatvol = 0.1;
var f0 = 220;
var zerovol = 0.01;
var tonevol = 0.1;
var duration = 2000;
var wait = 1;
var pos = -wait/2;
var vol = 1;
var fm = 4;
var hold = false;
var manual = false;
var manualdir = 0;

osc0.type = 'sine'; // ref

osc1.type = 'square';

// Reference
osc0.frequency.value = f0;
osc0.connect(gain0);

osc1.frequency.value = 0;
osc1.connect(gain1);


osc2.type = osc1.type;
osc2.frequency.value = 0;
osc2.connect(gain2);

gain0.gain.value = zerovol * vol;
gain1.connect(pan);
gain1.gain.value = 0;
gain2.connect(pan);
gain2.gain.value = 0;
// osc.stop(actx.currentTime + 2);

pan.connect(actx.destination);

gain0.connect(actx.destination);
gain3.connect(actx.destination);

var lt = 0;
function tick(t) {
	if (hold) {
		pos = mousepos.x/500;
		if (pos > 1) pos = 1;
	} else {
		if (!manual) {
			dt = t - lt;
			pos += dt/duration;
			if (pos > 1) pos = -wait;
		} else {
			pos += manualdir*0.005;
			if (pos > 1) pos = 1;
			if (pos < 0) pos = 0;
		}
	}
	setpos(pos);
	lt = t;
}

function sgn(x) { 
	return x < 0 ? -1 : 1;
}

function step(x) {
	return x < 0 ? 0 : 1;
}

function sqwave(x, n) {
	y = 0
	for (var i = 0; i < n; i++) { y += Math.sin(x*(2*i+1))/(2*i+1); };
	y *= 4/pi;
	return y;
}

function f(x) {
	var y = 0;
	
	// y = sin(x*pi);
	// y = cos(x*pi);
	
	// for (var i = 0; i < 25; i++) { y += Math.sin(x*Math.PI*(2*i+1))/(2*i+1); }; y *= 4/pi;
	// y = sgn(sin(pi*x));
	// y = x;
	// y = exp(-pow(3*x,2)); // Gaussian
	// y = 1/(1 + Math.pow(5*x,2)); // Lorentzian
	
	// y = exp(-2*x)/10;
	
	return y;
}

function setpos(x) {
	clearOverlay();
	
	osc0.frequency.value = f0;
	gain0.gain.value = zerovol * vol;
	var sx = ((x-0.5)*2);
	var y = f(sx);
	var freq;
	
	if (x < 0 || x > 1) {
		gain1.gain.value = 0;
		gain2.gain.value = 0;
		pan.pan.value = -1;
		freq = f(-1);
		if (!(freq >= 10 && freq <= 20e3)) freq = 0;
		osc1.frequency.value = freq;
		osc2.frequency.value = freq;
		gain3.gain.value = 0;
		return;
	}
	
	gain1.gain.value = (x)*tonevol * vol;
	gain2.gain.value = (1-x)*tonevol * vol;
	pan.pan.value = (x*2-1);
	
	// freq = f0*(1+y);
	freq = f0*Math.pow(fm, y);
	
	if (isNaN(y)) freq = 0;
	
	if (freq < 0) freq = 0;
	if (freq > 20e3) freq = 20e3;
	
	osc1.frequency.value = freq;
	osc2.frequency.value = freq;
	
	var beat = (
		Math.exp(-Math.pow(50*sx,2))
		+
		Math.exp(-Math.pow(50*(sx-0.5),2))/4
		+
		Math.exp(-Math.pow(50*(sx+0.5),2))/4
		+
		Math.exp(-Math.pow(50*(sx-1),2))/4
		+
		Math.exp(-Math.pow(50*(sx+1),2))/4
		
		// +
		// Math.exp(-Math.pow(50*(sx-0.75),2))/8
		// +
		// Math.exp(-Math.pow(50*(sx+0.75),2))/8
		// +
		// Math.exp(-Math.pow(50*(sx-0.25),2))/8
		// +
		// Math.exp(-Math.pow(50*(sx+0.25),2))/8
	);
	
	gain3.gain.value = beat*beatvol * vol;
	
	updateOverlay(sx, beat);
}

function updatePlot() {
	
	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(-W/2, -H/2, W, H);
	
	ctx.strokeStyle = "#DDD";
	ctx.lineWidth = 1;
	
	ctx.beginPath();
	ctx.moveTo(-W/2,-H/4);
	ctx.lineTo(W/2,-H/4);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.moveTo(-W/2,H/4);
	ctx.lineTo(W/2,H/4);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.moveTo(-W/4,-H/2);
	ctx.lineTo(-W/4,H/2);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.moveTo(W/4,-H/2);
	ctx.lineTo(W/4,H/2);
	ctx.stroke();
	
	ctx.strokeStyle = "#BBB";
	ctx.lineWidth = 1;
	
	ctx.beginPath();
	ctx.moveTo(-W/2,0);
	ctx.lineTo(W/2,0);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.moveTo(0,-H/2);
	ctx.lineTo(0,H/2);
	ctx.stroke();
	
	var px = -1;
	var py = f(-1);
	
	ctx.beginPath();
	ctx.strokeStyle = "#F00";
	ctx.moveTo(W/2*px, -H/4*py);
	ctx.lineWidth = 2;
	for (var i = 1; i <= W; i++) {
		px = ((i/W)*2)-1;
		py = f(px);
		ctx.lineTo(W/2*px, -H/4*py);
	}
	ctx.stroke();
}

function clearOverlay() {
	octx.clearRect(-W/2, -H/2, W, H);
}

function updateOverlay(x, beat) {
	
	y = f(x)
	
	octx.strokeStyle = "rgba(0,0,255,0.3)";
	octx.lineWidth = 4*(1+2*beat);
	
	octx.beginPath();
	octx.moveTo(W/2*x,H/2);
	octx.lineTo(W/2*x,-H/2);
	octx.stroke();
	
	octx.fillStyle = "rgb(0,0,255)";
	octx.beginPath();
	octx.arc(W/2*x,-H/4*y,4*(1+2*beat),0,2*pi)
	octx.fill();
}

function start() {
	osc0.start();
	osc2.start();
	osc1.start();
}

function stop() {
	osc0.stop();
	osc2.stop();
	osc1.stop();
}

function mute() { vol = 0; }
function unmute() { vol = 1; }

// window.addEventListener("blur", function() {
	// mute();
// });
// window.addEventListener("focus", function(){ 
	// unmute();
// });

function animate(t) {
	tick(t);
	window.requestAnimationFrame(animate);
}
window.requestAnimationFrame(animate);

function evMouseDown() {
	hold = true;
}

function evMouseUp() {
	hold = false;
}

var mousepos = {x:0, y:0};
function evMouseMove(e) {
	var rect = overlay.getBoundingClientRect();
	mousepos.x = e.clientX - rect.left;
	mousepos.y = e.clientY - rect.top;
}

function evChangeFunction(e) {
	try {
		oldf = f;
		eval("f = function(x) { return "+fx.value+"; }");
		pos = -wait/4;
		updatePlot();
		fx.style.backgroundColor = "#FFFFFF";
	} catch (ex) {
		fx.style.backgroundColor = "#FFCCCC";
		f = oldf;
		pos = -wait/4;
		updatePlot();
	}
	e.preventDefault();
	return;
}

function updateSettings() {
	s = "";
	s += "Duration: "+duration+"<br/>";
	s += "Wait: "+Math.round(wait*100)/100+"<br/>";
	s += "f<sub>0</sub>: "+f0+" Hz<br/>";
	s += "f<sub>M</sub>: "+Math.round(fm*100)/100+"<br/>";
	settings.innerHTML = s;
}

function evKeyDown(e) {
	if (document.activeElement == fx) return;
	if (e.key == "Control") {
		manual = true;
	}
	if (e.ctrlKey) {
		if (e.key == "ArrowLeft") {
			manualdir = -1;
		}
		if (e.key == "ArrowRight") {
			manualdir = +1;
		}
		return;
	}
	if (e.shiftKey) {
		if (e.key == "ArrowLeft") duration += 100;
		if (e.key == "ArrowRight") duration -= 100;
		if (e.key == "ArrowUp") wait += 0.05;
		if (e.key == "ArrowDown") wait -= 0.05;
		if (e.key == "_") f0 -= 5;
		if (e.key == "+") f0 += 5;
		if (e.key == "<") fm -= 0.05;
		if (e.key == ">") fm += 0.05;
		if (f0 < 0) f0 = 0;
		if (fm < 1) fm = 1;
		if (wait < 0) wait = 0;
		updateSettings();
	}
}

function evKeyUp(e) {
	if (e.key == "Control") {
		manual = false;
	}
	if (e.key == "ArrowLeft" && manualdir == -1) manualdir = 0;
	if (e.key == "ArrowRight" && manualdir == +1) manualdir = 0;
}

overlay.addEventListener("mousedown", evMouseDown);
overlay.addEventListener("mousemove", evMouseMove);
window.addEventListener("mouseup", evMouseUp);
window.addEventListener("keydown", evKeyDown);
window.addEventListener("keyup", evKeyUp);

fxform.addEventListener("submit", evChangeFunction);

updatePlot();
updateSettings();
start();