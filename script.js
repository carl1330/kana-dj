// Kana DJ — game logic

const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const resultsScreen = document.getElementById("results-screen");

const kanaChar = document.getElementById("kana-char");
const kanaRecord = document.getElementById("kana-record");
const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const feedback = document.getElementById("feedback");
const strikesEl = document.getElementById("strikes");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const correctCountEl = document.getElementById("correct-count");
const failedCountEl = document.getElementById("failed-count");
const progressBar = document.getElementById("progress-bar");
const gameDj = document.getElementById("game-dj");

const modal = document.getElementById("mnemonic-modal");
const modalKana = document.getElementById("modal-kana");
const modalRomaji = document.getElementById("modal-romaji");
const modalMnemonic = document.getElementById("modal-mnemonic");
const modalChart = document.getElementById("mnemonic-chart");
const modalContinue = document.getElementById("modal-continue");
const modalTitle = document.getElementById("modal-title");
const hintBtn = document.getElementById("hint-btn");
const replayFailedBtn = document.getElementById("replay-failed-btn");

const HYPE = ["Sick drop! 🔥", "You're on fire! 🎶", "Crowd goes wild! 🙌", "Smooth mix! 🎚️", "Banger!! 💿", "Encore! Encore! ✨"];
const OOPS = ["Off beat! Try again 🎧", "Needle slipped! 🫨", "Hmm, remix that guess 🌀"];

let state = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
}

let roundLength = "all";

function buildDeck(mode) {
  let pool = KANA[mode];
  if (document.getElementById("tenten-check").checked) {
    pool = pool.concat(TENTEN[mode]);
  }
  const deck = shuffle(pool);
  return roundLength === "all" ? deck : deck.slice(0, Number(roundLength));
}

function startGame(mode, cards) {
  state = {
    mode,
    deck: cards ? shuffle(cards) : buildDeck(mode),
    index: 0,
    wrongInRow: 0,
    streak: 0,
    correct: 0,
    failed: [],
    missed: [],
    score: 0,
    cardStart: 0,
    hintUsed: false,
  };
  showScreen(gameScreen);
  renderCard();
}

function current() {
  return state.deck[state.index];
}

function renderCard() {
  const card = current();
  kanaChar.textContent = card.char;
  feedback.textContent = "";
  feedback.className = "feedback";
  guessInput.value = "";
  guessInput.focus();
  updateStrikes();
  updateHud();
  state.cardStart = performance.now();
  state.hintUsed = false;

  // restart the spin so each new record "drops in"
  kanaRecord.classList.remove("drop-in");
  void kanaRecord.offsetWidth;
  kanaRecord.classList.add("drop-in");
}

function updateHud() {
  scoreEl.textContent = state.score;
  streakEl.textContent = state.streak;
  correctCountEl.textContent = state.correct;
  failedCountEl.textContent = state.failed.length;
  progressBar.style.width = `${(state.index / state.deck.length) * 100}%`;
}

function updateStrikes() {
  [...strikesEl.children].forEach((el, i) => {
    el.classList.toggle("used", i < state.wrongInRow);
  });
}

function djParty() {
  gameDj.classList.remove("party", "sad");
  void gameDj.offsetWidth;
  gameDj.classList.add("party");
}

function djSad() {
  gameDj.classList.remove("party", "sad");
  void gameDj.offsetWidth;
  gameDj.classList.add("sad");
}

function nextCard() {
  state.index++;
  state.wrongInRow = 0;
  if (state.index >= state.deck.length) {
    endGame();
  } else {
    renderCard();
  }
}

// base points by attempt (1st/2nd/3rd try), plus a speed bonus that
// decays 10 pts/second; using the hint halves the card's points
function cardPoints() {
  const base = [100, 50, 25][state.wrongInRow];
  const elapsed = (performance.now() - state.cardStart) / 1000;
  const speedBonus = Math.max(0, 50 - Math.floor(elapsed * 10));
  let pts = base + speedBonus;
  if (state.hintUsed) pts = Math.floor(pts / 2);
  return pts;
}

guessForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state || !modal.classList.contains("hidden")) return;
  const guess = guessInput.value.trim().toLowerCase();
  if (!guess) return;

  const card = current();
  const accepted = [card.romaji];
  // common alternate spellings
  const alts = { shi: ["si"], chi: ["ti"], tsu: ["tu"], fu: ["hu"], ji: ["zi", "di"], zu: ["du"] };
  if (alts[card.romaji]) accepted.push(...alts[card.romaji]);

  if (accepted.includes(guess)) {
    state.correct++;
    state.streak++;
    state.score += cardPoints();
    feedback.textContent = HYPE[Math.floor(Math.random() * HYPE.length)];
    feedback.className = "feedback good";
    djParty();
    updateHud();
    setTimeout(nextCard, 650);
  } else {
    state.wrongInRow++;
    state.streak = 0;
    if (!state.missed.includes(card)) state.missed.push(card);
    updateStrikes();
    updateHud();
    if (state.wrongInRow >= 3) {
      failCard(card);
    } else {
      feedback.textContent = OOPS[Math.floor(Math.random() * OOPS.length)];
      feedback.className = "feedback bad";
      djSad();
      guessInput.value = "";
      guessInput.focus();
      kanaRecord.classList.remove("shake");
      void kanaRecord.offsetWidth;
      kanaRecord.classList.add("shake");
    }
  }
});

let modalMode = "fail";

function openMnemonic(card, mode) {
  modalMode = mode;
  modalTitle.textContent = mode === "hint" ? "Cheat sheet! 💡" : "Record scratch! 📀💥";
  modalKana.textContent = card.char;
  modalRomaji.textContent = card.romaji;
  modalMnemonic.textContent = card.mnemonic;
  modalChart.src = tileSrc(state.mode, card.tile || card.romaji);
  modalChart.alt = `Tofugu mnemonic for ${card.char} (${card.romaji})`;
  modal.classList.remove("hidden");
}

function failCard(card) {
  state.failed.push(card);
  djSad();
  openMnemonic(card, "fail");
}

modalContinue.addEventListener("click", () => {
  modal.classList.add("hidden");
  if (modalMode === "fail") {
    nextCard();
  } else {
    guessInput.focus();
  }
});

hintBtn.addEventListener("click", () => {
  if (!state) return;
  state.hintUsed = true;
  openMnemonic(current(), "hint");
});

// ===== leaderboard (localStorage) =====
const BOARD_KEY = "kanaDjLeaderboard";
const NAME_KEY = "kanaDjName";

function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem(BOARD_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBoard(board) {
  localStorage.setItem(BOARD_KEY, JSON.stringify(board));
}

function renderBoard(el) {
  const board = loadBoard();
  el.innerHTML = "";
  if (!board.length) {
    el.innerHTML = '<p class="board-empty">No scores yet — drop a set! 🎧</p>';
    return;
  }
  board.forEach((entry, i) => {
    const row = document.createElement("div");
    row.className = "board-row";
    const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
    row.innerHTML = `<span class="board-rank">${medal}</span>
      <span class="board-name"></span>
      <span class="board-meta">${entry.mode === "hiragana" ? "あ" : "ア"} ×${entry.cards}</span>
      <span class="board-score">${entry.score}</span>`;
    row.querySelector(".board-name").textContent = entry.name;
    el.appendChild(row);
  });
}

document.getElementById("save-score-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim() || "DJ Anon";
  localStorage.setItem(NAME_KEY, name);
  const board = loadBoard();
  board.push({ name, score: state.score, mode: state.mode, cards: state.deck.length, date: new Date().toISOString().slice(0, 10) });
  board.sort((a, b) => b.score - a.score);
  saveBoard(board.slice(0, 10));
  e.target.classList.add("hidden");
  renderBoard(document.getElementById("results-board"));
});

function endGame() {
  document.getElementById("final-score").textContent = state.score;
  const saveForm = document.getElementById("save-score-form");
  saveForm.classList.remove("hidden");
  document.getElementById("player-name").value = localStorage.getItem(NAME_KEY) || "";
  renderBoard(document.getElementById("results-board"));
  document.getElementById("final-correct").textContent = state.correct;
  document.getElementById("final-failed").textContent = state.missed.length;
  const list = document.getElementById("failed-list");
  list.innerHTML = "";
  if (state.missed.length) {
    const title = document.createElement("p");
    title.className = "failed-title";
    title.textContent = "Scratched records to practice:";
    list.appendChild(title);
    state.missed.forEach((card) => {
      const chip = document.createElement("span");
      chip.className = "failed-chip";
      chip.textContent = `${card.char} = ${card.romaji}`;
      list.appendChild(chip);
    });
  }
  replayFailedBtn.classList.toggle("hidden", state.missed.length === 0);
  showScreen(resultsScreen);
}

// length picker
document.querySelectorAll(".length-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    roundLength = btn.dataset.length;
    document.querySelectorAll(".length-btn").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

// menu buttons
document.querySelectorAll(".mode-btn[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.mode));
});

document.getElementById("back-btn").addEventListener("click", () => {
  state = null;
  showScreen(menuScreen);
});

document.getElementById("leaderboard-btn").addEventListener("click", () => {
  renderBoard(document.getElementById("menu-board"));
  showScreen(document.getElementById("leaderboard-screen"));
});
document.getElementById("board-back-btn").addEventListener("click", () => showScreen(menuScreen));

document.getElementById("replay-btn").addEventListener("click", () => startGame(state.mode));
replayFailedBtn.addEventListener("click", () => startGame(state.mode, state.missed));
document.getElementById("menu-btn").addEventListener("click", () => showScreen(menuScreen));
