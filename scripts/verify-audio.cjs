// Usage: node scripts/verify-audio.cjs [path-to-playwright] [preview-origin]
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const origin = process.argv[3] || 'http://127.0.0.1:5174';
const output = 'artifacts/audio';
const assert = (condition, message) => { if (!condition) throw Error(message); };

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const errors = [];
    await page.addInitScript(() => {
      const NativeContext = window.AudioContext;
      window.__audioGains = [];
      window.__audioSources = new Set();
      window.AudioContext = class extends NativeContext {
        constructor(...args) { super(...args); window.__audioContext = this; }
        createGain() { const gain = super.createGain(); window.__audioGains.push(gain); return gain; }
        createOscillator() {
          const osc = super.createOscillator(); window.__audioSources.add(osc);
          osc.addEventListener('ended', () => window.__audioSources.delete(osc)); return osc;
        }
      };
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/soundtrack-preview.html`);
    await page.waitForSelector('body[data-ready=true]', { timeout: 60000 });
    await page.locator('#listen').click();
    await page.locator('[data-audio-toggle]').click();
    const layout = await page.locator('#aden-audio-mixer').evaluate(element => {
      const r = element.getBoundingClientRect();
      return { position: getComputedStyle(element).position, left: r.left, right: r.right, bottom: r.bottom, viewport: innerWidth };
    });
    await page.screenshot({ path: `${output}/mixer-desktop.png` });
    console.log(JSON.stringify({ layout, errors }));
    assert(layout.right <= layout.viewport && layout.left >= 0, 'Mixer clips outside viewport');
    await page.waitForTimeout(2500);
    const measure = async () => page.evaluate(async () => {
      const ctx = window.__audioContext, analyser = ctx.createAnalyser(); analyser.fftSize = 8192;
      window.__audioGains[0].connect(analyser);
      await new Promise(resolve => setTimeout(resolve, 220));
      const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values);
      window.__audioGains[0].disconnect(analyser); analyser.disconnect();
      return { rms: Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length), state: ctx.state, sources: window.__audioSources.size };
    });
    const playing = await measure(); assert(playing.rms > .001, 'Live map music is silent');
    await page.locator('[data-audio-mute]').click();
    await page.waitForTimeout(450);
    const muted = await measure(); assert(muted.rms < .00001, 'Master mute still produces audio');
    await page.locator('[data-audio-mute]').click();
    await page.getByRole('slider', { name: 'Volumen de música', exact: true }).fill('35');
    await page.reload(); await page.waitForSelector('body[data-ready=true]');
    await page.locator('[data-audio-toggle]').click();
    assert(await page.getByRole('slider', { name: 'Volumen de música', exact: true }).inputValue() === '35', 'Volume was not restored');
    await page.getByRole('slider', { name: 'Volumen de música', exact: true }).fill('70');
    const maps = await page.locator('[data-map]').evaluateAll(elements => elements.map(e => e.dataset.map));
    for (const map of [...maps, ...maps]) await page.locator(`[data-map="${map}"]`).click();
    await page.waitForTimeout(4600);
    const travelled = await measure();
    assert(travelled.rms > .001 && travelled.sources < 110, 'Map changes are silent or retain too many voices');
    // Reproduce the game HUD alongside the longest map heading and guidance.
    await page.evaluate(async () => {
      const { AdventureTracker } = await import('/src/render/AdventureTracker.ts');
      new AdventureTracker().update({ mapId: 'cripta', questId: 'q_crypt', questProgress: 0, dungeonStage: 0 });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-audio-toggle]').click();
    const mobile = await page.locator('#aden-audio-mixer').boundingBox();
    assert(mobile && mobile.x >= 0 && mobile.x + mobile.width <= 390, 'Mobile mixer clips');
    await page.screenshot({ path: `${output}/mixer-mobile.png` });
    const tracker = await page.locator('[data-adventure-tracker]').boundingBox();
    assert(tracker.y + tracker.height <= 844, 'Adventure tracker extends below the viewport');
    await page.setViewportSize({ width: 900, height: 540 });
    const compact = await page.locator('#aden-audio-mixer').boundingBox();
    assert(compact && compact.y >= 0 && compact.y + compact.height <= 540, 'Short viewport mixer clips');
    await page.screenshot({ path: `${output}/mixer-compact.png` });
    await page.setViewportSize({ width: 1440, height: 960 });

    const renders = [];
    for (const map of maps) {
      const rendered = await page.evaluate(async id => {
        const { Soundscape } = await import('/src/audio/Soundscape.ts');
        const { getSoundtrack, buildScore } = await import('/src/audio/score.ts');
        const profile = getSoundtrack(id), rate = 22050;
        const loopSeconds = buildScore(profile).beats * 60 / profile.bpm;
        const seconds = loopSeconds + 10;
        const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
        const music = ctx.createGain(), ambient = ctx.createGain();
        music.gain.value = .3 * .7; ambient.gain.value = .3 * .45;
        music.connect(ctx.destination); ambient.connect(ctx.destination);
        const scene = new Soundscape(ctx, profile, music, ambient); scene.start(0, 2);
        for (let t = 0; t < seconds; t += .15) scene.schedule(t);
        const audio = await ctx.startRendering();
        const channels = [audio.getChannelData(0), audio.getChannelData(1)];
        let peak = 0, power = 0, invalid = 0, minSecondRms = Infinity, maxStep = 0;
        for (let c = 0; c < 2; c++) {
          const data = channels[c]; let secondPower = 0;
          for (let i = 0; i < data.length; i++) {
            const sample = data[i]; if (!Number.isFinite(sample)) invalid++;
            peak = Math.max(peak, Math.abs(sample)); power += sample * sample; secondPower += sample * sample;
            if (i) maxStep = Math.max(maxStep, Math.abs(sample - data[i - 1]));
            if ((i + 1) % rate === 0) {
              if (i > rate * 3) minSecondRms = Math.min(minSecondRms, Math.sqrt(secondPower / rate));
              secondPower = 0;
            }
          }
        }
        let seamPower = 0;
        for (let i = Math.floor((loopSeconds - .2) * rate); i < (loopSeconds + .2) * rate; i++) seamPower += channels[0][i] ** 2;
        // PCM WAV for local listening; the last half-second fades only in this exported sample.
        const frames = audio.length, bytes = new ArrayBuffer(44 + frames * 4), view = new DataView(bytes);
        const write = (offset, text) => [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
        write(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); write(8, 'WAVE'); write(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
        view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
        write(36, 'data'); view.setUint32(40, frames * 4, true);
        for (let i = 0; i < frames; i++) for (let c = 0; c < 2; c++) {
          const fade = Math.min(1, (frames - i - 1) / (rate * .5));
          view.setInt16(44 + i * 4 + c * 2, Math.max(-32768, Math.min(32767, Math.round(channels[c][i] * fade * 32767))), true);
        }
        let binary = ''; const array = new Uint8Array(bytes);
        for (let i = 0; i < array.length; i += 16384) binary += String.fromCharCode(...array.subarray(i, i + 16384));
        scene.dispose();
        return { id, title: profile.title, loopSeconds, seconds, peak, rms: Math.sqrt(power / (frames * 2)), minSecondRms,
          seamRms: Math.sqrt(seamPower / (.4 * rate)), maxStep, invalid, wav: btoa(binary) };
      }, map);
      const { wav, ...metrics } = rendered;
      fs.writeFileSync(`${output}/${map}.wav`, Buffer.from(wav, 'base64'));
      assert(metrics.invalid === 0 && metrics.peak < .95 && metrics.rms > .003 && metrics.minSecondRms > .0001 && metrics.seamRms > .001, `Bad render: ${JSON.stringify(metrics)}`);
      renders.push(metrics); console.log(JSON.stringify(metrics));
    }
    const report = { errors, playing, muted, travelled, layout, mobile, compact, renders };
    fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
    assert(errors.length === 0, errors.join('\n'));
    console.log(JSON.stringify({ success: true, tracks: renders.length, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
