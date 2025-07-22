# 🦖 Camera T-Rex Runner

A revolutionary take on Google Chrome's famous offline dinosaur game! Control the T-Rex using your body movements through your camera instead of keyboard inputs. Built with TensorFlow.js for real-time pose detection.

## 🎮 How It Works

1. **Start the game**: Open the page and allow camera access
2. **Get ready**: Stand in front of your camera and make a T-pose to calibrate
3. **Play**:
   - **Jump**: Raise your arms above your shoulders
   - **Duck**: Lower your body (crouch down)
   - **Move left/right**: Lean your body to the sides

The game uses AI-powered pose detection to track your body movements in real-time and translates them into game controls!

## ✨ Features

- **Camera-controlled gameplay**: No keyboard needed, just your body!
- **Real-time pose detection**: Powered by TensorFlow.js and MoveNet
- **Difficulty settings**: Adjustable sensitivity (Easy: 50, Normal: 100, Hard: 150)
- **Score tracking**: Built-in leaderboard system
- **Visual feedback**: See your pose detection in real-time
- **Multiple game versions**: Original HTML5 canvas version and Unity WebGL version
- **Responsive design**: Works on desktop and mobile devices

## 🚀 Quick Start

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Allow camera permissions when prompted
4. Stand back from your camera and make a T-pose to start
5. Move your body to control the T-Rex!

## 🎯 Game Controls

| Body Movement | Game Action |
|---------------|-------------|
| T-pose (arms horizontal) | Calibrate/Start game |
| Raise arms above shoulders | Jump over obstacles |
| Crouch/lower body | Duck under flying pterodactyls |
| Lean left/right | Move T-Rex horizontally |

## 📁 Project Structure

```text
hackaton/
├── index.html              # Main game (HTML5 Canvas version)
├── index2.html            # Unity WebGL version
├── js/
│   ├── main.js            # Game logic and pose detection integration
│   ├── main2.js           # Unity version logic
│   └── game/
│       ├── game.js        # T-Rex runner game engine
│       └── game2.js       # Alternative game version
├── css/                   # Styling
├── common/
│   ├── js/                # TensorFlow.js and dependencies
│   └── embeds/            # AI model files
├── assets/                # Game sprites and images
└── Build/                 # Unity WebGL build files
```

## 🤖 Technology Stack

- **AI/ML**: TensorFlow.js, MoveNet pose detection
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Game Engine**: Custom T-Rex runner (based on Chrome's dino game)
- **3D Graphics**: Three.js, ScatterGL (for pose visualization)
- **Alternative Version**: Unity WebGL

## 🎨 Difficulty Levels

The game offers adjustable difficulty settings that control how sensitive the pose detection is:

- **Easy (50)**: Smaller movements trigger actions
- **Normal (100)**: Balanced sensitivity
- **Hard (150)**: Requires more pronounced movements
- **Custom**: Use +/- buttons to fine-tune

## 🔧 Configuration

The pose detection can be customized in `js/main.js`:

```javascript
const Hackaton = {
  conf: {
    minScore: 0.35,           // Minimum confidence for pose detection
    tPoseCounterLimit: 15,    // Frames needed to confirm T-pose
    jumpThreshold: 150,       // Sensitivity for jump detection
    crouchThreshold: 150,     // Sensitivity for crouch detection
    // ... more settings
  }
}
```

## 🎪 Demo

The game features two versions:

1. **HTML5 Canvas Version** (`index.html`): Classic implementation
2. **Unity WebGL Version** (`index2.html`): Enhanced graphics and effects

## 🏆 Score System

- Scores are automatically saved with difficulty level
- Built-in leaderboard tracks your best performances
- Reset scores anytime with the reset button

## 🔒 Privacy

- All pose detection runs locally in your browser
- No video data is sent to external servers
- Camera access is only used for real-time pose detection

## 🎯 Hackathon Project

This project was created as a hackathon entry, showcasing the creative potential of combining classic games with modern AI technology. It demonstrates how pose detection can create engaging, physical gaming experiences in web browsers.

## 🙏 Credits

- Based on [JS AI Body Tracker](https://github.com/szczyglis-dev/js-ai-body-tracker) by Marcin Szczyglinski
- Original T-Rex game concept by Google Chrome team
- TensorFlow.js and MoveNet by Google

---

### Ready to run? Strike a T-pose and let's go! 🦖
