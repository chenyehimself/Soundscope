let mic, fft;
let isMicStarted    = false;
let isAppStarted    = false;
let uploadedSound;
let isFilePlaying   = false;
let isPaused        = false;
let progressSlider;  // p5.js Slider

function setup() {
  // 创建 800×400 画布
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop();

  // 在画布下方中央创建滑块（范围 0–1，步长 0.001）
  progressSlider = createSlider(0, 1, 0, 0.001);
  progressSlider.position(width * 0.2, height + 20);
  progressSlider.style('width', width * 0.6 + 'px');

  // 拖动时跳转播放进度
  progressSlider.input(() => {
    if (uploadedSound && uploadedSound.isLoaded()) {
      const dur     = uploadedSound.duration();
      const newTime = progressSlider.value() * dur;
      const wasPlaying = uploadedSound.isPlaying();
      uploadedSound.jump(newTime);
      if (!wasPlaying) uploadedSound.pause();
    }
  });

  // 暂停/播放按钮逻辑
  document.getElementById('pause-play').addEventListener('click', function() {
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
}

function draw() {
  background(255);

  if (isAppStarted && (isMicStarted || isFilePlaying)) {
    // —— 对数刻度频谱面积图 —— 
    const spectrum = fft.analyze();
    const nyquist  = 22050;
    const minFreq  = 20;
    const maxFreq  = nyquist;
    const points   = 512;  // 采样点数

    // 纯黑实心填充曲线下方区域
    noStroke();
    fill(0);
    beginShape();
    vertex(0, height);
    for (let j = 0; j < points; j++) {
      const f   = exp(log(minFreq) + (j/(points-1))*log(maxFreq/minFreq));
      const idx = constrain(floor(map(f, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
      const amp = spectrum[idx];
      const x   = map(log(f), log(minFreq), log(maxFreq), 0, width);
      const y   = map(amp, 0, 255, height, 0);
      vertex(x, y);
    }
    vertex(width, height);
    endShape(CLOSE);

    // —— 波形叠加 —— 
    let waveform = fft.waveform();
    noFill();
    stroke(0);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      const x = map(i, 0, waveform.length, 0, width);
      const y = map(waveform[i], -1, 1, 0, height);
      vertex(x, y);
    }
    endShape();

    // —— 同步滑块到当前播放进度 —— 
    if (uploadedSound && uploadedSound.isLoaded()) {
      const curr = uploadedSound.currentTime();
      const dur  = uploadedSound.duration();
      if (dur > 0) {
        progressSlider.value(curr / dur);
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
    err => {
      console.error('Mic failed to start:', err);
      alert('Please allow microphone access.');
    }
  );
}

window.handleUploadedAudio = function(url) {
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, () => {
    fft = new p5.FFT();
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isAppStarted    = true;
    isMicStarted    = false;
    isFilePlaying   = true;
    isPaused        = false;
    loop();
  });
};