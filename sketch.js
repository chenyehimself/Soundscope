let mic, fft;
let isMicStarted  = false;
let isAppStarted  = false;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;

function setup() {
  // —— 动态画布：90% 窗口宽度，固定 400px 高度 —— 
  const cw = windowWidth * 0.9;
  const ch = 400;
  const cnv = createCanvas(cw, ch);
  // 画布水平居中
  cnv.position((windowWidth - cw) / 2, 0);

  // FFT 初始化
  fft = new p5.FFT();

  // p5 滑块：0–1，步长 0.001
  progressSlider = createSlider(0, 1, 0, 0.001);
  // 滑块与画布同宽，同样水平居中
  progressSlider.position((windowWidth - cw)/2, ch + 20);
  progressSlider.style('width', cw + 'px');
  progressSlider.input(() => {
    if (uploadedSound && uploadedSound.isLoaded()) {
      const t = progressSlider.value() * uploadedSound.duration();
      const wasPlaying = uploadedSound.isPlaying();
      uploadedSound.jump(t);
      if (!wasPlaying) uploadedSound.pause();
    }
  });

  // 暂停/播放按钮
  select('#pause-play').mousePressed(() => {
    if (!uploadedSound || !uploadedSound.isLoaded()) return;
    if (!isPaused) {
      uploadedSound.pause();
      isPaused = true;
      select('#pause-play').html('▶️ Play');
    } else {
      uploadedSound.play();
      isPaused = false;
      select('#pause-play').html('⏸️ Pause');
    }
  });

  noLoop();  // 初始不自动绘制
}

function draw() {
  background(255);

  if (!(isAppStarted && (isMicStarted || isFilePlaying))) {
    return;  // 无信号时不绘制
  }

  // 选择输入
  if (isMicStarted && mic.enabled) {
    fft.setInput(mic);
  } else if (uploadedSound && uploadedSound.isLoaded()) {
    fft.setInput(uploadedSound);
  }

  // —— 对数刻度对称填充频谱 —— 
  const spectrum = fft.analyze();
  const minF     = 20;
  const maxF     = 22050;
  const pts      = 512;
  const midY     = height / 2;

  noStroke();
  fill(0);          // 纯黑填充
  beginShape();
  vertex(0, midY);
  for (let j = 0; j < pts; j++) {
    // 对数频率
    const f   = exp(log(minF) + (j/(pts-1))*log(maxF/minF));
    const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length-1);
    const amp = spectrum[idx];
    // X 坐标 = 对数位置
    const x = map(log(f), log(minF), log(maxF), 0, width);
    // Y 坐标在 midY 上下对称
    const y = midY - map(amp, 0, 255, 0, midY);
    vertex(x, y);
  }
  vertex(width, midY);
  endShape(CLOSE);

  // —— 波形叠加 —— 
  const wave = fft.waveform();
  noFill();
  stroke(0);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    const x = map(i, 0, wave.length, 0, width);
    const y = map(wave[i], -1, 1, 0, height);
    vertex(x, y);
  }
  endShape();

  // —— 同步滑块 —— 
  if (uploadedSound && uploadedSound.isLoaded()) {
    progressSlider.value(uploadedSound.currentTime() / uploadedSound.duration());
  }
}

function startSketch() {
  isAppStarted = true;
  if (!mic) {
    mic = new p5.AudioIn();
    mic.start(
      () => {
        fft.setInput(mic);
        isMicStarted = true;
        loop();
      },
      err => {
        alert('请允许麦克风访问');
      }
    );
  } else {
    isMicStarted = true;
    loop();
  }
}

window.handleUploadedAudio = function(url) {
  isMicStarted = false;
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, () => {
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying = true;
    isPaused      = false;
    select('#pause-play').html('⏸️ Pause');
    loop();
  });
};