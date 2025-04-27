let mic, fft;
let isMicStarted = false;
let isAppStarted = false;
let uploadedSound;
let isFilePlaying = false;
let isPaused = false;

function setup() {
  // 创建 800×400 画布并挂载到 body
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop();  // 初始不自动循环
}

function draw() {
  background(255);

  if (isAppStarted && (isMicStarted || isFilePlaying)) {
    // —— 对数刻度频谱面积图 —— 
    const spectrum = fft.analyze();
    const nyquist  = 22050;
    const minFreq  = 20;
    const maxFreq  = nyquist;
    const points   = 512;  // 采样点数，越高越平滑

    // 填充下方区域，黑色 50% 透明度
    fill(0, 127);
    noStroke();
    beginShape();
    // 从左下角开始
    vertex(0, height);
    for (let j = 0; j < points; j++) {
      // 计算对数频率 f
      const f = exp(log(minFreq) + (j / (points - 1)) * log(maxFreq / minFreq));
      // 对应 FFT bin
      const idx = constrain(floor(map(f, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
      const amp = spectrum[idx];
      // 计算坐标
      const x = map(log(f), log(minFreq), log(maxFreq), 0, width);
      const y = map(amp, 0, 255, height, 0);
      vertex(x, y);
    }
    // 到右下角闭合
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

    // —— 更新进度条值（如果你还在用 HTML range） —— 
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
    err => {
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
    isAppStarted  = true;
    isMicStarted  = false;
    isFilePlaying = true;
    isPaused      = false;
    loop();
  });
};

// 暂停/播放按钮逻辑
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