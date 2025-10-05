import { createWorker } from "https://cdn.jsdelivr.net/npm/emoji-particle@0.0.4/+esm";

const playPanel = document.getElementById("playPanel");
const infoPanel = document.getElementById("infoPanel");
const countPanel = document.getElementById("countPanel");
const scorePanel = document.getElementById("scorePanel");
const japanese = document.getElementById("japanese");
const choices = document.getElementById("choices");
const gameTime = 120;
let gameTimer;
// https://dova-s.jp/bgm/play17438.html
const bgm = new Audio("mp3/bgm.mp3");
bgm.volume = 0.1;
bgm.loop = true;
const emojiParticle = initEmojiParticle();
let consecutiveWins = 0;
let problemCount = 0;
let incorrectCount = 0;
let problems = [];
let answerText;
let audioContext;
const audioBufferCache = {};
loadConfig();

function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
  if (localStorage.getItem("bgm") != 1) {
    document.getElementById("bgmOn").classList.add("d-none");
    document.getElementById("bgmOff").classList.remove("d-none");
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    document.documentElement.setAttribute("data-bs-theme", "light");
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function toggleBGM() {
  if (localStorage.getItem("bgm") == 1) {
    document.getElementById("bgmOn").classList.add("d-none");
    document.getElementById("bgmOff").classList.remove("d-none");
    localStorage.setItem("bgm", 0);
    bgm.pause();
  } else {
    document.getElementById("bgmOn").classList.remove("d-none");
    document.getElementById("bgmOff").classList.add("d-none");
    localStorage.setItem("bgm", 1);
    bgm.play();
  }
}

function createAudioContext() {
  if (globalThis.AudioContext) {
    return new globalThis.AudioContext();
  } else {
    console.error("Web Audio API is not supported in this browser");
    return null;
  }
}

function unlockAudio() {
  if (audioContext) {
    audioContext.resume();
  } else {
    audioContext = createAudioContext();
    loadAudio("keyboard", "mp3/keyboard.mp3");
    loadAudio("end", "mp3/end.mp3");
    loadAudio("correct", "mp3/correct3.mp3");
    loadAudio("incorrect", "mp3/cat.mp3");
  }
  document.removeEventListener("pointerdown", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
}

async function loadAudio(name, url) {
  if (!audioContext) return;
  if (audioBufferCache[name]) return audioBufferCache[name];
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBufferCache[name] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    console.error(`Loading audio ${name} error:`, error);
    throw error;
  }
}

function playAudio(name, volume) {
  if (!audioContext) return;
  const audioBuffer = audioBufferCache[name];
  if (!audioBuffer) {
    console.error(`Audio ${name} is not found in cache`);
    return;
  }
  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  const gainNode = audioContext.createGain();
  if (volume) gainNode.gain.value = volume;
  gainNode.connect(audioContext.destination);
  sourceNode.connect(gainNode);
  sourceNode.start();
}

function initEmojiParticle() {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    pointerEvents: "none",
    top: "0px",
    left: "0px",
  });
  canvas.width = document.documentElement.clientWidth;
  canvas.height = document.documentElement.clientHeight;
  document.body.prepend(canvas);

  const offscreen = canvas.transferControlToOffscreen();
  const worker = createWorker();
  worker.postMessage({ type: "init", canvas: offscreen }, [offscreen]);

  globalThis.addEventListener("resize", () => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    worker.postMessage({ type: "resize", width, height });
  });
  return { canvas, offscreen, worker };
}

async function loadProblems() {
  const response = await fetch(`problems.json`);
  const json = await response.json();
  problems = json;
}

function nextProblem() {
  for (let i = 0; i < consecutiveWins; i++) {
    emojiParticle.worker.postMessage({
      type: "spawn",
      options: {
        particleType: "popcorn",
        originX: Math.random() * emojiParticle.canvas.width,
        originY: Math.random() * emojiParticle.canvas.height,
      },
    });
  }
  problemCount += 1;
  if (consecutiveWins === 0) incorrectCount += 1;
  setProblem();
}

function shuffle(array) {
  for (let i = array.length; 1 < i; i--) {
    const k = Math.floor(Math.random() * i);
    [array[k], array[i - 1]] = [array[i - 1], array[k]];
  }
  return array;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function kanaToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

function getFuriganaHTML(morpheme) {
  let html = "";
  const furiganas = getFuriganas(morpheme);
  if (furiganas) {
    furiganas.forEach((furigana) => {
      if (furigana[1]) {
        html += `<ruby>${furigana[0]}<rt>${furigana[1]}</rt></ruby>`;
      } else {
        html += `<span>${furigana[0]}</span>`;
      }
    });
  } else {
    html += `<span>${morpheme.surface}</span>`;
  }
  return html;
}

function getFuriganas(morpheme) {
  const reading = morpheme.reading;
  if (!reading) return undefined;
  const surface = morpheme.surface;
  if (surface == reading) return undefined;
  const hiraSurface = kanaToHira(surface);
  const hiraReading = kanaToHira(reading);
  if (hiraSurface == hiraReading) return undefined;
  // 楽しい --> ([ぁ-ん+])しい --> (たの)しい --> ["たの"]
  // 行き来 --> ([ぁ-ん+])き([ぁ-ん]+) --> (い)き(き), --> ["い", "き"]
  const searchString = hiraSurface.replaceAll(/[一-龠々ヵヶ]+/g, "([ぁ-ん]+)");
  const furiganaRegexp = new RegExp(searchString);
  const furiganas = hiraReading.match(furiganaRegexp).slice(1);
  const map = new Map();
  const kanjis = surface.match(/([一-龠々ヵヶ]+)/g);
  kanjis.forEach((kanji, i) => {
    map.set(kanji, furiganas[i]);
  });
  const words = surface.split(/([一-龠々ヵヶ]+)/g).filter((s) => s != "");
  const result = words.map((word) => {
    const furigana = map.get(word);
    if (furigana) {
      return [word, furigana];
    } else {
      return [word, undefined];
    }
  });
  return result;
}

function initSelectableWord() {
  const span = document.createElement("span");
  span.className = "btn btn-light btn-lg m-1 px-2 choice";
  return span;
}
const selectableWord = initSelectableWord();

function choiceClickEvent(event) {
  const choice = event.target;
  choice.classList.add("d-none");
  const morphemes = [...japanese.children];
  const holes = morphemes.filter((morpheme) => {
    if (morpheme.classList.contains("choice")) return true;
  });
  const targetHole = holes.find((morpheme) => {
    if (morpheme.textContent == "　") return true;
  });
  if (!targetHole) return;
  targetHole.textContent = choice.textContent;
  const thinking = [...choices.children]
    .some((c) => !c.classList.contains("d-none"));
  if (!thinking) {
    const replyText = morphemes
      .filter((morpheme) => morpheme.classList.contains("choice"))
      .map((morpheme) => morpheme.textContent).join("");
    if (replyText == answerText) {
      consecutiveWins += 1;
      playAudio("correct", 0.3);
      nextProblem();
    } else {
      consecutiveWins = 0;
      playAudio("incorrect", 0.3);
    }
  } else {
    playAudio("keyboard");
  }
}

function createChoice(morpheme) {
  const span = selectableWord.cloneNode(true);
  span.onclick = choiceClickEvent;
  span.textContent = morpheme;
  return span;
}

function holeClickEvent(event) {
  const hole = event.target;
  if (hole.textContent != " ") {
    const morpheme = hole.textContent;
    hole.textContent = "　";
    const choice = [...choices.children].find((choice) => {
      if (!choice.classList.contains("d-none")) return false;
      if (choice.textContent != morpheme) return false;
      return true;
    });
    choice.classList.remove("d-none");
    choice.textContent = morpheme;
  }
}

function createHole(surface) {
  const span = selectableWord.cloneNode(true);
  span.onclick = holeClickEvent;
  span.textContent = "　";
  span.dataset.answer = surface;
  return span;
}

function setProblem() {
  const problem = problems[getRandomInt(0, problems.length)];
  const nextProblems = [];
  const nextChoices = [];
  answerText = "";
  problem.forEach((morpheme) => {
    if (morpheme.feature == "助詞") {
      const surface = morpheme.surface;
      answerText += surface;
      const hole = createHole(surface);
      nextProblems.push(hole);
      const choice = createChoice(surface);
      nextChoices.push(choice);
    } else {
      const html = getFuriganaHTML(morpheme);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const spans = [...doc.body.childNodes];
      nextProblems.push(...spans);
    }
  });
  shuffle(nextChoices);
  japanese.replaceChildren(...nextProblems);
  choices.replaceChildren(...nextChoices);
}

function countdown() {
  countPanel.classList.remove("d-none");
  infoPanel.classList.add("d-none");
  playPanel.classList.add("d-none");
  scorePanel.classList.add("d-none");
  counter.textContent = 3;
  const timer = setInterval(() => {
    const counter = document.getElementById("counter");
    const colors = ["skyblue", "greenyellow", "violet", "tomato"];
    if (parseInt(counter.textContent) > 1) {
      const t = parseInt(counter.textContent) - 1;
      counter.style.backgroundColor = colors[t];
      counter.textContent = t;
    } else {
      problemCount = incorrectCount = 0;
      consecutiveWins = 0;
      clearInterval(timer);
      countPanel.classList.add("d-none");
      infoPanel.classList.remove("d-none");
      playPanel.classList.remove("d-none");
      setProblem();
      startGameTimer();
      if (localStorage.getItem("bgm") == 1) {
        bgm.play();
      }
    }
  }, 1000);
}

function startGame() {
  clearInterval(gameTimer);
  initTime();
  countdown();
}

function startGameTimer() {
  const timeNode = document.getElementById("time");
  gameTimer = setInterval(() => {
    const t = parseInt(timeNode.textContent);
    if (t > 0) {
      timeNode.textContent = t - 1;
    } else {
      clearInterval(gameTimer);
      bgm.pause();
      playAudio("end");
      playPanel.classList.add("d-none");
      scorePanel.classList.remove("d-none");
      scoring();
    }
  }, 1000);
}

function initTime() {
  document.getElementById("time").textContent = gameTime;
}

function scoring() {
  document.getElementById("score").textContent = problemCount;
  document.getElementById("count").textContent = problemCount + incorrectCount;
}

function showAnswer() {
  consecutiveWins = 0;
  [...japanese.children].forEach((morpheme) => {
    if (morpheme.classList.contains("choice")) {
      morpheme.textContent = morpheme.dataset.answer;
    }
  });
  setTimeout(() => {
    nextProblem();
  }, 5000);
}

loadProblems();

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("toggleBGM").onclick = toggleBGM;
document.getElementById("startButton").onclick = startGame;
document.getElementById("restartButton").onclick = startGame;
document.getElementById("answerButton").onclick = showAnswer;
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
