let mic, fft;
let isMicStarted = false;
let isAppStarted = false;
let uploadedSound;
let isFilePlaying = false;
let isPaused = false;

function setup() {
  // 创建画布并挂载到 body
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop();  // 等待 startApp() 调用 loop()
}

function draw() {
  background(255);

  if (isAppStarted && (isMicStarted || isFilePlaying)) {
    // 1. 对数刻度平滑频谱曲线
    const spectrum = fft.analyze();
    const nyquist  = 22050;
    const minFreq  = 20;
    const maxFreq  = nyquist;
    const points   = 512;  // 采样点数，越高越平滑

    noFill();
    stroke(0, 127);  // 半透明黑色曲线
    beginShape();
    for (let j = 0; j < points; j++) {
      // 计算对数频率 f
      const f = exp(log(minFreq) + (j / (points - 1)) * log(maxFreq / minFreq));
      // 对应的 FFT bin 下标
      const idx = constrain(floor(map(f, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
      const amp = spectrum[idx];
      // X = 对数位置，Y = 振幅映射
      const x = map(log(f), log(minFreq), log(maxFreq), 0, width);
      const y = map(amp, 0, 255, height, 0);
      vertex(x, y);
    }
    endShape();

    // 2. 波形叠加
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

    // 3. 更新进度条值
    if (uploadedSound && uploadedSound.isLoaded()) {
      const prog = document.getElementById('progress');
      const curr = uploadedSound.currentTime();
      const dur  = uploadedSound.duration();
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
  // 停止之前的音频
  if (uploadedSound) uploadedSound.stop();
  // 加载并播放上传的音频
  uploadedSound = loadSound(fileURL, () => {
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

// 暂停/播放切换按钮逻辑
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