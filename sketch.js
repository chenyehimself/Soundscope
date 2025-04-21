let mic, fft;
let isMicStarted = false;
let isAppStarted = false;
let uploadedSound;
let isFilePlaying = false;

function setup() {
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop(); // 默认不运行，等待点击 START
}

function draw() {
  background(255);

  if (isAppStarted && (isMicStarted || isFilePlaying)) {
    let spectrum = fft.analyze();

    noStroke();
    fill(0);
    for (let i = 0; i < spectrum.length; i++) {
      let x = map(i, 0, spectrum.length, 0, width);
      let h = -height + map(spectrum[i], 0, 255, height, 0);
      rect(x, height, width / spectrum.length, h);
    }

    let waveform = fft.waveform();
    noFill();
    stroke(0);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      let x = map(i, 0, waveform.length, 0, width);
      let y = map(waveform[i], -1, 1, 0, height);
      vertex(x, y);
    }
    endShape();
  }
}

function startSketch() {
  isAppStarted = true;

  // 初始化 Tone.js，确保在用户点击后启动
  Tone.start().then(() => {
    console.log("Tone.js started successfully");

    mic = new p5.AudioIn();
    mic.start(
      () => {
        console.log("Mic started successfully");
        fft = new p5.FFT();
        fft.setInput(mic);
        isMicStarted = true;
        loop(); 
      },
      (err) => {
        console.error("Mic failed to start:", err);
        alert("Microphone access was denied or unavailable. Please allow microphone access in your browser.");
      }
    );
  }).catch((err) => {
    console.error("Tone.js failed to start:", err);
  });
}

window.handleUploadedAudio = function(fileURL) {
  if (uploadedSound) {
    uploadedSound.stop();
  }

  uploadedSound = loadSound(fileURL, () => {
    console.log("Uploaded audio loaded");
    fft = new p5.FFT();
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isAppStarted = true;
    isMicStarted = false;
    isFilePlaying = true;
    loop();
  });
};