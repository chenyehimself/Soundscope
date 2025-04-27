let mic, fft;
let useMic        = false;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;

function setup() {
  createCanvas(windowWidth, windowHeight).position(0,0).style('z-index','-1');
  fft = new p5.FFT();

  // 滑块：0–1，步长0.001
  progressSlider = createSlider(0,1,0,0.001)
    .position(width*0.2, height-30)
    .style('width', width*0.6+'px');
  // 拖拽时跳转
  progressSlider.input(()=>{
    if (uploadedSound && uploadedSound.isLoaded()) {
      let t = progressSlider.value() * uploadedSound.duration();
      uploadedSound.jump(t);
      if (isPaused) uploadedSound.pause();
    }
  });

  // 暂停/播放
  select('#pause-play').mousePressed(()=>{
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

  // 选择信号源
  if (useMic && mic && mic.enabled) {
    fft.setInput(mic);
  } else if (uploadedSound && uploadedSound.isLoaded()) {
    fft.setInput(uploadedSound);
  } else {
    return; // 无输入，跳过绘制
  }

  // —— 频谱面积图 —— 
  let spectrum = fft.analyze();
  let minF = 20, maxF = 22050, pts = 256;
  noStroke(); fill(0);
  beginShape();
  vertex(0, height);
  for (let j=0; j<pts; j++){
    let f = exp(log(minF) + j/(pts-1)*log(maxF/minF));
    let idx = floor(map(f,0,maxF,0,spectrum.length));
    idx = constrain(idx,0,spectrum.length-1);
    let amp = spectrum[idx];
    let x = map(log(f),log(minF),log(maxF),0,width);
    let y = map(amp,0,255,height,0);
    vertex(x,y);
  }
  vertex(width, height);
  endShape(CLOSE);

  // —— 波形叠加 —— 
  let wave = fft.waveform();
  noFill(); stroke(0);
  beginShape();
  for (let i=0; i<wave.length; i++){
    let x = map(i,0,wave.length,0,width);
    let y = map(wave[i],-1,1,0,height);
    vertex(x,y);
  }
  endShape();

  // —— 同步滑块 —— 
  if (uploadedSound && uploadedSound.isLoaded()) {
    progressSlider.value(uploadedSound.currentTime()/uploadedSound.duration());
  }
}

function startMic(){
  if (!mic) {
    mic = new p5.AudioIn();
    mic.start(()=>{
      fft.setInput(mic);
      useMic = true;
    }, err=>{
      alert('请允许麦克风访问');
    });
  } else {
    useMic = true;
  }
}

function handleUploadedAudio(url){
  // 停掉 Mic
  useMic = false;
  if (uploadedSound) uploadedSound.stop();
  uploadedSound = loadSound(url, ()=>{
    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying = true;
    isPaused      = false;
    select('#pause-play').html('⏸️ Pause');
  });
}