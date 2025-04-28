let fft;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused = false;
let progressSlider;

function setup() {
  createCanvas(windowWidth, windowHeight).position(0, 0).style('z-index', '-1');
  fft = new p5.FFT();

  // 滑块：0–1，步长0.001
  progressSlider = createSlider(0, 1, 0, 0.001)
    .position(width * 0.2, height - 30)
    .style('width', width * 0.6 + 'px')
    .style('z-index', '5'); // 滑块在画布上面
  progressSlider.hide(); // 一开始隐藏滑块

  // 暂停/播放
  select('#pause-play').mousePressed(() => {
    if (!uploadedSound) return;
    if (!isFilePlaying) return;
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

  if (uploadedSound && uploadedSound.isLoaded()) {
    fft.setInput(uploadedSound);
  } else {
    return; // 无输入，跳过绘制
  }

  let spectrum = fft.analyze();
  let wave = fft.waveform();
  let minF = 20, maxF = 22050, pts = 256;

  // —— 频谱 —— 
  noFill();
  stroke(0);
  strokeWeight(2);
  beginShape();
  for (let j = 0; j < pts; j++) {
    let f = exp(log(minF) + j / (pts - 1) * log(maxF / minF));
    let idx = floor(map(f, 0, maxF, 0, spectrum.length));
    idx = constrain(idx, 0, spectrum.length - 1);
    let amp = spectrum[idx];
    let x = map(log(f), log(minF), log(maxF), 0, width);
    let y = map(amp, 0, 255, height * 0.3, height * 0.05);
    vertex(x, y);
  }
  endShape();

  // —— 波形 —— 
  noFill();
  stroke(100);
  strokeWeight(1);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    let x = map(i, 0, wave.length, 0, width);
    let y = map(wave[i], -1, 1, height * 0.75, height * 0.45);
    vertex(x, y);
  }
  endShape();

  // —— 同步滑块 —— 
  progressSlider.show();
  progressSlider.value(uploadedSound.currentTime() / uploadedSound.duration());
}

function handleUploadedAudio(url) {
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, () => {
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying = true;
    isPaused = false;
    select('#pause-play').html('⏸️ Pause');
  });
}