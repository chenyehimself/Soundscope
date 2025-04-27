let mic, fft;
let isMicStarted = false;
let isAppStarted = false;
let uploadedSound;
let isFilePlaying = false;
let isPaused = false;

function setup() {
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop();
}

function draw() {
  background(255);

  if (isAppStarted && (isMicStarted || isFilePlaying)) {
       // Continuous log-spaced frequency curve using vertex
       const spectrum = fft.analyze();
       const nyquist  = 22050;
       const minFreq  = 20;
       const maxFreq  = nyquist;
       const points   = 512;  // 调整点数以控制平滑度
   
       noFill();
       stroke(0,127);
       beginShape();
       for (let j = 0; j < points; j++) {
         // 将 j 映射到对数频率 f
         const f = exp(log(minFreq) + (j / (points - 1)) * log(maxFreq / minFreq));
         // 找到对应的 FFT bin
         const idx = constrain(floor(map(f, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
         const amp = spectrum[idx];
         // 计算绘制坐标
         const x = map(log(f), log(minFreq), log(maxFreq), 0, width);
         const y = map(amp, 0, 255, height, 0);
         vertex(x, y);
       }
       endShape();

    // Waveform overlay
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

    // Update progress‑bar value
    if (uploadedSound && uploadedSound.isLoaded()) {
      const prog = document.getElementById('progress');
      const curr = uploadedSound.currentTime();
      const dur = uploadedSound.duration();
      if (dur > 0) {
        prog.value = (curr / dur) * prog.max;
      }
    }
  }
}

function startSketch() {
  isAppStarted = true;
  mic = new p5.AudioIn();
  mic.start(
    () => {
      fft = new p5.FFT();
      fft.setInput(mic);
      isMicStarted = true;
      loop();
    },
    (err) => {
      console.error('Mic failed to start:', err);
      alert('Please allow microphone access.');
    }
  );
}

window.handleUploadedAudio = function (fileURL) {
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(fileURL, () => {
    fft = new p5.FFT();
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isAppStarted = true;
    isMicStarted = false;
    isFilePlaying = true;
    isPaused = false;
    loop();
  });
};

// Pause/Play toggle
document.getElementById('pause-play').addEventListener('click', function () {
  if (!uploadedSound || !uploadedSound.isLoaded()) return;
  if (!isPaused) {
    uploadedSound.pause();
    noLoop();
    this.textContent = '▶️ Play';
    isPaused = true;
  } else {
    uploadedSound.play();
    loop();
    this.textContent = '⏸️ Pause';
    isPaused = false;
  }
});