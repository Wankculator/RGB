const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { logger } = require('./utils/logger');
const config = require('../config');
const supabaseService = require('./services/supabaseService');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // sessionId -> WebSocket
    this.rooms = new Map(); // roomName -> Set of sessionIds
    this.stats = {
      connections: 0,
      messages: 0,
      errors: 0
    };
    
    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('WebSocket server initialized');
  }

  verifyClient(info, cb) {
    const token = this.extractToken(info.req);
    
    if (!token) {
      // Allow connection without token for public updates
      cb(true);
      return;
    }
    
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret);
      info.req.user = decoded;
      cb(true);
    } catch (error) {
      cb(false, 401, 'Unauthorized');
    }
  }

  extractToken(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    
    // Check query params as fallback
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('token');
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = this.generateSessionId();
      const clientInfo = {
        sessionId,
        user: req.user,
        ip: req.socket.remoteAddress,
        connectedAt: new Date()
      };
      
      this.clients.set(sessionId, ws);
      ws.sessionId = sessionId;
      ws.clientInfo = clientInfo;
      
      this.stats.connections++;
      logger.info('WebSocket client connected', { sessionId, ip: clientInfo.ip });
      
      // Send welcome message
      this.sendToClient(ws, {
        type: 'welcome',
        data: {
          sessionId,
          timestamp: new Date().toISOString(),
          features: ['sales', 'game', 'leaderboard', 'notifications']
        }
      });
      
      // Join default rooms
      this.joinRoom(sessionId, 'public');
      
      // Handle messages
      ws.on('message', (message) => this.handleMessage(ws, message));
      
      // Handle close
      ws.on('close', () => this.handleDisconnect(sessionId));
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', { sessionId, error: error.message });
        this.stats.errors++;
      });
      
      // Handle pong
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      this.stats.messages++;
      
      logger.debug('WebSocket message received', { 
        sessionId: ws.sessionId, 
        type: data.type 
      });
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(ws, data);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(ws, data);
          break;
          
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;
          
        case 'game:score':
          this.handleGameScore(ws, data);
          break;
          
        case 'purchase:status':
          this.handlePurchaseStatus(ws, data);
          break;
          
        default:
          this.sendToClient(ws, { 
            type: 'error', 
            error: 'Unknown message type' 
          });
      }
    } catch (error) {
      logger.error('Invalid WebSocket message', { error: error.message });
      this.sendToClient(ws, { 
        type: 'error', 
        error: 'Invalid message format' 
      });
    }
  }

  handleSubscribe(ws, data) {
    const { channel } = data;
    const validChannels = ['sales', 'game', 'leaderboard', 'notifications'];
    
    if (!validChannels.includes(channel)) {
      this.sendToClient(ws, { 
        type: 'error', 
        error: 'Invalid channel' 
      });
      return;
    }
    
    this.joinRoom(ws.sessionId, channel);
    
    this.sendToClient(ws, {
      type: 'subscribed',
      channel,
      message: `Subscribed to ${channel} updates`
    });
    
    // Send initial data based on channel
    this.sendInitialData(ws, channel);
  }

  handleUnsubscribe(ws, data) {
    const { channel } = data;
    
    this.leaveRoom(ws.sessionId, channel);
    
    this.sendToClient(ws, {
      type: 'unsubscribed',
      channel,
      message: `Unsubscribed from ${channel} updates`
    });
  }

  async handleGameScore(ws, data) {
    if (!ws.clientInfo.user) {
      this.sendToClient(ws, { 
        type: 'error', 
        error: 'Authentication required' 
      });
      return;
    }
    
    // Broadcast to game room
    this.broadcast('game', {
      type: 'game:new_score',
      data: {
        score: data.score,
        player: ws.clientInfo.user.id,
        timestamp: new Date().toISOString()
      }
    });
  }

  async handlePurchaseStatus(ws, data) {
    const { invoiceId } = data;
    
    if (!invoiceId) {
      this.sendToClient(ws, { 
        type: 'error', 
        error: 'Invoice ID required' 
      });
      return;
    }
    
    // Subscribe to specific purchase updates
    this.joinRoom(ws.sessionId, `purchase:${invoiceId}`);
    
    // Send current status
    try {
      const purchase = await supabaseService.getPurchaseByInvoice(invoiceId);
      
      this.sendToClient(ws, {
        type: 'purchase:status',
        data: {
          invoiceId,
          status: purchase?.status || 'not_found',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to get purchase status', { error });
    }
  }

  async sendInitialData(ws, channel) {
    try {
      switch (channel) {
        case 'sales':
          const salesStats = await supabaseService.getSalesStatistics();
          this.sendToClient(ws, {
            type: 'sales:snapshot',
            data: salesStats
          });
          break;
          
        case 'leaderboard':
          const leaderboard = await supabaseService.getLeaderboard({ limit: 10 });
          this.sendToClient(ws, {
            type: 'leaderboard:snapshot',
            data: leaderboard
          });
          break;
      }
    } catch (error) {
      logger.error('Failed to send initial data', { channel, error });
    }
  }

  handleDisconnect(sessionId) {
    const ws = this.clients.get(sessionId);
    if (!ws) return;
    
    // Leave all rooms
    for (const [roomName, sessions] of this.rooms.entries()) {
      sessions.delete(sessionId);
    }
    
    this.clients.delete(sessionId);
    this.stats.connections--;
    
    logger.info('WebSocket client disconnected', { sessionId });
  }

  // Broadcasting methods
  broadcast(room, message) {
    const sessions = this.rooms.get(room);
    if (!sessions) return;
    
    let sent = 0;
    for (const sessionId of sessions) {
      const ws = this.clients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
        sent++;
      }
    }
    
    logger.debug('Broadcast sent', { room, recipients: sent });
  }

  broadcastSalesUpdate(data) {
    this.broadcast('sales', {
      type: 'sales:update',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  }

  broadcastGameUpdate(data) {
    this.broadcast('game', {
      type: 'game:update',
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  }

  broadcastPurchaseUpdate(invoiceId, status) {
    this.broadcast(`purchase:${invoiceId}`, {
      type: 'purchase:update',
      data: {
        invoiceId,
        status,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Helper methods
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  joinRoom(sessionId, room) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(sessionId);
  }

  leaveRoom(sessionId, room) {
    const sessions = this.rooms.get(room);
    if (sessions) {
      sessions.delete(sessionId);
    }
  }

  generateSessionId() {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Heartbeat to detect disconnected clients
  startHeartbeat() {
    const interval = 30000; // 30 seconds
    
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, interval);
  }

  // Get server stats
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.clients.size,
      rooms: Array.from(this.rooms.entries()).map(([name, sessions]) => ({
        name,
        subscribers: sessions.size
      }))
    };
  }
}

module.exports = WebSocketServer;