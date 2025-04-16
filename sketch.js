let mic, fft;
let isMicStarted = false;

function setup() {
  createCanvas(800, 400);
  textAlign(CENTER);
  textSize(20);
  text("Click to start microphone", width / 2, height / 2);
}

function draw() {
  background(0);
  if (isMicStarted) {
    let spectrum = fft.analyze();
    noStroke();
    fill(0, 255, 0);

    for (let i = 0; i < spectrum.length; i++) {
      let x = map(i, 0, spectrum.length, 0, width);
      let h = -height + map(spectrum[i], 0, 255, height, 0);
      rect(x, height, width / spectrum.length, h);
    }

    let waveform = fft.waveform();
    noFill();
    stroke(255);
    beginShape();
    for (let i = 0; i < waveform.length; i++) {
      let x = map(i, 0, waveform.length, 0, width);
      let y = map(waveform[i], -1, 1, 0, height);
      vertex(x, y);
    }
    endShape();
  }
}

function mousePressed() {
  if (!isMicStarted) {
    mic = new p5.AudioIn();
    mic.start(() => {
      fft = new p5.FFT();
      fft.setInput(mic);
      isMicStarted = true;
    });
  }
}