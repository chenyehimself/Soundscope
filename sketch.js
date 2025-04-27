let mic, fft;
let useMic        = false;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;

function setup() {
  // 画布：窗口宽度80%，不超过800，高度400
  const cw = min(windowWidth * 0.8, 800);
  const ch = 400;
  const cnv = createCanvas(cw, ch);
  cnv.parent(document.body);
  cnv.position((windowWidth - cw)/2, 0);

  // FFT 初始化并开启平滑
  fft = new p5.FFT();
  fft.smooth(0.8);

  // 滑块
  progressSlider = createSlider(0,1,0,0.001);
  progressSlider.position((windowWidth - cw)/2, ch + 20);
  progressSlider.style('width', cw+'px');
  progressSlider.input(()=>{
    if (uploadedSound && uploadedSound.isLoaded()) {
      const t = progressSlider.value() * uploadedSound.duration();
      const wp = uploadedSound.isPlaying();
      uploadedSound.jump(t);
      if (!wp) uploadedSound.pause();
    }
  });

  // 暂停/播放按钮
  select('#pause-play').mousePressed(()=>{
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

  // 选数据源
  if (useMic && mic && mic.enabled) {
    fft.setInput(mic);
  } else if (uploadedSound && uploadedSound.isLoaded()) {
    fft.setInput(uploadedSound);
  } else {
    // 没有音源就不画
    return;
  }

  // —— 对数频谱面积图 —— 
  const spectrum = fft.analyze();
  const minF     = 20, maxF = 22050, pts = 512;
  const midY     = height / 2;

  noStroke();
  fill(0);
  beginShape();
  vertex(0, midY);
  for (let j = 0; j < pts; j++) {
    const f   = exp(log(minF) + j/(pts-1)*log(maxF/minF));
    const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length-1);
    const amp = spectrum[idx];
    const x   = map(log(f), log(minF), log(maxF), 0, width);
    const y   = midY - map(amp, 0, 255, 0, midY);
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

function startMic() {
  useMic = true;
  if (!mic) {
    mic = new p5.AudioIn();
    mic.start(()=>{
      fft.setInput(mic);
    }, ()=>alert('请允许麦克风访问'));
  }
}

window.handleUploadedAudio = function(url) {
  useMic = false;
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, ()=>{
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying = true;
    isPaused      = false;
    select('#pause-play').html('⏸️ Pause');
  });
};