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
    let spectrum = fft.analyze();

    noStroke();
    fill(0);
    for (let i = 1; i < spectrum.length; i++) {
      // 对数频率映射
      let nyquist = 22050;
      let minFreq = 20;
      let maxFreq = nyquist;
      let freq = map(i, 0, spectrum.length, minFreq, nyquist);
      let prevFreq = map(i - 1, 0, spectrum.length, minFreq, nyquist);
      const logF1 = log(freq);
      const logF2 = log(prevFreq);
      const x = map(logF1, log(minFreq), log(maxFreq), 0, width);
      const w = map(logF2, log(minFreq), log(maxFreq), 0, width) - x;
      let h = -height + map(spectrum[i], 0, 255, height, 0);
      rect(x, height, w, h);
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
  if (uploadedSound) {
    uploadedSound.stop();
  }
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

// Pause / Play 按钮逻辑
document
  .getElementById('pause-play')
  .addEventListener('click', function () {
    if (!uploadedSound) return;
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