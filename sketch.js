let mic, fft;
let useMic        = false;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;

function setup() {
  // 1. 画布宽度 = min(800px, 窗口宽度 * 0.8)，高度 = 400px
  const canvasWidth  = min(windowWidth * 0.8, 800);
  const canvasHeight = 400;
  const cnv = createCanvas(canvasWidth, canvasHeight);
  // 2. 挂载到 body 并水平居中
  cnv.parent(document.body);
  cnv.position((windowWidth - canvasWidth) / 2, 0);

  // FFT 初始化
  fft = new p5.FFT();

  // 3. 创建与画布等宽的滑块，并水平居中
  progressSlider = createSlider(0, 1, 0, 0.001);
  progressSlider.position((windowWidth - canvasWidth) / 2, canvasHeight + 20);
  progressSlider.style('width', canvasWidth + 'px');
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

  noLoop();  // 初始不自动绘制
}

function draw() {
  background(255);

  // 没有启动或没有音源时不绘制
  if (!(useMic || (uploadedSound && uploadedSound.isLoaded()))) {
    return;
  }

  // 切换 FFT 输入
  if (useMic && mic && mic.enabled) {
    fft.setInput(mic);
  } else {
    fft.setInput(uploadedSound);
  }

  // —— 对数频谱面积图 —— 
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
    const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length - 1);
    const amp = spectrum[idx];
    const x   = map(log(f), log(minF), log(maxF), 0, width);
    const y   = midY - map(amp, 0, 255, 0, midY);
    vertex(x, y);
  }
  vertex(width, midY);
  endShape(CLOSE);

  // —— 波形叠加 —— 
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

  // —— 同步滑块 —— 
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
      loop();
    }, () => {
      alert('请允许麦克风访问');
    });
  } else {
    loop();
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
    loop();
  });
};