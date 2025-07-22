# 🎨 Complete Blender MCP Setup & Testing Guide

## 🚀 Current Status: MCP Server Installed ✅

The Python MCP server is installed and ready. Now we need to complete the setup.

## 📋 Required Steps to Test

### 1. Install Blender (if not already installed)
Download from: https://www.blender.org/download/
- Minimum version: Blender 3.0
- Recommended: Latest LTS version

### 2. Install the Blender Addon
1. **Download completed**: `addon.py` is ready in this directory
2. **Install in Blender**:
   - Open Blender
   - Go to `Edit` → `Preferences` → `Add-ons`
   - Click `Install...`
   - Select: `c:\Users\sk84l\Downloads\RGB LIGHT CAT\blender-mcp\addon.py`
   - **Enable** the addon by checking the box next to "Interface: Blender MCP"

### 3. Configure Claude Desktop
Your config file is ready: `claude_desktop_config.json`

**Copy it to Claude Desktop location**:
```powershell
# Run this command in PowerShell:
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"
Copy-Item "claude_desktop_config.json" "$env:APPDATA\Claude\claude_desktop_config.json"
```

### 4. Test the Connection

#### A. Start Blender with MCP Addon
1. Open Blender
2. Press `N` to show the sidebar
3. Find the **"BlenderMCP"** tab
4. Click **"Connect to Claude"**
5. You should see "Server started" message

#### B. Open Claude Desktop
1. Start Claude Desktop
2. Look for a **🔨 hammer icon** in the interface
3. This indicates Blender MCP tools are available

#### C. Test with Simple Commands
Try these commands in Claude:

**Basic Test**:
```
"Get information about the current Blender scene"
```

**Create Objects**:
```
"Create a red cube in the center of the scene"
```

**Advanced Test**:
```
"Create a simple scene with a blue sphere, green cube, and yellow cone arranged in a triangle"
```

**Material Test**:
```
"Make the default cube metallic gold with high reflectivity"
```

## 🔧 Testing Commands You Can Try

### Beginner Commands:
- "Delete the default cube"
- "Create a sphere at position (2, 0, 0)"
- "Add a material to the selected object and make it red"
- "Get information about all objects in the scene"

### Intermediate Commands:
- "Create a low-poly tree using basic shapes"
- "Set up basic three-point lighting"
- "Create a simple room with walls, floor, and ceiling"
- "Add a camera and point it at the scene"

### Advanced Commands:
- "Create a medieval castle scene with towers and walls"
- "Download a rock texture from Poly Haven and apply it to the cube"
- "Generate a 3D model of a chair using Hyper3D"
- "Take a screenshot of the current viewport"

## ⚠️ Troubleshooting

### Connection Issues:
- **Restart both** Claude Desktop and Blender
- Check that only **one MCP server** is running
- Verify the addon is **enabled** in Blender

### Command Failures:
- Start with **simple commands** first
- **Save your work** before complex operations
- Break complex requests into **smaller steps**

### First Command Timeout:
- This is normal - **try the command again**
- Subsequent commands should work fine

## 🎯 What You Can Achieve

Once working, you'll be able to:
- **AI-Powered 3D Modeling**: Create complex scenes with natural language
- **Automatic Asset Integration**: Download textures, models, HDRIs
- **Code Generation**: Generate and execute Python scripts in Blender
- **Scene Analysis**: Get detailed information about your 3D scenes
- **Material Magic**: Apply realistic materials and lighting setups

## 📞 Ready to Test?

1. **Install Blender** (if needed)
2. **Install the addon** (`addon.py`)
3. **Copy the config** to Claude Desktop
4. **Restart Claude Desktop**
5. **Open both applications**
6. **Start the connection** in Blender
7. **Try the test commands** above!

---

**🎉 You're ready to revolutionize your 3D workflow with AI!**
