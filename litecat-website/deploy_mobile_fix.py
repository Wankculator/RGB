#!/usr/bin/env python3
"""
Deploy Mobile Fix to LIGHTCAT Server
This script deploys the mobile visibility fix using multiple connection methods
"""

import os
import sys
import subprocess
import base64
from pathlib import Path

# Configuration
VPS_IP = "147.93.105.138"
VPS_USER = "root"
REMOTE_DIR = "/var/www/rgblightcat"

# Colors for output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
RED = '\033[0;31m'
NC = '\033[0m'

def print_colored(message, color=NC):
    print(f"{color}{message}{NC}")

def read_file(filepath):
    """Read file content"""
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except Exception as e:
        print_colored(f"Error reading {filepath}: {e}", RED)
        return None

def execute_ssh_command(command, ignore_errors=False):
    """Execute SSH command with various fallback methods"""
    ssh_options = [
        "-o StrictHostKeyChecking=no",
        "-o UserKnownHostsFile=/dev/null",
        "-o ConnectTimeout=10",
        "-o PasswordAuthentication=no"
    ]
    
    # Try standard SSH
    full_command = ["ssh"] + ssh_options + [f"{VPS_USER}@{VPS_IP}", command]
    
    try:
        result = subprocess.run(full_command, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 or ignore_errors:
            return result.stdout
        else:
            print_colored(f"SSH command failed: {result.stderr}", YELLOW)
            return None
    except subprocess.TimeoutExpired:
        print_colored("SSH command timed out", YELLOW)
        return None
    except Exception as e:
        print_colored(f"SSH error: {e}", YELLOW)
        return None

def deploy_file_content(remote_path, content):
    """Deploy file content to server using base64 encoding"""
    if not content:
        return False
    
    # Encode content to base64 to avoid shell escaping issues
    encoded_content = base64.b64encode(content.encode()).decode()
    
    # Create directory if needed
    dir_path = os.path.dirname(remote_path)
    execute_ssh_command(f"mkdir -p {dir_path}", ignore_errors=True)
    
    # Deploy file using base64
    command = f"echo '{encoded_content}' | base64 -d > {remote_path}"
    result = execute_ssh_command(command)
    
    if result is not None:
        print_colored(f"✅ Deployed: {remote_path}", GREEN)
        return True
    else:
        print_colored(f"❌ Failed to deploy: {remote_path}", RED)
        return False

def update_index_html():
    """Update index.html to include mobile fix files"""
    print_colored("🔧 Updating index.html...", BLUE)
    
    # Backup command
    execute_ssh_command(f"cp {REMOTE_DIR}/client/index.html {REMOTE_DIR}/client/index.html.backup-mobile-fix", ignore_errors=True)
    
    # Add CSS reference
    css_check = execute_ssh_command(f"grep -q 'ultimate-mobile-fix.css' {REMOTE_DIR}/client/index.html && echo 'exists' || echo 'not exists'")
    if css_check and 'not exists' in css_check:
        execute_ssh_command(f"sed -i '/<\\/head>/i \\    <link rel=\"stylesheet\" href=\"css/ultimate-mobile-fix.css\">' {REMOTE_DIR}/client/index.html")
        print_colored("✅ Added mobile fix CSS reference", GREEN)
    else:
        print_colored("CSS reference already exists", YELLOW)
    
    # Add JS reference
    js_check = execute_ssh_command(f"grep -q 'ultimate-mobile-fix.js' {REMOTE_DIR}/client/index.html && echo 'exists' || echo 'not exists'")
    if js_check and 'not exists' in js_check:
        execute_ssh_command(f"sed -i '/<\\/body>/i \\    <script src=\"js/ultimate-mobile-fix.js\"></script>' {REMOTE_DIR}/client/index.html")
        print_colored("✅ Added mobile fix JS reference", GREEN)
    else:
        print_colored("JS reference already exists", YELLOW)

def create_deployment_script():
    """Create a shell script on the server for manual deployment"""
    script_content = '''#!/bin/bash
# Mobile Fix Deployment Script
# Run this on the server if automatic deployment fails

cd /var/www/rgblightcat

# Create CSS file
cat > client/css/ultimate-mobile-fix.css << 'EOF'
''' + read_file('client/css/ultimate-mobile-fix.css') + '''
EOF

# Create JS file
cat > client/js/ultimate-mobile-fix.js << 'EOF'
''' + read_file('client/js/ultimate-mobile-fix.js') + '''
EOF

# Update index.html
cp client/index.html client/index.html.backup-mobile-fix

# Add CSS reference if not exists
grep -q "ultimate-mobile-fix.css" client/index.html || sed -i '/<\\/head>/i \\    <link rel="stylesheet" href="css/ultimate-mobile-fix.css">' client/index.html

# Add JS reference if not exists
grep -q "ultimate-mobile-fix.js" client/index.html || sed -i '/<\\/body>/i \\    <script src="js/ultimate-mobile-fix.js"></script>' client/index.html

# Restart services
pm2 restart lightcat-ui
systemctl reload nginx

echo "Mobile fix deployed successfully!"
'''
    
    # Save script locally
    with open('mobile-fix-manual.sh', 'w') as f:
        f.write(script_content)
    
    print_colored("Created mobile-fix-manual.sh for manual deployment", YELLOW)
    return script_content

def main():
    print_colored("📱 LIGHTCAT Mobile Fix Deployment", BLUE)
    print_colored(f"Target: {VPS_USER}@{VPS_IP}", YELLOW)
    print()
    
    # Check if files exist
    css_file = 'client/css/ultimate-mobile-fix.css'
    js_file = 'client/js/ultimate-mobile-fix.js'
    
    if not os.path.exists(css_file) or not os.path.exists(js_file):
        print_colored("❌ Mobile fix files not found!", RED)
        sys.exit(1)
    
    # Read file contents
    css_content = read_file(css_file)
    js_content = read_file(js_file)
    
    if not css_content or not js_content:
        print_colored("❌ Failed to read mobile fix files!", RED)
        sys.exit(1)
    
    # Test SSH connection
    print_colored("🔍 Testing SSH connection...", BLUE)
    test_result = execute_ssh_command("echo 'Connection successful'")
    
    if test_result and 'Connection successful' in test_result:
        print_colored("✅ SSH connection successful", GREEN)
        
        # Deploy files
        print_colored("📤 Deploying mobile fix files...", BLUE)
        css_deployed = deploy_file_content(f"{REMOTE_DIR}/client/css/ultimate-mobile-fix.css", css_content)
        js_deployed = deploy_file_content(f"{REMOTE_DIR}/client/js/ultimate-mobile-fix.js", js_content)
        
        if css_deployed and js_deployed:
            # Update index.html
            update_index_html()
            
            # Restart services
            print_colored("🔄 Restarting services...", BLUE)
            execute_ssh_command("pm2 restart lightcat-ui", ignore_errors=True)
            execute_ssh_command("systemctl reload nginx", ignore_errors=True)
            
            print_colored("🎉 Mobile fix deployment complete!", GREEN)
            print_colored("Test at: https://rgblightcat.com on a mobile device", YELLOW)
        else:
            print_colored("⚠️  Some files failed to deploy", YELLOW)
    else:
        print_colored("❌ SSH connection failed", RED)
        print_colored("Creating manual deployment script...", YELLOW)
        
        # Create manual deployment script
        script_content = create_deployment_script()
        
        print_colored("\n📋 Manual deployment instructions:", BLUE)
        print("1. Copy mobile-fix-manual.sh to the server")
        print("2. SSH into the server: ssh root@147.93.105.138")
        print("3. Run: bash mobile-fix-manual.sh")
        print("\nOr copy and paste the following commands:")
        print("-" * 50)
        print(script_content)
        print("-" * 50)

if __name__ == "__main__":
    main()