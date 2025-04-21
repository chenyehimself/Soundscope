let mic, fft;
let isMicStarted = false;
let isAppStarted = false;
let uploadedSound;
let isFilePlaying = false;
let isPaused = false;

function setup() {
  let cnv = createCanvas(800, 400);
  cnv.parent(document.body);
  noLoop();
}

function draw() {
   background(255);
 
   if (isAppStarted && (isMicStarted || isFilePlaying)) {
     let spectrum = fft.analyze();
     
     // 对数索引映射循环：使低频区域条更窄、分辨率更高，并应用开根号平滑
     const N = spectrum.length;
     noStroke();
     fill(0);
     for (let i = 0; i < N; i++) {
       // 原始对数归一化索引
       let normLog1 = log(i + 1) / log(N);
       let normLog2 = log(i + 2) / log(N);
       // 使用指数映射以增强低频分辨率
       const exponent = 0.3;  // 调整此值 <1以获得更细的低频分辨率
       const skew1 = pow(normLog1, exponent);
       const skew2 = pow(normLog2, exponent);
       // 映射到画布宽度
       const x1 = map(skew1, 0, 1, 0, width);
       const x2 = map(skew2, 0, 1, 0, width);
       const w = x2 - x1;
       // 高度按能量映射
       const h = -height + map(spectrum[i], 0, 255, height, 0);
       rect(x1, height, w, h);
     }
 
     // 波形部分保持不变
     let waveform = fft.waveform();
     noFill();
     stroke(0);
     beginShape();
     for (let i = 0; i < waveform.length; i++) {
       let x = map(i, 0, waveform.length, 0, width);
       let y = map(waveform[i], -1, 1, 0, height);
       vertex(x, y);
     }
     endShape();
   }
 }

function startSketch() {
  isAppStarted = true;
  mic = new p5.AudioIn();
  mic.start(
    () => {
      fft = new p5.FFT();
      fft.smooth(0.8);
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
  if (uploadedSound) {
    uploadedSound.stop();
  }
  uploadedSound = loadSound(fileURL, () => {
    fft = new p5.FFT();
    fft.smooth(0.8);
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isAppStarted = true;
    isMicStarted = false;
    isFilePlaying = true;
    isPaused = false;
    loop();
  });
};

// Pause / Play 按钮逻辑
document
  .getElementById('pause-play')
  .addEventListener('click', function () {
    if (!uploadedSound) return;
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