const playPanel=document.getElementById("playPanel"),countPanel=document.getElementById("countPanel"),scorePanel=document.getElementById("scorePanel"),japanese=document.getElementById("japanese"),choices=document.getElementById("choices"),gameTime=120;let gameTimer;const bgm=new Audio("mp3/bgm.mp3");bgm.volume=.1,bgm.loop=!0;let problemCount=0,incorrectCount=0,mistaken=!1,problems=[],answerText;const audioContext=new AudioContext,audioBufferCache={};loadAudio("keyboard","mp3/keyboard.mp3"),loadAudio("end","mp3/end.mp3"),loadAudio("correct","mp3/correct3.mp3"),loadAudio("incorrect","mp3/cat.mp3"),loadConfig();function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark"),localStorage.getItem("bgm")!=1&&(document.getElementById("bgmOn").classList.add("d-none"),document.getElementById("bgmOff").classList.remove("d-none"))}function toggleBGM(){localStorage.getItem("bgm")==1?(document.getElementById("bgmOn").classList.add("d-none"),document.getElementById("bgmOff").classList.remove("d-none"),localStorage.setItem("bgm",0),bgm.pause()):(document.getElementById("bgmOn").classList.remove("d-none"),document.getElementById("bgmOff").classList.add("d-none"),localStorage.setItem("bgm",1),bgm.play())}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}async function playAudio(b,c){const d=await loadAudio(b,audioBufferCache[b]),a=audioContext.createBufferSource();if(a.buffer=d,c){const b=audioContext.createGain();b.gain.value=c,b.connect(audioContext.destination),a.connect(b),a.start()}else a.connect(audioContext.destination),a.start()}async function loadAudio(a,c){if(audioBufferCache[a])return audioBufferCache[a];const d=await fetch(c),e=await d.arrayBuffer(),b=await audioContext.decodeAudioData(e);return audioBufferCache[a]=b,b}function unlockAudio(){audioContext.resume()}function loadProblems(){fetch(`problems.json`).then(a=>a.json()).then(a=>{problems=a}).catch(a=>{console.error(a)})}function nextProblem(){problemCount+=1,mistaken&&(incorrectCount+=1),mistaken=!1,setProblem()}function shuffle(a){for(let b=a.length;1<b;b--){const c=Math.floor(Math.random()*b);[a[c],a[b-1]]=[a[b-1],a[c]]}return a}function getRandomInt(a,b){return a=Math.ceil(a),b=Math.floor(b),Math.floor(Math.random()*(b-a))+a}function kanaToHira(a){return a.replace(/[\u30a1-\u30f6]/g,a=>{const b=a.charCodeAt(0)-96;return String.fromCharCode(b)})}function getFuriganaHTML(b){let a="";const c=getFuriganas(b);return c?c.forEach(b=>{b[1]?a+=`<ruby>${b[0]}<rt>${b[1]}</rt></ruby>`:a+=`<span>${b[0]}</span>`}):a+=`<span>${b.surface}</span>`,a}function getFuriganas(c){const b=c.reading;if(!b)return void 0;const a=c.surface;if(a==b)return void 0;const d=kanaToHira(a),e=kanaToHira(b);if(d==e)return void 0;const g=d.replaceAll(/[一-龠々ヵヶ]+/g,"([ぁ-ん]+)"),h=new RegExp(g),i=e.match(h).slice(1),f=new Map,j=a.match(/([一-龠々ヵヶ]+)/g);j.forEach((a,b)=>{f.set(a,i[b])});const k=a.split(/([一-龠々ヵヶ]+)/g).filter(a=>a!=""),l=k.map(a=>{const b=f.get(a);return b?[a,b]:[a,void 0]});return l}function initSelectableWord(){const a=document.createElement("span");return a.className="btn btn-light btn-lg m-1 px-2 choice",a}const selectableWord=initSelectableWord();function choiceClickEvent(d){const a=d.target;a.classList.add("d-none");const b=[...japanese.children],e=b.filter(a=>{if(a.classList.contains("choice"))return!0}),c=e.find(a=>{if(a.textContent=="　")return!0});if(!c)return;c.textContent=a.textContent;const f=[...choices.children].some(a=>!a.classList.contains("d-none"));if(f)playAudio("keyboard");else{const a=b.filter(a=>a.classList.contains("choice")).map(a=>a.textContent).join("");a==answerText?(playAudio("correct"),nextProblem()):(mistaken=!0,playAudio("incorrect"))}}function createChoice(b){const a=selectableWord.cloneNode(!0);return a.onclick=choiceClickEvent,a.textContent=b,a}function holeClickEvent(b){const a=b.target;if(a.textContent!=" "){const b=a.textContent;a.textContent="　";const c=[...choices.children].find(a=>!!a.classList.contains("d-none")&&(a.textContent==b));c.classList.remove("d-none"),c.textContent=b}}function createHole(b){const a=selectableWord.cloneNode(!0);return a.onclick=holeClickEvent,a.textContent="　",a.dataset.answer=b,a}function setProblem(){const c=problems[getRandomInt(0,problems.length)],a=[],b=[];answerText="",c.forEach(c=>{if(c.feature=="助詞"){const d=c.surface;answerText+=d;const e=createHole(d);a.push(e);const f=createChoice(d);b.push(f)}else{const b=getFuriganaHTML(c),d=(new DOMParser).parseFromString(b,"text/html"),e=[...d.body.childNodes];a.push(...e)}}),shuffle(b),japanese.replaceChildren(...a),choices.replaceChildren(...b)}function countdown(){problemCount=incorrectCount=0,countPanel.classList.remove("d-none"),infoPanel.classList.add("d-none"),playPanel.classList.add("d-none"),scorePanel.classList.add("d-none"),counter.textContent=3;const a=setInterval(()=>{const b=document.getElementById("counter"),c=["skyblue","greenyellow","violet","tomato"];if(parseInt(b.textContent)>1){const a=parseInt(b.textContent)-1;b.style.backgroundColor=c[a],b.textContent=a}else clearInterval(a),countPanel.classList.add("d-none"),infoPanel.classList.remove("d-none"),playPanel.classList.remove("d-none"),setProblem(),startGameTimer(),localStorage.getItem("bgm")==1&&bgm.play()},1e3)}function startGame(){clearInterval(gameTimer),initTime(),loadProblems(),countdown()}function startGameTimer(){const a=document.getElementById("time");gameTimer=setInterval(()=>{const b=parseInt(a.textContent);b>0?a.textContent=b-1:(clearInterval(gameTimer),bgm.pause(),playAudio("end"),playPanel.classList.add("d-none"),scorePanel.classList.remove("d-none"),scoring())},1e3)}function initTime(){document.getElementById("time").textContent=gameTime}function scoring(){document.getElementById("score").textContent=problemCount-incorrectCount,document.getElementById("count").textContent=problemCount}function showAnswer(){mistaken=!0,[...japanese.children].forEach(a=>{a.classList.contains("choice")&&(a.textContent=a.dataset.answer)}),setTimeout(()=>{nextProblem()},5e3)}document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("toggleBGM").onclick=toggleBGM,document.getElementById("startButton").onclick=startGame,document.getElementById("answerButton").onclick=showAnswer,document.addEventListener("click",unlockAudio,{once:!0,useCapture:!0})