let fft;
let uploadedSound = null;
let isFilePlaying = false;
let isPaused      = false;
let progressSlider;
let reverb, hp, lofiFilter;
let drywetSlider;

function setup() {
  createCanvas(windowWidth, windowHeight)
    .position(0, 0)
    .style('z-index','-1');

  fft = new p5.FFT();
  fft.smooth(0.8);

  // 进度条
  progressSlider = createSlider(0,1,0,0.001)
    .position(width*0.2, height-60)
    .style('width', width*0.6+'px')
    .style('z-index','5');
  progressSlider.hide();
  progressSlider.input(() => {
    if (uploadedSound && uploadedSound.isLoaded()) {
      const t = progressSlider.value() * uploadedSound.duration();
      uploadedSound.jump(t);
    }
  });

  // Pause/Play
  select('#pause-play').mousePressed(() => {
    if (!uploadedSound || !isFilePlaying) return;
    if (!isPaused) {
      uploadedSound.pause(); isPaused=true;
      select('#pause-play').html('▶️ Play'); noLoop();
    } else {
      uploadedSound.play(); isPaused=false;
      select('#pause-play').html('⏸️ Pause'); loop();
    }
  });

  // 效果器
  reverb     = new p5.Reverb();
  hp         = new p5.HighPass();
  lofiFilter = new p5.LowPass();

  // GUI 引用
  const revEnable  = select('#reverb-enable');
  const revTime    = select('#reverb-time');
  const decayRate  = select('#decay-rate');
  drywetSlider     = select('#drywet');

  const lofiEnable = select('#lofi-enable');
  const lofiCutoff = select('#lofi-cutoff');
  const lofiReso   = select('#lofi-reso');

  // 数值显示元素
  const revTimeDisplay   = select('#reverb-time-display');
  const decayRateDisplay = select('#decay-rate-display');
  const drywetDisplay    = select('#drywet-display');
  const lofiCutDisplay   = select('#lofi-cutoff-display');
  const lofiResoDisplay  = select('#lofi-reso-display');

  // 初始化显示
  revTimeDisplay.html(revTime.value() + ' s');
  decayRateDisplay.html(decayRate.value() + ' s');
  drywetDisplay.html(nf(drywetSlider.value(), 1, 2));
  let raw0 = Number(lofiCutoff.value());
  lofiCutDisplay.html((20020 - raw0).toFixed(0) + ' Hz');
  lofiResoDisplay.html(lofiReso.value() + ' Q');

  // Reverb 控制 & 更新
  revEnable.changed(() => {
    reverb.drywet(revEnable.elt.checked ? Number(drywetSlider.value()) : 0);
  });
  revTime.input(() => {
    const v = Number(revTime.value());
    reverb.set(v, Number(decayRate.value()));
    revTimeDisplay.html(v.toFixed(1) + ' s');
  });
  decayRate.input(() => {
    const v = Number(decayRate.value());
    reverb.set(Number(revTime.value()), v);
    decayRateDisplay.html(v.toFixed(1) + ' s');
  });
  drywetSlider.input(() => {
    const v = Number(drywetSlider.value());
    if (revEnable.elt.checked) reverb.drywet(v);
    drywetDisplay.html(v.toFixed(2));
  });

  // Lofi 控制 & 更新
  lofiEnable.changed(() => {
    if (lofiEnable.elt.checked) {
      const raw    = Number(lofiCutoff.value());
      const cutoff = map(raw, 20, 20000, 20000, 20);
      lofiFilter.freq(cutoff);
      lofiFilter.res(Number(lofiReso.value()));
    } else {
      lofiFilter.freq(22050);
      lofiFilter.res(0.001);
    }
  });
  lofiCutoff.input(() => {
    const raw    = Number(lofiCutoff.value());
    const displayVal = (20020 - raw).toFixed(0);
    lofiCutDisplay.html(displayVal + ' Hz');
    if (lofiEnable.elt.checked) {
      const cutoff = map(raw, 20, 20000, 20000, 20);
      lofiFilter.freq(cutoff);
    }
  });
  lofiReso.input(() => {
    const r = Number(lofiReso.value());
    if (lofiEnable.elt.checked) lofiFilter.res(r);
    lofiResoDisplay.html(r.toFixed(1) + ' Q');
  });

  loop();
}

function draw() {
  background(255);
  if (!(uploadedSound && uploadedSound.isLoaded())) return;

  fft.setInput(uploadedSound);
  const spectrum = fft.analyze();
  const waveform = fft.waveform();
  const minF=20, maxF=22050, pts=256;
  const upperH=height*0.3;
  const low1=height*0.75, low2=height*0.45;

  // 画频谱
  noFill(); stroke(0); strokeWeight(2);
  beginShape();
  for (let j=0; j<pts; j++) {
    const f   = exp(log(minF)+(j/(pts-1))*log(maxF/minF));
    let idx    = floor(map(f,0,maxF,0,spectrum.length));
    idx        = constrain(idx,0,spectrum.length-1);
    const amp  = spectrum[idx];
    const x    = map(log(f),log(minF),log(maxF),0,width);
    const y    = map(amp,0,255,upperH,0);
    vertex(x,y);
  }
  endShape();

  // 画波形
  noFill(); stroke(100); strokeWeight(1);
  beginShape();
  for (let i=0; i<waveform.length; i++) {
    const x = map(i,0,waveform.length,0,width);
    const y = map(waveform[i],-1,1,low1,low2);
    vertex(x,y);
  }
  endShape();

  // 更新进度条
  progressSlider.show();
  progressSlider.value(uploadedSound.currentTime()/uploadedSound.duration());
}

function handleUploadedAudio(url) {
  if (uploadedSound) {
    uploadedSound.stop();
    reverb.disconnect();
    lofiFilter.disconnect();
  }
  uploadedSound = loadSound(url, () => {
    uploadedSound.disconnect();

    // Lofi chain
    lofiFilter.process(uploadedSound);
    lofiFilter.freq(22050);
    lofiFilter.res(0.001);

    // Reverb chain
    const rt = Number(select('#reverb-time').value());
    const dr = Number(select('#decay-rate').value());
    reverb.process(lofiFilter, rt, dr);
    reverb.drywet(0);

    hp.process(reverb);
    hp.freq(200);

    fft.setInput(uploadedSound);
    uploadedSound.play();
    isFilePlaying=true; isPaused=false;
    select('#pause-play').html('⏸️ Pause');
    progressSlider.show();
    loop();
  });
}