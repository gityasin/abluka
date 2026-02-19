# Firebase Setup for Online Multiplayer

## Quick Start - Use Demo Firebase Project

A demo Firebase project is pre-configured in `firebase-game.js`. The game should work out of the box for testing!

## Custom Firebase Setup

To use your own Firebase project:

### 1. Create a Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com)
- Click "Add project" and follow the steps
- Name it something like "abluka-game"

### 2. Set Up Realtime Database
- In Firebase Console, go to **Build** → **Realtime Database**
- Click **Create Database**
- Choose region: `europe-west1` (or your preferred region)
- Start in **Test Mode** (for development only)

### 3. Get Your Config
- Go to **Project Settings** (gear icon)
- Scroll down to "Your apps"
- Click the Web icon `</>`
- Copy the Firebase config object

### 4. Update config.js (Secure Method)
**Important**: Your API key should NEVER be committed to GitHub!

1. Open `config.js` in this folder (it's in `.gitignore` so won't be committed)
2. Replace the config object with your credentials from Step 3:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  databaseURL: "YOUR_DATABASE_URL",
  appId: "YOUR_APP_ID"
};
```

**The config.js file is automatically ignored by git** (listed in `.gitignore`), so your API key is safe!

### 5. Share with Others (GitHub)
- Keep `config.example.js` in your GitHub repo
- When someone clones the project, they just copy `config.example.js` → `config.js` and add their own Firebase credentials
- The actual `config.js` will never be in version control

### 6. Security Rules (Important for Production)

Use these security rules to prevent abuse and exploitation:

```json
{
  "rules": {
    "games": {
      "$gameCode": {
        ".read": "data.exists()",
        ".write": "!data.exists() || root.child('games').child($gameCode).exists()",
        ".validate": "$gameCode.matches(/^[A-Z0-9]{6}$/)",
        "boardState": {
          ".write": "root.child('games').child($gameCode).exists()"
        },
        "phase": {
          ".write": "root.child('games').child($gameCode).exists()",
          ".validate": "newData.val() === 'move' || newData.val() === 'block'"
        },
        "currentPlayer": {
          ".write": "root.child('games').child($gameCode).exists()",
          ".validate": "newData.val() === 'p1' || newData.val() === 'p2'"
        },
        "gameOver": {
          ".write": "root.child('games').child($gameCode).exists()",
          ".validate": "newData.isBoolean()"
        },
        "code": {
          ".validate": "newData.isString() && newData.val().matches(/^[A-Z0-9]{6}$/)"
        }
      }
    }
  }
}
```

**What these rules do:**
- ✅ Only allow reads for games that exist
- ✅ Only allow writes to create new games or update existing ones
- ✅ Validate that game codes are exactly 6 uppercase alphanumeric characters
- ✅ Allow partial updates (adding player2, syncing moves, etc.)
- ✅ Validate currentPlayer is either 'p1' or 'p2'
- ✅ Validate gameOver is boolean

## How It Works

1. **Create Game** → Player 1 generates a 6-character code
2. **Join Game** → Player 2 enters the code
3. **Move Sync** → All moves sync in real-time via Firebase
4. **Auto-cleanup** → Game data is deleted when players leave

## Troubleshooting

- **"Connection refused"** → Check your Firebase Database URL
- **No moves syncing** → Ensure Database Rules allow read/write in test mode
- **Code not found** → Make sure player is using correct uppercase code
- **Offline icon** → Firebase not loading - check browser console

## File Structure

```
abluka/
├── config.js              ← Your Firebase credentials (NOT in Git)
├── config.example.js      ← Template for others to copy
├── .gitignore             ← Prevents config.js from being committed
├── index.html
├── main.js
├── firebase-game.js
├── styles.css
└── README.md
```
