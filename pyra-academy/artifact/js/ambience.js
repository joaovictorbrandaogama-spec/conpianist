// Trilha ambiente sintetizada (nenhum arquivo de áudio): um acorde suave por cenário,
// notas esparsas de sino e, na arena, um pulso que acelera com a prova.
import { sfx } from './util.js';
import { on } from './world/index.js';

// tom fundamental (Hz), acorde e escala em semitons, brilho do filtro
const MOODS = {
  gate: { root: 146.83, chord: [0, 7, 14, 17], scale: [0, 3, 5, 7, 10, 12, 15], cutoff: 850, bells: 1 },
  hall: { root: 130.81, chord: [0, 7, 12, 14], scale: [0, 2, 7, 9, 12, 14], cutoff: 1050, bells: 0.8 },
  classroom: { root: 174.61, chord: [0, 4, 7, 11], scale: [0, 2, 4, 7, 9, 12, 14], cutoff: 1250, bells: 0.7 },
  lab: { root: 110, chord: [0, 7, 12, 19], scale: [0, 5, 7, 12, 14, 19], cutoff: 700, bells: 0.5, hum: true },
  arena: { root: 98, chord: [0, 7, 12, 15], scale: [0, 3, 7, 10, 12], cutoff: 780, bells: 0.4, pulse: true },
  black: { root: 110, chord: [0, 7], scale: [0, 7, 12], cutoff: 480, bells: 0.3 },
};
const LEVEL = 0.055;

let context = null;
let master = null;
let echo = null;
let current = null;     // { name, gain, nodes, mood }
let wanted = 'gate';
let started = false;
let bellTimer = 0;
let pulseTimer = 0;
let tension = 0;

const hz = (root, semitones) => root * Math.pow(2, semitones / 12);

function ensure() {
  if (context) return true;
  try { context = sfx.context(); } catch { return false; }
  if (!context) return false;
  master = context.createGain();
  master.gain.value = sfx.enabled ? 1 : 0;
  master.connect(context.destination);
  // eco simples para dar espaço às notas
  echo = context.createDelay(1);
  echo.delayTime.value = 0.36;
  const feedback = context.createGain();
  feedback.gain.value = 0.34;
  const damp = context.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1800;
  echo.connect(damp).connect(feedback).connect(echo);
  damp.connect(master);
  return true;
}

function buildPad(name) {
  const mood = MOODS[name] || MOODS.black;
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(LEVEL, now + 2.8);
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = mood.cutoff;
  filter.Q.value = 0.6;
  filter.connect(gain).connect(master);
  const nodes = [];
  // o filtro respira devagar
  const lfo = context.createOscillator();
  const depth = context.createGain();
  lfo.frequency.value = 0.07;
  depth.gain.value = mood.cutoff * 0.28;
  lfo.connect(depth).connect(filter.frequency);
  lfo.start();
  nodes.push(lfo);
  mood.chord.forEach((semitones, index) => {
    for (const [type, cents, level] of [['sawtooth', -5, 0.16], ['triangle', 6, 0.3]]) {
      const osc = context.createOscillator();
      const amp = context.createGain();
      osc.type = type;
      osc.frequency.value = hz(mood.root, semitones);
      osc.detune.value = cents + index * 2;
      amp.gain.value = level / (1 + index * 0.35);
      osc.connect(amp).connect(filter);
      osc.start();
      nodes.push(osc);
    }
  });
  if (mood.hum) {
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    amp.gain.value = 0.5;
    osc.connect(amp).connect(gain);
    osc.start();
    nodes.push(osc);
  }
  return { name, gain, nodes, mood };
}

function release(pad) {
  const now = context.currentTime;
  pad.gain.gain.cancelScheduledValues(now);
  pad.gain.gain.setValueAtTime(Math.max(0.0001, pad.gain.gain.value), now);
  pad.gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
  setTimeout(() => { for (const node of pad.nodes) { try { node.stop(); } catch { /* já parado */ } } pad.gain.disconnect(); }, 2600);
}

function note(frequency, level = 0.03, length = 2.2, type = 'sine') {
  const now = context.currentTime;
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(level, now + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + length);
  osc.connect(amp);
  amp.connect(master);
  amp.connect(echo);
  osc.start(now);
  osc.stop(now + length + 0.05);
}

function scheduleBell() {
  clearTimeout(bellTimer);
  bellTimer = setTimeout(() => {
    if (current && sfx.enabled && !document.hidden && context.state === 'running') {
      const { mood } = current;
      const step = mood.scale[Math.floor(Math.random() * mood.scale.length)];
      note(hz(mood.root * 2, step), 0.022 * mood.bells, 2.6);
      if (Math.random() < 0.35) setTimeout(() => current && note(hz(current.mood.root * 2, current.mood.scale[Math.floor(Math.random() * current.mood.scale.length)]), 0.016 * mood.bells, 2.2), 380);
    }
    scheduleBell();
  }, 2400 + Math.random() * 4200);
}

function schedulePulse() {
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => {
    if (current?.mood.pulse && sfx.enabled && !document.hidden && context.state === 'running') {
      note(49, 0.07 + tension * 0.05, 0.22);
      if (tension > 0.6) setTimeout(() => context && note(49, 0.05, 0.16), 170);
    }
    schedulePulse();
  }, 1100 - tension * 560);
}

function apply() {
  if (!started || !ensure()) return;
  if (context.state === 'suspended') context.resume();
  if (current?.name === wanted) return;
  if (current) release(current);
  current = buildPad(wanted);
}

export const ambience = {
  /** Chamar a partir de um gesto da pessoa (clique): os navegadores só liberam áudio assim. */
  start() {
    if (started) return;
    started = true;
    apply();
    scheduleBell();
    schedulePulse();
  },
  /** Troca o clima para o do cenário indicado. */
  set(name) { wanted = MOODS[name] ? name : 'black'; apply(); },
  /** 0..1: quanto a prova está apertada (acelera o pulso da arena). */
  tension(value) { tension = Math.max(0, Math.min(1, value || 0)); },
  /** Reaplica o botão de som. */
  refresh() {
    if (!context) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(sfx.enabled ? 1 : 0, now, 0.25);
  },
};

on('scene', ({ name }) => ambience.set(name));
document.addEventListener('visibilitychange', () => {
  if (!context || !started) return;
  if (document.hidden) context.suspend(); else if (sfx.enabled) context.resume();
});
