#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index-pro.html'
        elif self.path == '/scripts/app.js':
            self.path = '/scripts/app-pro.js'
        return super().do_GET()

os.chdir('client')

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Professional version available at: http://localhost:{PORT}/")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()