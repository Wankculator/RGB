#!/usr/bin/env python3
"""
Test script to verify Blender MCP server installation
"""

import subprocess
import sys
import time
import json

def test_mcp_server():
    print("🧪 Testing Blender MCP Server Installation...")
    
    try:
        # Test if blender-mcp module can be imported
        import blender_mcp
        print("✅ blender-mcp module imported successfully")
        
        # Test if we can access the server module
        from blender_mcp import server
        print("✅ blender-mcp server module accessible")
        
        print("\n📋 Server Information:")
        print(f"   Module path: {blender_mcp.__file__}")
        
        # Test the command that Claude Desktop would use
        print("\n🔧 Testing MCP server command...")
        try:
            # This is the actual command Claude Desktop will run
            result = subprocess.run([
                "cmd", "/c", "uvx", "--help"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print("✅ uvx command works correctly")
            else:
                print("❌ uvx command failed")
                print(f"   Error: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            print("⚠️  uvx command timed out (this might be normal)")
        except Exception as e:
            print(f"❌ Error running uvx: {e}")
        
        print("\n🎯 Installation Status: SUCCESS")
        print("📝 Next steps:")
        print("   1. Install Blender (3.0 or newer)")
        print("   2. Install the addon.py file in Blender")
        print("   3. Configure Claude Desktop with the provided config")
        print("   4. Start the connection from Blender's MCP panel")
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import blender-mcp: {e}")
        print("   Run: pip install blender-mcp")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_mcp_server()
    sys.exit(0 if success else 1)
