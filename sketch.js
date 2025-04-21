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
    // Grouped log-spaced bars for better low-frequency resolution
    const spectrum = fft.analyze();
    const nyquist = 22050;
    const minFreq = 20;
    const maxFreq = nyquist;
    const barCount = 64; // number of bars
    noStroke();
    fill(0);

    for (let j = 0; j < barCount; j++) {
      // compute log-spaced frequency range for this bar
      const f1 = exp(log(minFreq) + (j / barCount) * (log(maxFreq / minFreq)));
      const f2 = exp(log(minFreq) + ((j + 1) / barCount) * (log(maxFreq / minFreq)));
      // map frequencies to spectrum indices
      const i1 = constrain(floor(map(f1, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
      const i2 = constrain(floor(map(f2, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
      // average magnitude in this range
      let sum = 0;
      for (let k = i1; k <= i2; k++) {
        sum += spectrum[k];
      }
      const avg = sum / max(1, (i2 - i1 + 1));
      // draw bar
      const x = (j / barCount) * width;
      const w = width / barCount;
      const h = -height + map(avg, 0, 255, height, 0);
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