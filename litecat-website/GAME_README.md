# LIGHTCAT Runner 3D - Professional Game Setup

## Overview
LIGHTCAT Runner 3D is a professional-grade WebGL game built with Three.js, featuring:
- Custom 3D character based on the LIGHTCAT logo (black cat with yellow outline)
- Mario-style physics and controls
- Cyberpunk environment with dynamic lighting
- Lightning collection mechanics
- Professional visual effects and animations

## Features

### 🎮 Professional Controls (Mario 3D Style)
- **WASD/Arrow Keys** - Movement with smooth acceleration
- **Space/W/Up** - Jump with squash & stretch animation
- **Shift** - Sprint mode
- **Mouse** - Camera rotation (click to lock pointer)

### 🐱 Custom LIGHTCAT Character
- Based on the actual logo design
- Black silhouette with glowing yellow outline
- Half-closed eyes for cool expression
- Dynamic animations (running, jumping, idle)
- Particle effects around character

### ⚡ Game Mechanics
- Collect falling lightning bolts in 60 seconds
- Professional collection effects (ring burst, particles, light beam)
- Tier system:
  - Bronze: 10+ ⚡ (5,000 tokens)
  - Silver: 25+ ⚡ (15,000 tokens)
  - Gold: 50+ ⚡ (50,000 tokens)
  - Platinum: 75+ ⚡ (100,000 tokens)

### 🌆 Professional Environment
- Custom shader-based ground with animated grid
- Cyberpunk cityscape with glowing windows
- Dynamic lightning strikes in the distance
- Atmospheric particle system
- Scanning beam effects
- Fog for depth perception

## Technical Implementation

### Architecture
```
/client/js/game/
├── main.js                 # Game initialization and state management
├── SimpleGame.js          # Core game loop and physics
├── LightCatCharacter.js   # Custom character model and animations
├── ProEnvironment.js      # Professional environment with shaders
├── LightningRain.js       # Lightning collectibles system
├── GameUI.js              # UI overlay and tier management
└── SoundManager.js        # Audio system
```

### Technologies Used
- **Three.js** - 3D graphics engine
- **WebGL Shaders** - Custom visual effects
- **ES6 Modules** - Modern JavaScript architecture
- **Pointer Lock API** - Immersive controls
- **Web Audio API** - Dynamic sound generation

### Professional Features
1. **Custom Shaders**
   - Animated ground with wave displacement
   - Particle system with vertex shaders
   - Dynamic grid effects

2. **Physics System**
   - Gravity and jump mechanics
   - Sprint and acceleration
   - Air and ground drag
   - Smooth camera following

3. **Visual Effects**
   - Lightning collection burst
   - Screen flash on collection
   - Glow and outline effects
   - Particle systems

4. **Performance Optimizations**
   - Efficient particle management
   - LOD for distant objects
   - Texture atlasing
   - Frame rate limiting

## Installation for Blender Integration

To convert the LIGHTCAT logo to a full 3D model using Blender MCP:

### Prerequisites
```bash
# Install Blender 3.0+
# Install Python 3.10+
# Install uv package manager
pip install uv
```

### Blender MCP Setup
1. Download `addon.py` from https://github.com/ahujasid/blender-mcp
2. In Blender: Edit → Preferences → Add-ons → Install
3. Select the addon.py file
4. Enable "Interface: Blender MCP"

### Logo to 3D Workflow
1. **Convert PNG to SVG**
   ```bash
   # Use online converter or Illustrator
   # Set to Black and White Logo preset
   ```

2. **Import in Blender**
   - File → Import → Scalable Vector Graphics (.svg)
   - Add Solidify modifier for depth
   - Apply subdivision surface

3. **Export for Three.js**
   - Export as GLTF 2.0
   - Optimize with Draco compression
   - Place in `/client/models/`

## Running the Game

1. **Start the server**
   ```bash
   cd litecat-website
   python3 -m http.server 8080 --directory client
   ```

2. **Access the game**
   - Main site: http://localhost:8080/
   - Direct game: http://localhost:8080/game.html

## Future Enhancements

### Planned Features
- [ ] Multiplayer support with WebRTC
- [ ] Leaderboard system
- [ ] Power-ups (double points, magnet, shield)
- [ ] Different environments (day/night cycle)
- [ ] Character customization
- [ ] Achievement system

### Graphics Improvements
- [ ] Post-processing effects (bloom, DOF)
- [ ] Ray-traced reflections
- [ ] Volumetric lighting
- [ ] Advanced particle systems

### Integration Ideas
- [ ] NFT rewards for high scores
- [ ] RGB Protocol token integration
- [ ] Social sharing with screenshots
- [ ] Tournament mode

## Credits

- **Three.js** - 3D graphics library
- **Mario 3D Controller** - Control system inspiration
- **LIGHTCAT Team** - Logo and branding
- **RGB Protocol** - Token platform

## License

MIT License - See LICENSE file for details