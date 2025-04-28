let mic, fft;
let useMic        = false;    // 是否使用麦克风输入
let uploadedSound = null;     // 加载的音频对象
let isFilePlaying = false;    // 播放状态
let isPaused      = false;    // 暂停状态
let progressSlider;

function setup() {
  // 画布：窗口宽度 80%（上限 800px），高度 400px
  const cw = min(windowWidth * 0.8, 800);
  const ch = 400;
  const cnv = createCanvas(cw, ch);
  cnv.parent(document.body);
  cnv.position((windowWidth - cw) / 2, 20);

  // FFT 初始化并平滑
  fft = new p5.FFT();
  fft.smooth(0.8);

  // 进度滑块：0–1，步长 0.001，宽度同画布，居中
  progressSlider = createSlider(0, 1, 0, 0.001);
  progressSlider.position((windowWidth - cw) / 2, ch + 60);
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

  // 启动 draw 循环
  loop();
}

function draw() {
  background(255);

  // 只有当使用麦克风或已加载音频时才绘制
  if (!useMic && !(uploadedSound && uploadedSound.isLoaded())) {
    return;
  }

  // 绑定输入源
  if (useMic && mic && mic.enabled) {
    fft.setInput(mic);
  } else if (uploadedSound && uploadedSound.isLoaded()) {
    fft.setInput(uploadedSound);
  }

  const spectrum = fft.analyze();
  const waveform = fft.waveform();

  // —— 上半区：对数频谱面积图 —— 
  const minF = 20, maxF = 22050, bins = 256;
  const halfH = height / 2;

  noStroke();
  fill(0);
  beginShape();
  vertex(0, 0);
  for (let j = 0; j < bins; j++) {
    const f   = exp(log(minF) + (j / (bins - 1)) * log(maxF / minF));
    const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length - 1);
    const amp = spectrum[idx];
    const x   = map(log(f), log(minF), log(maxF), 0, width);
    const y   = map(amp, 0, 255, halfH, 0);
    vertex(x, y);
  }
  vertex(width, 0);
  endShape(CLOSE);

  // —— 下半区：波形 —— 
  noFill();
  stroke(0);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    const x = map(i, 0, waveform.length, 0, width);
    const y = map(waveform[i], -1, 1, height, halfH);
    vertex(x, y);
  }
  endShape();

  // —— 同步滑块位置 —— 
  if (uploadedSound && uploadedSound.isLoaded()) {
    progressSlider.value(uploadedSound.currentTime() / uploadedSound.duration());
  }
}

function startMic() {
  useMic = true;
  if (!mic) {
    mic = new p5.AudioIn();
    mic.start(() => {
      fft.setInput(mic);
    }, () => {
      alert('请允许麦克风访问');
    });
  }
}

window.handleUploadedAudio = function(url) {
  useMic = false;
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, () => {
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying = true;
    isPaused      = false;
    select('#pause-play').html('⏸️ Pause');
  });
};