#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080
os.chdir('client')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🐱⚡ Litecat Token Server Running!                       ║
║                                                            ║
║   Open your browser and visit:                            ║
║   http://localhost:{PORT}                                     ║
║                                                            ║
║   Press Ctrl+C to stop the server                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)
    httpd.serve_forever()