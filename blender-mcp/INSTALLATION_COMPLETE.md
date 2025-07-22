# 🎨 Blender MCP Installation Guide

## ✅ Installation Complete!

The Blender MCP (Model Context Protocol) has been successfully installed on your system.

## 📁 Files Installed

- **Blender Addon**: `addon.py` (downloaded to current directory)
- **Python Package**: `blender-mcp` (installed via pip)
- **Claude Config**: `claude_desktop_config.json` (template created)

## 🔧 Next Steps

### 1. Install Blender Addon
1. Open Blender 3.0 or newer
2. Go to `Edit` > `Preferences` > `Add-ons`
3. Click `Install...` and select the `addon.py` file from:
   ```
   c:\Users\sk84l\Downloads\RGB LIGHT CAT\blender-mcp\addon.py
   ```
4. Enable the addon by checking the box next to "Interface: Blender MCP"

### 2. Configure Claude Desktop (if installed)
1. Copy the configuration to Claude Desktop:
   ```powershell
   Copy-Item "c:\Users\sk84l\Downloads\RGB LIGHT CAT\blender-mcp\claude_desktop_config.json" "$env:APPDATA\Claude\claude_desktop_config.json"
   ```

2. Or manually copy this configuration to `%APPDATA%\Claude\claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "blender": {
         "command": "cmd",
         "args": [
           "/c",
           "uvx",
           "blender-mcp"
         ]
       }
     }
   }
   ```

### 3. Set up Cursor Integration (Alternative)
If you're using Cursor instead of Claude Desktop:

1. Go to Settings > MCP
2. Add a new server with this configuration:
   ```json
   {
     "mcpServers": {
       "blender": {
         "command": "cmd",
         "args": [
           "/c",
           "uvx",
           "blender-mcp"
         ]
       }
     }
   }
   ```

## 🚀 Usage Instructions

### Starting the Connection
1. Open Blender
2. In the 3D View sidebar (press `N` if not visible)
3. Find the "BlenderMCP" tab
4. Optional: Turn on Poly Haven checkbox for assets
5. Click "Connect to Claude"

### Using with Claude/Cursor
Once configured, you'll see a hammer icon with Blender MCP tools.

### Example Commands
- "Create a low poly dungeon scene with a dragon"
- "Make this object red and metallic"
- "Create a sphere and place it above the cube"
- "Add studio lighting to the scene"
- "Point the camera at the scene and make it isometric"

## 🎯 Features Available
- ✅ Object creation, modification, and deletion
- ✅ Material and color application
- ✅ Scene inspection and information
- ✅ Python code execution in Blender
- ✅ Poly Haven asset integration
- ✅ Hyper3D model generation
- ✅ Viewport screenshots
- ✅ Sketchfab model downloads

## ⚠️ Important Notes
- Only run ONE instance of the MCP server (either Claude or Cursor, not both)
- Always save your Blender work before using code execution features
- The system allows arbitrary Python code execution - use with caution
- First command might timeout, but subsequent ones should work fine

## 🔍 Troubleshooting
- **Connection issues**: Restart both Claude/Cursor and Blender server
- **Timeout errors**: Break complex requests into smaller steps
- **Installation issues**: Ensure UV package manager is properly installed

## 📚 Additional Resources
- [Video Tutorial](https://www.youtube.com/watch?v=lCyQ717DuzQ)
- [Claude Setup Video](https://www.youtube.com/watch?v=neoK_WMq92g)
- [Cursor Setup Video](https://www.youtube.com/watch?v=wgWsJshecac)
- [GitHub Repository](https://github.com/ahujasid/blender-mcp)

## 🎉 Ready to Use!
Your Blender MCP installation is complete. Follow the next steps above to start using AI-powered 3D modeling with Claude or Cursor!
