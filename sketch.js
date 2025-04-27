let mic, fft;
let isMicStarted  = false;
let isAppStarted  = false;
let uploadedSound;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;

function setup() {
   // 1) 改成动态宽度的画布：占窗口宽度的 90%，高度 400px
   const canvasWidth  = windowWidth * 0.9;
   const canvasHeight = 400;
   const cnv = createCanvas(canvasWidth, canvasHeight);
   // 2) 将画布水平居中
   cnv.position((windowWidth - canvasWidth) / 2, 0);
   noLoop();
 
   // 3) 创建进度滑块，用画布一样的宽度
   progressSlider = createSlider(0, 1, 0, 0.001);
   // 水平方向也居中，宽度 = 画布宽度
   progressSlider.position((windowWidth - canvasWidth) / 2, canvasHeight + 20);
   progressSlider.style('width', canvasWidth + 'px');
 
   // …其余绑定逻辑保持不变…
 }

  // 绑定暂停/播放按钮
  document.getElementById('pause-play').addEventListener('click', function() {
    if (!uploadedSound || !uploadedSound.isLoaded()) return;
    if (!isPaused) {
      uploadedSound.pause(); noLoop(); this.textContent = '▶️ Play'; isPaused = true;
    } else {
      uploadedSound.play(); loop(); this.textContent = '⏸️ Pause'; isPaused = false;
    }
  });
}

function draw() {
  background(255);

  if (isAppStarted && (isMicStarted || isFilePlaying)) {
    // —— 对数刻度频谱面积图 —— 
    const spectrum = fft.analyze();
    const nyquist  = 22050;
    const minF     = 20;
    const maxF     = nyquist;
    const pts      = 512;

    noStroke();
    fill(0);
    beginShape();
    vertex(0, height);
    for (let j = 0; j < pts; j++) {
      const f   = exp(log(minF) + (j/(pts-1))*log(maxF/minF));
      const idx = constrain(floor(map(f, 0, nyquist, 0, spectrum.length)), 0, spectrum.length - 1);
      const amp = spectrum[idx];
      const x   = map(log(f), log(minF), log(maxF), 0, width);
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

    // —— 同步滑块 —— 
    if (uploadedSound && uploadedSound.isLoaded()) {
      const curr = uploadedSound.currentTime();
      const dur  = uploadedSound.duration();
      if (dur > 0) progressSlider.value(curr / dur);
    }
  }
}

function startSketch() {
  isAppStarted = true;
  mic = new p5.AudioIn();
  mic.start(() => {
    fft = new p5.FFT();
    fft.setInput(mic);
    isMicStarted = true;
    loop();
  }, err => {
    console.error('Mic failed to start:', err);
    alert('Please allow microphone access.');
  });
}

window.handleUploadedAudio = function(url) {
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, () => {
    fft = new p5.FFT();
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isAppStarted   = true;
    isMicStarted   = false;
    isFilePlaying  = true;
    isPaused       = false;
    loop();
  });
};