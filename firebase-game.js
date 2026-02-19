// Firebase Game Management
class GameRoom {
  constructor() {
    this.isOnline = false;
    this.gameCode = null;
    this.playerRole = null; // "player1" or "player2"
    this.unsubscribers = [];
    this.startGameSynced = false; // Track if we've sent the initial game state
  }

  generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async createGame() {
    const gameCode = this.generateGameCode();
    this.gameCode = gameCode;
    this.playerRole = "player1";
    
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${gameCode}`);
      await window.firebaseSet(gameRef, {
        code: gameCode,
        player1: { ready: true, connected: true },
        player2: null,
        boardState: null,
        currentPlayer: "p1",
        gameStarted: false,
        createdAt: new Date().toISOString()
      });
      
      this.setupGameListener(gameCode);
      this.isOnline = true;
      return gameCode;
    } catch (error) {
      console.error("Failed to create game:", error);
      throw error;
    }
  }

  async joinGame(gameCode) {
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${gameCode}`);
      
      // Check if game exists with a timeout
      const gameSnapshot = await Promise.race([
        new Promise((resolve) => {
          const unsubscribe = window.firebaseOnValue(gameRef, (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Bağlantı zaman aşımına uğradı")), 5000)
        )
      ]);
      
      if (!gameSnapshot.exists() || !gameSnapshot.val().player1) {
        throw new Error("Oyun kodu bulunamadı");
      }
      
      // Game exists, now join it (use update to preserve existing data)
      await window.firebaseUpdate(gameRef, {
        player2: { ready: false, connected: true }
      });
      
      this.gameCode = gameCode;
      this.playerRole = "player2";
      this.setupGameListener(gameCode);
      this.isOnline = true;
      return true;
    } catch (error) {
      console.error("Failed to join game:", error);
      throw error;
    }
  }

  setupGameListener(gameCode) {
    const gameRef = window.firebaseRef(window.firebaseDB, `games/${gameCode}`);
    
    const unsubscribe = window.firebaseOnValue(gameRef, (snapshot) => {
      const gameData = snapshot.val();
      if (!gameData) {
        this.handleGameDeleted();
        return;
      }
      
      // Emit game update event
      window.dispatchEvent(new CustomEvent("gameUpdate", { detail: gameData }));
    });
    
    this.unsubscribers.push(unsubscribe);
  }

  async syncBoardState(boardState, phase, currentPlayer, pawnPositions, scores, gameOver) {
    if (!this.isOnline || !this.gameCode) return;
    
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${this.gameCode}`);
      // Use update to preserve player data
      await window.firebaseUpdate(gameRef, {
        boardState: boardState,
        phase: phase,
        currentPlayer: currentPlayer,
        pawnPositions: pawnPositions,
        scores: scores,
        gameOver: gameOver,
        lastUpdate: new Date().toISOString()
      });
      // Mark that game is actively being played
      this.startGameSynced = true;
    } catch (error) {
      console.error("Failed to sync board state:", error);
    }
  }

  async startGame(boardState) {
    if (!this.isOnline || !this.gameCode) return;
    
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${this.gameCode}`);
      // Use update to preserve player data
      await window.firebaseUpdate(gameRef, {
        boardState: boardState,
        gameStarted: true,
        currentPlayer: "p1",
        gameStartedAt: new Date().toISOString()
      });
      this.startGameSynced = true;
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  }

  handleGameDeleted() {
    window.dispatchEvent(new CustomEvent("gameDeleted"));
  }

  async leaveGame() {
    if (!this.gameCode) return;
    
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${this.gameCode}`);
      await window.firebaseRemove(gameRef);
    } catch (error) {
      console.error("Failed to leave game:", error);
    }
    
    this.cleanup();
  }

  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.isOnline = false;
    this.gameCode = null;
    this.playerRole = null;
  }

  getOpponentRole() {
    return this.playerRole === "player1" ? "player2" : "player1";
  }

  isCurrentPlayerLocal(currentPlayer) {
    if (this.playerRole === "player1") return currentPlayer === "p1";
    return currentPlayer === "p2";
  }

  getLocalPlayerPiece() {
    return this.playerRole === "player1" ? "p1" : "p2";
  }

  async setPlayerName(playerRole, name) {
    if (!this.isOnline || !this.gameCode) return;
    
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${this.gameCode}`);
      const playerKey = playerRole === "player1" ? "player1" : "player2";
      // Use update to preserve other fields like 'ready' and 'connected'
      await window.firebaseUpdate(gameRef, {
        [playerKey + "/name"]: name
      });
    } catch (error) {
      console.error(`Failed to set player name for ${playerRole}:`, error);
    }
  }

  async setPlayerReady(playerRole, isReady) {
    if (!this.isOnline || !this.gameCode) return;
    
    try {
      const gameRef = window.firebaseRef(window.firebaseDB, `games/${this.gameCode}`);
      const playerKey = playerRole === "player1" ? "player1" : "player2";
      // Use update to preserve other fields like 'name'
      await window.firebaseUpdate(gameRef, {
        [playerKey + "/ready"]: isReady
      });
    } catch (error) {
      console.error(`Failed to set player ready for ${playerRole}:`, error);
    }
  }
}

window.gameRoom = new GameRoom();

// Lobby UI Setup
function setupLobbyUI() {
  const localPlayButton = document.getElementById("localPlayButton");
  const onlinePlayButton = document.getElementById("onlinePlayButton");
  const createGameButton = document.getElementById("createGameButton");
  const joinGameButton = document.getElementById("joinGameButton");
  const gameCodeInput = document.getElementById("gameCodeInput");
  const backToModeButton = document.getElementById("backToModeButton");
  const onlineOptions = document.getElementById("onlineOptions");
  const lobbyScreen = document.getElementById("lobbyScreen");
  const loadingScreen = document.getElementById("loadingScreen");
  const gameCodeDisplay = document.getElementById("gameCodeDisplay");
  const playerNameScreen = document.getElementById("playerNameScreen");
  const playerNameInput = document.getElementById("playerNameInput");
  const continueNameButton = document.getElementById("continueNameButton");
  const player1WaitingScreen = document.getElementById("player1WaitingScreen");
  const player2ReadyScreen = document.getElementById("player2ReadyScreen");
  const player1StartScreen = document.getElementById("player1StartScreen");
  const readyButton = document.getElementById("readyButton");
  const startGameButtonP1 = document.getElementById("startGameButtonP1");
  const cancelWaitButton = document.getElementById("cancelWaitButton");
  const cancelReadyButton = document.getElementById("cancelReadyButton");

  // Local play
  localPlayButton.addEventListener("click", () => {
    lobbyScreen.classList.add("is-hidden");
    document.querySelector(".page").classList.remove("is-hidden");
    resetGame();
  });

  // Online play
  onlinePlayButton.addEventListener("click", () => {
    onlineOptions.classList.remove("is-hidden");
  });

  backToModeButton.addEventListener("click", () => {
    onlineOptions.classList.add("is-hidden");
    gameCodeDisplay.classList.add("is-hidden");
    playerNameScreen.classList.add("is-hidden");
    player1WaitingScreen.classList.add("is-hidden");
    player2ReadyScreen.classList.add("is-hidden");
    player1StartScreen.classList.add("is-hidden");
    gameCodeInput.value = "";
    playerNameInput.value = "";
  });

  // Create game
  createGameButton.addEventListener("click", async () => {
    try {
      loadingScreen.classList.remove("is-hidden");
      const code = await window.gameRoom.createGame();
      loadingScreen.classList.add("is-hidden");
      
      initializeOnlineGame("player1");
      
      document.getElementById("displayedGameCode").textContent = code;
      playerNameScreen.classList.remove("is-hidden");
      onlineOptions.classList.add("is-hidden");
      playerNameInput.focus();
    } catch (error) {
      alert("Oyun oluşturulamadı. Lütfen tekrar deneyin.");
      loadingScreen.classList.add("is-hidden");
    }
  });

  // Continue after entering name (for both Player 1 and Player 2)
  continueNameButton.addEventListener("click", async () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
      alert("Lütfen adınızı girin");
      return;
    }

    if (localPlayerRole === "player1") {
      // Player 1 flow
      setPlayerName("p1", playerName, true);
      await window.gameRoom.setPlayerName("player1", playerName);
      
      playerNameScreen.classList.add("is-hidden");
      gameCodeDisplay.classList.remove("is-hidden");
      player1WaitingScreen.classList.remove("is-hidden");
      document.getElementById("player1DisplayName").textContent = `Adınız: ${playerName}`;
    } else {
      // Player 2 flow
      setPlayerName("p2", playerName, true);
      await window.gameRoom.setPlayerName("player2", playerName);
      
      playerNameScreen.classList.add("is-hidden");
      player2ReadyScreen.classList.remove("is-hidden");
      document.getElementById("player2DisplayName").textContent = `Adınız: ${playerName}`;
    }
  });

  // Handle Enter key in player name input
  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      continueNameButton.click();
    }
  });

  // Cancel waiting (Player 1)
  cancelWaitButton.addEventListener("click", () => {
    window.gameRoom.leaveGame();
    backToModeButton.click();
  });

  // Player 2 Ready button
  readyButton.addEventListener("click", async () => {
    window.gameRoom.setPlayerReady("player2", true);
    readyButton.disabled = true;
    readyButton.textContent = "Hazırlandı";
  });

  // Cancel ready (Player 2)
  cancelReadyButton.addEventListener("click", () => {
    window.gameRoom.leaveGame();
    backToModeButton.click();
  });

  // Player 1 Start Game button
  startGameButtonP1.addEventListener("click", async () => {
    window.gameRoom.setPlayerReady("player1", true);
    player1StartScreen.classList.add("is-hidden");
    lobbyScreen.classList.add("is-hidden");
    document.querySelector(".page").classList.remove("is-hidden");
    resetGame();
  });

  // Join game
  joinGameButton.addEventListener("click", async () => {
    const code = gameCodeInput.value.trim().toUpperCase();
    if (!code) {
      alert("Lütfen oyun kodunu girin");
      return;
    }
    
    try {
      loadingScreen.classList.remove("is-hidden");
      document.getElementById("loadingMessage").textContent = "Oyuna katılınıyor...";
      await window.gameRoom.joinGame(code);
      loadingScreen.classList.add("is-hidden");
      
      initializeOnlineGame("player2");
      
      playerNameScreen.classList.remove("is-hidden");
      onlineOptions.classList.add("is-hidden");
      playerNameInput.value = "";
      playerNameInput.focus();
    } catch (error) {
      alert("Oyuna katılamadı. Kodu kontrol edin ve tekrar deneyin.");
      console.error("Join error:", error);
      loadingScreen.classList.add("is-hidden");
    }
  });

  // Listen for game state changes
  window.addEventListener("gameUpdate", (event) => {
    const gameData = event.detail;
    
    // Sync player names whenever they're available (for both P1 and P2)
    if (gameData.player1 && gameData.player1.name) {
      setPlayerName("p1", gameData.player1.name, false);
      // Also update the host name display for Player 2's ready screen
      const player1HostNameElement = document.getElementById("player1HostName");
      if (player1HostNameElement) {
        player1HostNameElement.textContent = `Ev Sahibi: ${gameData.player1.name}`;
      }
    }
    if (gameData.player2 && gameData.player2.name) {
      setPlayerName("p2", gameData.player2.name, false);
    }
    
    // Player 1: Watch for Player 2 joining and ready status
    if (!player1WaitingScreen.classList.contains("is-hidden")) {
      if (gameData.player2 && gameData.player2.connected && gameData.player2.name) {
        document.getElementById("waitingForPlayer").style.display = "none";
        
        // Show opponent ready message only when they're ready AND have entered name
        if (gameData.player2.ready) {
          player1WaitingScreen.classList.add("is-hidden");
          player1StartScreen.classList.remove("is-hidden");
          document.getElementById("opponentReadyMessage").textContent = 
            `${gameData.player2.name} hazır! Oyunu başlatabilirsin.`;
        }
      }
    }
  });

  // Hide page initially
  document.querySelector(".page").classList.add("is-hidden");
}

// Wait for DOM to load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupLobbyUI);
} else {
  setupLobbyUI();
}
