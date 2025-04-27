let mic, fft;
let isMicStarted  = false;
let isAppStarted  = false;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;

function setup() {
  // 1. 画布占窗口宽度的 90%，固定高度 400px
  const cw = windowWidth * 0.9;
  const ch = 400;
  const cnv = createCanvas(cw, ch);
  // 2. 挂载并水平居中
  cnv.parent(document.body);
  cnv.position((windowWidth - cw) / 2, 0);
  noLoop();

  // FFT 初始化
  fft = new p5.FFT();

  // 3. 创建滑块：水平居中，宽度同画布
  progressSlider = createSlider(0, 1, 0, 0.001);
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

  // 4. 暂停/播放按钮绑定
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
}

function draw() {
  background(255);

  if (!(isAppStarted && (isMicStarted || isFilePlaying))) return;

  // 切换输入源
  if (isMicStarted && mic && mic.enabled) {
    fft.setInput(mic);
  } else if (uploadedSound && uploadedSound.isLoaded()) {
    fft.setInput(uploadedSound);
  }

  // 对数频谱对称面积填充
  const spectrum = fft.analyze();
  const minF     = 20;
  const maxF     = 22050;
  const pts      = 512;
  const midY     = height / 2;

  noStroke();
  fill(0);
  beginShape();
  vertex(0, midY);
  for (let j = 0; j < pts; j++) {
    const f   = exp(log(minF) + (j/(pts-1))*log(maxF/minF));
    const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length-1);
    const amp = spectrum[idx];
    const x   = map(log(f), log(minF), log(maxF), 0, width);
    const y   = midY - map(amp, 0, 255, 0, midY);
    vertex(x, y);
  }
  vertex(width, midY);
  endShape(CLOSE);

  // 波形叠加
  let wave = fft.waveform();
  noFill();
  stroke(0);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    const x = map(i, 0, wave.length, 0, width);
    const y = map(wave[i], -1, 1, 0, height);
    vertex(x, y);
  }
  endShape();

  // 同步滑块位置
  if (uploadedSound && uploadedSound.isLoaded()) {
    progressSlider.value(uploadedSound.currentTime() / uploadedSound.duration());
  }
}

function startSketch() {
  isAppStarted = true;
  if (!mic) {
    mic = new p5.AudioIn();
    mic.start(() => {
      fft.setInput(mic);
      isMicStarted = true;
      loop();
    }, () => {
      alert('请允许麦克风访问');
    });
  } else {
    isMicStarted = true;
    loop();
  }
}

window.handleUploadedAudio = function(url) {
  // 切换到音频输入
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