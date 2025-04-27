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
 
   // 如果还没启动就跳过
   if (!(isAppStarted && (isMicStarted || isFilePlaying))) return;
 
   // 选择输入源
   if (useMic && mic && mic.enabled) {
     fft.setInput(mic);
   } else if (uploadedSound && uploadedSound.isLoaded()) {
     fft.setInput(uploadedSound);
   }
 
   const spectrum = fft.analyze();
   const waveform = fft.waveform();
 
   //—— 上半区：对数频谱面积图 ——//
   const minF = 20;
   const maxF = 22050;
   const bins = 256;
   const halfH = height / 2;
 
   noStroke();
   fill(0);
   beginShape();
   vertex(0, 0);             // 左上角闭合起点
   for (let j = 0; j < bins; j++) {
     const f   = exp(log(minF) + (j/(bins-1)) * log(maxF/minF));
     const idx = constrain(floor(map(f, 0, maxF, 0, spectrum.length)), 0, spectrum.length-1);
     const amp = spectrum[idx];
     const x   = map(log(f), log(minF), log(maxF), 0, width);
     // Y 映射到上半区：amp=0→halfH，amp=255→0
     const y   = map(amp, 0, 255, halfH, 0);
     vertex(x, y);
   }
   vertex(width, 0);         // 右上角闭合
   endShape(CLOSE);
 
   //—— 下半区：波形 ——//
   stroke(0);
   noFill();
   beginShape();
   for (let i = 0; i < waveform.length; i++) {
     const x = map(i, 0, waveform.length, 0, width);
     // 波形映射到下半区：wave=-1→height，wave=+1→halfH
     const y = map(waveform[i], -1, 1, height, halfH);
     vertex(x, y);
   }
   endShape();
 
   //—— 同步滑块 ——//
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