let fft;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;
let reverb, hp;
let drywetSlider;

function setup() {
  // 全屏画布
  createCanvas(windowWidth, windowHeight)
    .position(0, 0)
    .style('z-index', '-1');

  // FFT && 平滑
  fft = new p5.FFT();
  fft.smooth(0.8);

  // 进度滑块
  progressSlider = createSlider(0, 1, 0, 0.001)
    .position(width * 0.2, height - 30)
    .style('width', width * 0.6 + 'px')
    .style('z-index', '5');
  progressSlider.hide();
  progressSlider.input(() => {
    if (uploadedSound && uploadedSound.isLoaded()) {
      const t = progressSlider.value() * uploadedSound.duration();
      uploadedSound.jump(t);
    }
  });

  // 暂停/播放
  select('#pause-play').mousePressed(() => {
    if (!uploadedSound || !isFilePlaying) return;
    if (!isPaused) {
      uploadedSound.pause();
      isPaused = true;
      select('#pause-play').html('▶️ Play');
      noLoop();
    } else {
      uploadedSound.play();
      isPaused = false;
      select('#pause-play').html('⏸️ Pause');
      loop();
    }
  });

  // 创建 Reverb + HighPass
  reverb = new p5.Reverb();
  hp     = new p5.HighPass();

  // GUI 元素
  const revToggle = select('#reverb-toggle');
  const revTime   = select('#reverb-time');
  const decayRate = select('#decay-rate');
  drywetSlider    = select('#drywet');
  let reverbOn    = false;

  // 一次性 hook
  // 在 handleUploadedAudio 内调用 process()

  // 干湿混合滑块
  drywetSlider.input(() => {
    reverb.drywet(drywetSlider.value());
  });

  // 混响开关：切换湿度
  revToggle.mousePressed(() => {
    reverbOn = !reverbOn;
    if (reverbOn) {
      reverb.drywet(drywetSlider.value());
      revToggle.html('Disable Reverb');
    } else {
      reverb.drywet(0);
      revToggle.html('Enable Reverb');
    }
  });

  // 实时调整参数
  revTime.input(() => reverb.set(revTime.value(), decayRate.value()));
  decayRate.input(() => reverb.set(revTime.value(), decayRate.value()));

  loop();
}

function draw() {
  background(255);
  if (!(uploadedSound && uploadedSound.isLoaded())) return;

  fft.setInput(uploadedSound);
  const spectrum = fft.analyze();
  const waveform = fft.waveform();
  const minF = 20, maxF = 22050, pts = 256;
  const upperH = height * 0.3;
  const lowerY1 = height * 0.75, lowerY2 = height * 0.45;

  // 上半区：频谱折线
  noFill(); stroke(0); strokeWeight(2);
  beginShape();
  for (let j = 0; j < pts; j++) {
    const f   = exp(log(minF) + (j/(pts-1)) * log(maxF/minF));
    const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length-1);
    const amp = spectrum[idx];
    const x   = map(log(f), log(minF), log(maxF), 0, width);
    const y   = map(amp, 0, 255, upperH, 0);
    vertex(x, y);
  }
  endShape();

  // 下半区：波形折线
  noFill(); stroke(100); strokeWeight(1);
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    const x = map(i, 0, waveform.length, 0, width);
    const y = map(waveform[i], -1, 1, lowerY1, lowerY2);
    vertex(x, y);
  }
  endShape();

  // 显示并同步滑块
  progressSlider.show();
  progressSlider.value(uploadedSound.currentTime() / uploadedSound.duration());
}

function handleUploadedAudio(url) {
  if (uploadedSound) {
    uploadedSound.stop();
    reverb.disconnect();  // 断开旧的
  }
  uploadedSound = loadSound(url, () => {
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying = true;
    isPaused      = false;
    select('#pause-play').html('⏸️ Pause');
    progressSlider.show();

    // ONE-TIME process + HP filter
    const t = select('#reverb-time').value();
    const d = select('#decay-rate').value();
    reverb.process(uploadedSound, t, d);
    reverb.drywet(0);             // 初始全干声
    hp.process(reverb);           // 高通滤波
    hp.freq(200);
  });
}