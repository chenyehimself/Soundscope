let mic, fft;
let isMicStarted = false;
let isAppStarted = false;
let uploadedSound;
let isFilePlaying = false;
let isPaused = false;

// Reference to progress bar
const progressBar = document.getElementById('progress');

function setup() {
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop();
}

function draw() {
   background(255);
 
   if (isAppStarted && (isMicStarted || isFilePlaying)) {
     const spectrum = fft.analyze();
     const nyquist = 22050;
     const minFreq = 20;
     const maxFreq = nyquist;
     const barCount = 64; // 分成 64 个柱
 
     noStroke();
     fill(0);
 
     // 分组 log‑spaced 频谱柱
     for (let j = 0; j < barCount; j++) {
       // 计算该柱对应的频率区间 [f1, f2]
       const f1 = exp(log(minFreq) + (j / barCount) * log(maxFreq / minFreq));
       const f2 = exp(log(minFreq) + ((j + 1) / barCount) * log(maxFreq / minFreq));
 
       // 映射到 FFT 数组下标
       const i1 = constrain(floor(map(f1, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
       const i2 = constrain(floor(map(f2, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
 
       // 取区间平均能量
       let sum = 0;
       for (let k = i1; k <= i2; k++) sum += spectrum[k];
       const avg = sum / max(1, i2 - i1 + 1);
 
       // 画柱条
       const x = (j / barCount) * width;
       const w = width / barCount;
       const h = -height + map(avg, 0, 255, height, 0);
       rect(x, height, w, h);
     }
 
     // 波形部分保持不变
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

     // Update progress bar position
     if (uploadedSound && uploadedSound.isLoaded()) {
       const curr = uploadedSound.currentTime();
       const dur = uploadedSound.duration();
       if (dur > 0) {
         progressBar.value = (curr / dur) * progressBar.max;
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

// Seek functionality on progress bar drag
progressBar.addEventListener('input', function () {
  if (!uploadedSound || !uploadedSound.isLoaded()) return;
  const dur = uploadedSound.duration();
  const newTime = (this.value / this.max) * dur;
  const wasPlaying = uploadedSound.isPlaying();
  uploadedSound.jump(newTime);
  if (!wasPlaying) {
    uploadedSound.pause();
  }
});