const BOARD_SIZE = 7;
const DIRECTIONS = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 }
];

const boardElement = document.getElementById("board");
const turnIndicator = document.getElementById("turnIndicator");
const pieceCounts = document.getElementById("pieceCounts");
const statusMessage = document.getElementById("statusMessage");
const helpButton = document.getElementById("helpButton");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");
const settingsButton = document.getElementById("settingsButton");
const settingsModal = document.getElementById("settingsModal");
const settingsClose = document.getElementById("settingsClose");
const settingsOptions = document.querySelectorAll(".settings-option");
const volumeSlider = document.getElementById("volumeSlider");
const muteButton = document.getElementById("muteButton");
const darkModeToggle = document.getElementById("darkModeToggle");
const rewindButton = document.getElementById("rewindButton");
const player1Box = document.getElementById("player1Box");
const player2Box = document.getElementById("player2Box");
const player1Name = document.getElementById("player1Name");
const player2Name = document.getElementById("player2Name");
const player1Display = document.getElementById("player1Display");
const player2Display = document.getElementById("player2Display");
const player1Time = document.getElementById("player1Time");
const player2Time = document.getElementById("player2Time");
const player1Edit = document.getElementById("player1Edit");
const player2Edit = document.getElementById("player2Edit");
const player1Score = document.getElementById("player1Score");
const player2Score = document.getElementById("player2Score");
const winModal = document.getElementById("winModal");
const winClose = document.getElementById("winClose");
const winMessage = document.getElementById("winMessage");
const newRound = document.getElementById("newRound");
const newGameButton = document.getElementById("newGameButton");

let boardState = [];
let currentPlayer = "p1";
let selectedCell = null;
let gameOver = false;
let phase = "move";
let scores = { p1: 0, p2: 0 };
let gameTimeLimit = "unlimited";
let timeRemaining = { p1: null, p2: null };
let timerIntervalId = null;
let historyStack = [];
let audioContext = null;
let masterGain = null;
let volumeLevel = 0.6;
let isMuted = false;
let isDarkMode = true;
let pawnPositions = {
  p1: { row: 6, col: 3 },
  p2: { row: 0, col: 3 }
};

const playerLabels = {
  p1: "Oyuncu 1",
  p2: "Oyuncu 2"
};

function initAudio() {
  if (audioContext) {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return;
  }
  const AudioContextRef = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextRef) {
    return;
  }
  audioContext = new AudioContextRef();
  masterGain = audioContext.createGain();
  masterGain.gain.value = isMuted ? 0 : volumeLevel;
  masterGain.connect(audioContext.destination);
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function updateMuteButton() {
  if (!muteButton) {
    return;
  }
  muteButton.classList.toggle("is-muted", isMuted);
  const icon = muteButton.querySelector(".mute-icon");
  if (icon) {
    icon.textContent = isMuted ? "🔇" : "🔊";
  }
}

function updateDarkMode() {
  if (!darkModeToggle) {
    return;
  }
  document.body.classList.toggle("dark-mode", isDarkMode);
  darkModeToggle.classList.toggle("is-dark", isDarkMode);
  const icon = darkModeToggle.querySelector(".dark-mode-icon");
  if (icon) {
    icon.textContent = isDarkMode ? "🌙" : "☀️";
  }
}

function playTone({ frequency, duration, type = "sine" }) {
  initAudio();
  if (!audioContext || !masterGain) {
    return;
  }
  const startTone = () => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(masterGain);
    const now = audioContext.currentTime + 0.02;
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  };
  if (audioContext.state === "suspended") {
    audioContext.resume().then(startTone).catch(() => {});
    return;
  }
  startTone();
}

function playThock({ filterFreq, duration, gainPeak }) {
  initAudio();
  if (!audioContext || !masterGain) {
    return;
  }

  const bufferSize = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.7;

  const gain = audioContext.createGain();
  gain.gain.value = 0.001;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  const now = audioContext.currentTime + 0.01;
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function playMoveSound() {
  playThock({ filterFreq: 1100, duration: 0.12, gainPeak: 0.22 });
}

function playBlockSound() {
  playThock({ filterFreq: 800, duration: 0.14, gainPeak: 0.26 });
}

function getStoredName(player) {
  try {
    return localStorage.getItem(`abluka.playerName.${player}`);
  } catch (error) {
    return null;
  }
}

function getPlayerName(player) {
  if (player === "p1") {
    if (player1Display) {
      return player1Display.textContent.trim() || playerLabels.p1;
    }
    if (player1Name) {
      return player1Name.value.trim() || playerLabels.p1;
    }
  }
  if (player === "p2") {
    if (player2Display) {
      return player2Display.textContent.trim() || playerLabels.p2;
    }
    if (player2Name) {
      return player2Name.value.trim() || playerLabels.p2;
    }
  }
  return playerLabels[player];
}

function setPlayerName(player, name, persist = true) {
  const safeName = name.trim() || playerLabels[player];
  if (player === "p1") {
    if (player1Display) {
      player1Display.textContent = safeName;
    }
    if (player1Name) {
      player1Name.value = safeName;
    }
  }
  if (player === "p2") {
    if (player2Display) {
      player2Display.textContent = safeName;
    }
    if (player2Name) {
      player2Name.value = safeName;
    }
  }
  if (persist) {
    try {
      localStorage.setItem(`abluka.playerName.${player}`, safeName);
    } catch (error) {
      // Ignore storage failures (private mode or disabled storage).
    }
  }
}

function startEditing(player) {
  const box = player === "p1" ? player1Box : player2Box;
  const input = player === "p1" ? player1Name : player2Name;
  const display = player === "p1" ? player1Display : player2Display;
  if (!box || !input || !display) {
    return;
  }
  box.classList.add("is-editing");
  display.classList.add("is-hidden");
  input.classList.remove("is-hidden");
  input.focus();
  input.select();
}

function stopEditing(player, commit) {
  const box = player === "p1" ? player1Box : player2Box;
  const input = player === "p1" ? player1Name : player2Name;
  const display = player === "p1" ? player1Display : player2Display;
  if (!box || !input || !display) {
    return;
  }
  box.classList.remove("is-editing");
  input.classList.add("is-hidden");
  display.classList.remove("is-hidden");
  if (commit) {
    setPlayerName(player, input.value);
  } else {
    input.value = display.textContent;
  }
  updateStatus(statusMessage.textContent);
}

function updateActivePlayer() {
  if (player1Box) {
    player1Box.classList.toggle("is-active", currentPlayer === "p1");
  }
  if (player2Box) {
    player2Box.classList.toggle("is-active", currentPlayer === "p2");
  }
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ type: "empty" }))
  );
}

function placePawns(board) {
  pawnPositions = {
    p1: { row: 6, col: 3 },
    p2: { row: 0, col: 3 }
  };
  board[pawnPositions.p1.row][pawnPositions.p1.col] = { type: "p1" };
  board[pawnPositions.p2.row][pawnPositions.p2.col] = { type: "p2" };
}

function resetGame() {
  boardState = createEmptyBoard();
  placePawns(boardState);
  currentPlayer = "p1";
  selectedCell = null;
  gameOver = false;
  phase = "move";
  historyStack = [];
  updateStatus("Oyuncu taşını seç ve hareket et.");
  applyTimeLimit();
  saveHistory();
  renderBoard();
  startTurn();
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getCell(row, col) {
  if (!inBounds(row, col)) {
    return null;
  }
  return boardState[row][col];
}

function findLegalMoves(row, col, player) {
  const moves = [];
  const cell = getCell(row, col);
  if (!cell || cell.type !== player) {
    return moves;
  }

  DIRECTIONS.forEach((direction) => {
    const targetRow = row + direction.row;
    const targetCol = col + direction.col;
    if (!inBounds(targetRow, targetCol)) {
      return;
    }
    const targetCell = boardState[targetRow][targetCol];
    if (targetCell.type === "barrier") {
      return;
    }
    if (targetCell.type === player) {
      return;
    }
    if (targetCell.type !== "empty") {
      return;
    }
    moves.push({ row: targetRow, col: targetCol });
  });

  return moves;
}

function countBarriers() {
  return boardState.flat().filter((cell) => cell.type === "barrier").length;
}

function playerHasMoves(player) {
  const pawn = pawnPositions[player];
  const moves = findLegalMoves(pawn.row, pawn.col, player);
  return moves.length > 0;
}

function switchPlayer() {
  currentPlayer = currentPlayer === "p1" ? "p2" : "p1";
}

function updateStatus(message) {
  statusMessage.textContent = message;
  turnIndicator.textContent = getPlayerName(currentPlayer);
  pieceCounts.textContent = `${countBarriers()} yerleştirildi`;
  updateActivePlayer();
}

function updateScores() {
  if (player1Score) {
    player1Score.textContent = scores.p1;
  }
  if (player2Score) {
    player2Score.textContent = scores.p2;
  }
}

function cloneBoardState(state) {
  return state.map((row) => row.map((cell) => ({ type: cell.type })));
}

function saveHistory() {
  historyStack.push({
    boardState: cloneBoardState(boardState),
    pawnPositions: {
      p1: { ...pawnPositions.p1 },
      p2: { ...pawnPositions.p2 }
    },
    currentPlayer,
    phase,
    selectedCell: selectedCell ? { ...selectedCell } : null,
    gameOver,
    scores: { ...scores },
    timeRemaining: {
      p1: timeRemaining.p1,
      p2: timeRemaining.p2
    },
    statusMessage: statusMessage.textContent
  });
}

function restoreHistory() {
  if (historyStack.length < 2) {
    return;
  }
  historyStack.pop();
  const snapshot = historyStack[historyStack.length - 1];
  stopTimerInterval();
  boardState = cloneBoardState(snapshot.boardState);
  pawnPositions = {
    p1: { ...snapshot.pawnPositions.p1 },
    p2: { ...snapshot.pawnPositions.p2 }
  };
  currentPlayer = snapshot.currentPlayer;
  phase = snapshot.phase;
  selectedCell = snapshot.selectedCell ? { ...snapshot.selectedCell } : null;
  gameOver = snapshot.gameOver;
  scores = { ...snapshot.scores };
  timeRemaining = {
    p1: snapshot.timeRemaining.p1,
    p2: snapshot.timeRemaining.p2
  };
  closeWin();
  updateScores();
  updateTimeDisplays();
  updateStatus(snapshot.statusMessage || "Oyuncu taşını seç ve hareket et.");
  renderBoard();
  if (!gameOver) {
    startTimerInterval();
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updateTimeDisplays() {
  if (gameTimeLimit === "unlimited") {
    if (player1Time) {
      player1Time.textContent = "Sınırsız";
    }
    if (player2Time) {
      player2Time.textContent = "Sınırsız";
    }
    return;
  }

  if (player1Time) {
    player1Time.textContent = formatTime(timeRemaining.p1);
  }
  if (player2Time) {
    player2Time.textContent = formatTime(timeRemaining.p2);
  }
}

function stopTimerInterval() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function handleTimeOut(player) {
  if (gameOver) {
    return;
  }
  gameOver = true;
  const winnerKey = player === "p1" ? "p2" : "p1";
  const winner = getPlayerName(winnerKey);
  scores[winnerKey] += 1;
  updateScores();
  updateStatus(`Süre bitti. ${winner} kazandı.`);
  showWin(winnerKey);
  updateActivePlayer();
  stopTimerInterval();
}

function startTimerInterval() {
  stopTimerInterval();
  if (gameTimeLimit === "unlimited") {
    return;
  }
  timerIntervalId = setInterval(() => {
    if (gameOver || gameTimeLimit === "unlimited") {
      return;
    }
    if (timeRemaining[currentPlayer] <= 0) {
      handleTimeOut(currentPlayer);
      return;
    }
    timeRemaining[currentPlayer] = Math.max(0, timeRemaining[currentPlayer] - 1);
    updateTimeDisplays();
    if (timeRemaining[currentPlayer] === 0) {
      handleTimeOut(currentPlayer);
    }
  }, 1000);
}

function applyTimeLimit() {
  if (gameTimeLimit === "unlimited") {
    timeRemaining = { p1: null, p2: null };
    updateTimeDisplays();
    stopTimerInterval();
    return;
  }
  const limitSeconds = Number(gameTimeLimit);
  timeRemaining = { p1: limitSeconds, p2: limitSeconds };
  updateTimeDisplays();
  startTimerInterval();
}

function showWin(winnerKey) {
  const winnerName = getPlayerName(winnerKey);
  if (winMessage) {
    winMessage.textContent = `Kazanan: ${winnerName}`;
  }
  if (winModal) {
    winModal.classList.add("is-open");
    winModal.setAttribute("aria-hidden", "false");
  }
}

function closeWin() {
  if (!winModal) {
    return;
  }
  winModal.classList.remove("is-open");
  winModal.setAttribute("aria-hidden", "true");
}

function startTurn() {
  if (!playerHasMoves(currentPlayer)) {
    gameOver = true;
    const winnerKey = currentPlayer === "p1" ? "p2" : "p1";
    const winner = getPlayerName(winnerKey);
    scores[winnerKey] += 1;
    updateScores();
    updateStatus(`${winner} abluka ile kazandı.`);
    showWin(winnerKey);
    stopTimerInterval();
    return;
  }
  phase = "move";
  selectedCell = null;
  updateStatus("Oyuncu taşını seç ve hareket et.");
}

function endTurnAfterBlock() {
  if (!playerHasMoves(currentPlayer)) {
    endGame();
    return;
  }
  switchPlayer();
  if (!playerHasMoves(currentPlayer)) {
    endGame();
    return;
  }
  phase = "move";
  selectedCell = null;
  updateStatus("Oyuncu taşını seç ve hareket et.");
}

function endGame() {
  gameOver = true;
  const winnerKey = currentPlayer === "p1" ? "p2" : "p1";
  const winner = getPlayerName(winnerKey);
  scores[winnerKey] += 1;
  updateScores();
  updateStatus(`${winner} abluka ile kazandı.`);
  showWin(winnerKey);
  updateActivePlayer();
  stopTimerInterval();
}
function handleCellClick(row, col) {
  if (gameOver) {
    return;
  }

  const cell = boardState[row][col];
  if (cell.type === "barrier") {
    return;
  }

  if (phase === "move") {
    if (cell.type === currentPlayer) {
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        saveHistory();
        selectedCell = null;
        updateStatus("Oyuncu taşını seç ve hareket et.");
        renderBoard();
        return;
      }
      saveHistory();
      selectedCell = { row, col };
      updateStatus("Hedef kareyi seç.");
      renderBoard();
      return;
    }

    if (!selectedCell) {
      return;
    }

    const legalMoves = findLegalMoves(
      selectedCell.row,
      selectedCell.col,
      currentPlayer
    );
    const isLegal = legalMoves.some(
      (move) => move.row === row && move.col === col
    );

    if (!isLegal) {
      updateStatus("Bu hamle yasal değil.");
      return;
    }
    saveHistory();
    boardState[row][col] = { type: currentPlayer };
    boardState[selectedCell.row][selectedCell.col] = { type: "empty" };
    pawnPositions[currentPlayer] = { row, col };
    selectedCell = null;
    phase = "block";
    updateStatus("Boş bir kareye engel taşı koy.");
      playMoveSound();
    renderBoard();
    return;
  }

  if (phase === "block") {
    if (cell.type !== "empty") {
      return;
    }
    saveHistory();
    boardState[row][col] = { type: "barrier" };
      playBlockSound();
    endTurnAfterBlock();
    renderBoard();
  }
}

function renderBoard() {
  boardElement.innerHTML = "";
  const legalMoves =
    selectedCell && phase === "move"
      ? findLegalMoves(selectedCell.row, selectedCell.col, currentPlayer)
      : [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = boardState[row][col];
      const cellButton = document.createElement("button");
      cellButton.type = "button";
      cellButton.className = "cell";
      if ((row + col) % 2 === 1) {
        cellButton.classList.add("dark");
      }
      if (row === 3 && col === 3) {
        cellButton.classList.add("center");
        if (cell.type !== "empty") {
          cellButton.classList.add("center-occupied");
        }
      }
      if (cell.type === "barrier") {
        cellButton.classList.add("barrier");
      }

      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        cellButton.classList.add("selected");
      }

      if (phase === "move") {
        if (legalMoves.some((move) => move.row === row && move.col === col)) {
          cellButton.classList.add("highlight");
        }
      }

      if (phase === "block" && cell.type === "empty") {
        cellButton.classList.add("blockable");
      }

      cellButton.dataset.row = row;
      cellButton.dataset.col = col;
      cellButton.setAttribute("role", "gridcell");
      cellButton.addEventListener("click", () => handleCellClick(row, col));

      if (cell.type === "p1" || cell.type === "p2") {
        const pawn = document.createElement("span");
        pawn.className = `pawn ${cell.type}`;
        cellButton.appendChild(pawn);
      }

      boardElement.appendChild(cellButton);
    }
  }
}

updateScores();

if (player1Edit) {
  player1Edit.addEventListener("click", () => startEditing("p1"));
}

if (player2Edit) {
  player2Edit.addEventListener("click", () => startEditing("p2"));
}

if (player1Name) {
  player1Name.addEventListener("blur", () => stopEditing("p1", true));
  player1Name.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      stopEditing("p1", true);
    }
    if (event.key === "Escape") {
      stopEditing("p1", false);
    }
  });
}

if (player2Name) {
  player2Name.addEventListener("blur", () => stopEditing("p2", true));
  player2Name.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      stopEditing("p2", true);
    }
    if (event.key === "Escape") {
      stopEditing("p2", false);
    }
  });
}

const storedP1Name = getStoredName("p1") || playerLabels.p1;
const storedP2Name = getStoredName("p2") || playerLabels.p2;
setPlayerName("p1", storedP1Name, false);
setPlayerName("p2", storedP2Name, false);

function openHelp() {
  if (!helpModal) {
    return;
  }
  helpModal.classList.add("is-open");
  helpModal.setAttribute("aria-hidden", "false");
}

function closeHelp() {
  if (!helpModal) {
    return;
  }
  helpModal.classList.remove("is-open");
  helpModal.setAttribute("aria-hidden", "true");
}

function openSettings() {
  if (!settingsModal) {
    return;
  }
  settingsModal.classList.add("is-open");
  settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  if (!settingsModal) {
    return;
  }
  settingsModal.classList.remove("is-open");
  settingsModal.setAttribute("aria-hidden", "true");
}

if (helpButton) {
  helpButton.addEventListener("click", openHelp);
}

if (settingsButton) {
  settingsButton.addEventListener("click", openSettings);
}

if (helpClose) {
  helpClose.addEventListener("click", closeHelp);
}

if (settingsClose) {
  settingsClose.addEventListener("click", closeSettings);
}

if (helpModal) {
  helpModal.addEventListener("click", (event) => {
    if (event.target === helpModal) {
      closeHelp();
    }
  });
}

if (settingsModal) {
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettings();
    }
  });
}

if (rewindButton) {
  rewindButton.addEventListener("click", restoreHistory);
}

if (newGameButton) {
  newGameButton.addEventListener("click", () => {
    closeWin();
    resetGame();
  });
}

settingsOptions.forEach((option) => {
  if (option.dataset.time === gameTimeLimit) {
    option.classList.add("active");
  }
  option.addEventListener("click", () => {
    settingsOptions.forEach((opt) => opt.classList.remove("active"));
    option.classList.add("active");
    gameTimeLimit = option.dataset.time;
    applyTimeLimit();
  });
});

if (volumeSlider) {
  const storedVolumeRaw = localStorage.getItem("abluka.volume");
  if (storedVolumeRaw !== null) {
    const storedVolume = Number(storedVolumeRaw);
    if (!Number.isNaN(storedVolume)) {
      volumeLevel = Math.min(1, Math.max(0, storedVolume));
      volumeSlider.value = Math.round(volumeLevel * 100);
    }
  }
  const storedMutedRaw = localStorage.getItem("abluka.muted");
  if (storedMutedRaw !== null) {
    isMuted = storedMutedRaw === "true";
  }
  updateMuteButton();
  const storedDarkModeRaw = localStorage.getItem("abluka.darkMode");
  if (storedDarkModeRaw !== null) {
    isDarkMode = storedDarkModeRaw === "true";
  }
  updateDarkMode();
  volumeSlider.addEventListener("input", () => {
    volumeLevel = Number(volumeSlider.value) / 100;
    initAudio();
    if (masterGain && !isMuted) {
      masterGain.gain.value = volumeLevel;
    }
    try {
      localStorage.setItem("abluka.volume", String(volumeLevel));
    } catch (error) {
      // Ignore storage failures.
    }
  });
}

if (muteButton) {
  muteButton.addEventListener("click", () => {
    isMuted = !isMuted;
    initAudio();
    if (masterGain) {
      masterGain.gain.value = isMuted ? 0 : volumeLevel;
    }
    updateMuteButton();
    try {
      localStorage.setItem("abluka.muted", String(isMuted));
    } catch (error) {
      // Ignore storage failures.
    }
  });
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    isDarkMode = !isDarkMode;
    updateDarkMode();
    try {
      localStorage.setItem("abluka.darkMode", String(isDarkMode));
    } catch (error) {
      // Ignore storage failures.
    }
  });
}

// Color theme system
const colorThemes = {
  red: {
    accent1: '#d63a35',
    accent2: '#b52c28',
    barrier: '#d63a35',
    glow: 'rgba(214, 58, 53, 0.35)',
    container: '#15181d',
    containerLight: 'rgba(255, 255, 255, 0.85)'
  },
  blue: {
    accent1: '#3b82f6',
    accent2: '#2563eb',
    barrier: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.35)',
    container: '#1e293b',
    containerLight: 'rgba(219, 234, 254, 0.85)'
  },
  green: {
    accent1: '#10b981',
    accent2: '#059669',
    barrier: '#10b981',
    glow: 'rgba(16, 185, 129, 0.35)',
    container: '#1e3a34',
    containerLight: 'rgba(209, 250, 229, 0.85)'
  },
  purple: {
    accent1: '#a855f7',
    accent2: '#9333ea',
    barrier: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.35)',
    container: '#2e1a47',
    containerLight: 'rgba(243, 232, 255, 0.85)'
  },
  amber: {
    accent1: '#f59e0b',
    accent2: '#d97706',
    barrier: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)',
    container: '#3a2e1a',
    containerLight: 'rgba(254, 243, 199, 0.85)'
  }
};

let currentTheme = 'red';

function applyTheme(themeName) {
  const theme = colorThemes[themeName];
  if (!theme) return;
  
  const root = document.documentElement;
  root.style.setProperty('--accent-1', theme.accent1);
  root.style.setProperty('--accent-2', theme.accent2);
  root.style.setProperty('--barrier', theme.barrier);
  root.style.setProperty('--glow', theme.glow);
  root.style.setProperty('--container-dark', theme.container);
  root.style.setProperty('--container-light', theme.containerLight);
  
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeName);
  });
  
  currentTheme = themeName;
}

// Initialize theme from localStorage
const storedTheme = localStorage.getItem('abluka.theme');
if (storedTheme && colorThemes[storedTheme]) {
  applyTheme(storedTheme);
}

// Add event listeners to color options
document.querySelectorAll('.color-option').forEach(button => {
  button.addEventListener('click', () => {
    const theme = button.dataset.theme;
    applyTheme(theme);
    try {
      localStorage.setItem('abluka.theme', theme);
    } catch (error) {
      // Ignore storage failures.
    }
  });
});

if (winClose) {
  winClose.addEventListener("click", closeWin);
}

if (newRound) {
  newRound.addEventListener("click", () => {
    closeWin();
    resetGame();
  });
}

if (winModal) {
  winModal.addEventListener("click", (event) => {
    if (event.target === winModal) {
      closeWin();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHelp();
    closeWin();
    closeSettings();
  }
});

resetGame();
