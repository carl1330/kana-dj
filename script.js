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
  [menuScreen, gameScreen, resultsScreen].forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
}

let roundLength = "all";

function buildDeck(mode) {
  const deck = shuffle(KANA[mode]);
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

  // restart the spin so each new record "drops in"
  kanaRecord.classList.remove("drop-in");
  void kanaRecord.offsetWidth;
  kanaRecord.classList.add("drop-in");
}

function updateHud() {
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

guessForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state || !modal.classList.contains("hidden")) return;
  const guess = guessInput.value.trim().toLowerCase();
  if (!guess) return;

  const card = current();
  const accepted = [card.romaji];
  // common alternate spellings
  const alts = { shi: ["si"], chi: ["ti"], tsu: ["tu"], fu: ["hu"], ji: ["zi"] };
  if (alts[card.romaji]) accepted.push(...alts[card.romaji]);

  if (accepted.includes(guess)) {
    state.correct++;
    state.streak++;
    feedback.textContent = HYPE[Math.floor(Math.random() * HYPE.length)];
    feedback.className = "feedback good";
    djParty();
    updateHud();
    setTimeout(nextCard, 650);
  } else {
    state.wrongInRow++;
    state.streak = 0;
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
  modalChart.src = tileSrc(state.mode, card.romaji);
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
  openMnemonic(current(), "hint");
});

function endGame() {
  document.getElementById("final-correct").textContent = state.correct;
  document.getElementById("final-failed").textContent = state.failed.length;
  const list = document.getElementById("failed-list");
  list.innerHTML = "";
  if (state.failed.length) {
    const title = document.createElement("p");
    title.className = "failed-title";
    title.textContent = "Scratched records to practice:";
    list.appendChild(title);
    state.failed.forEach((card) => {
      const chip = document.createElement("span");
      chip.className = "failed-chip";
      chip.textContent = `${card.char} = ${card.romaji}`;
      list.appendChild(chip);
    });
  }
  replayFailedBtn.classList.toggle("hidden", state.failed.length === 0);
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

document.getElementById("replay-btn").addEventListener("click", () => startGame(state.mode));
replayFailedBtn.addEventListener("click", () => startGame(state.mode, state.failed));
document.getElementById("menu-btn").addEventListener("click", () => showScreen(menuScreen));
