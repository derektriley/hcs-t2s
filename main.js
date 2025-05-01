const { app, BrowserWindow, nativeImage, ipcMain } = require('electron')
const path = require('path')
const HederaClient = require('./hedera-client')
const fs = require('fs')
const ElevenLabsTTS = require('./eleven-labs-tts')

// Set application name
app.name = 'Message Display';

// Try to load environment variables
let hederaAccountId = process.env.HEDERA_ACCOUNT_ID;
let hederaPrivateKey = process.env.HEDERA_PRIVATE_KEY;
let hederaTopicId = process.env.HEDERA_TOPIC_ID;
let hederaNetwork = process.env.HEDERA_NETWORK || 'testnet';
let hederaCustomEndpoint = process.env.HEDERA_CUSTOM_ENDPOINT;
let hederaCustomMirrorEndpoint = process.env.HEDERA_CUSTOM_MIRROR_ENDPOINT;

// Try to load from .env file if not in environment
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    const envConfig = require('dotenv').config().parsed;
    if (envConfig) {
      hederaAccountId = hederaAccountId || envConfig.HEDERA_ACCOUNT_ID;
      hederaPrivateKey = hederaPrivateKey || envConfig.HEDERA_PRIVATE_KEY;
      hederaTopicId = hederaTopicId || envConfig.HEDERA_TOPIC_ID;
      hederaNetwork = envConfig.HEDERA_NETWORK || hederaNetwork;
      hederaCustomEndpoint = hederaCustomEndpoint || envConfig.HEDERA_CUSTOM_ENDPOINT;
      hederaCustomMirrorEndpoint = hederaCustomMirrorEndpoint || envConfig.HEDERA_CUSTOM_MIRROR_ENDPOINT;
    }
  }
} catch (error) {
  console.error('Error loading .env file:', error);
}

// Initialize Hedera client
const hederaClient = new HederaClient();
let mainWindow;
let dashboardWindow;

// Keep track of messages
const messageHistory = [];
let messageQueue = [];

// Initialize the TTS service
const ttsService = new ElevenLabsTTS(process.env.ELEVEN_LABS_API_KEY);

// Create the display window
const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    backgroundColor: '#00FF0000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false // Prevent throttling when in background
    },
    focusable: true,
    skipTaskbar: false, // Make sure the window appears in taskbar/dock
    alwaysOnTop: true, // Keep overlay on top by default
    show: true,
    title: 'Message Display',
    icon: path.join(__dirname, 'assets/hedera.png')
  })
  
  // Make sure the app shows in the dock on macOS
  if (process.platform === 'darwin') {
    app.dock.show();
  }
  
  // Prevent the window from being garbage collected
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  // Continue rendering even when the app is not focused
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false)
  
  // Create the dashboard window
  createDashboardWindow();

  // Initialize Hedera client if topic ID is available
  initializeHedera();
}

// Create the dashboard window
const createDashboardWindow = () => {
  dashboardWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: true,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
    },
    title: 'Streamer Dashboard',
    icon: path.join(__dirname, 'assets/hedera.png'),
    minWidth: 600,
    minHeight: 400
  });
  
  // Load the dashboard.html file
  dashboardWindow.loadFile(path.join(__dirname, 'dashboard.html'));
  
  // Remove menu bar
  dashboardWindow.setMenuBarVisibility(false);
  
  // Update queue count initially
  dashboardWindow.webContents.on('did-finish-load', () => {
    dashboardWindow.webContents.send('queue-update', messageQueue.length);
  });

  // Handle window close event
  dashboardWindow.on('closed', () => {
    // Close the main window if it exists
    if (mainWindow) {
      mainWindow.close();
    }
    // Quit the application
    app.quit();
  });
}

// Initialize Hedera client and subscribe to topic
function initializeHedera() {
  // Check if we have a topic ID - that's the minimum requirement
  if (!hederaTopicId) {
    const status = {
      connected: false,
      error: 'No topic ID specified',
      network: hederaCustomEndpoint ? 'custom' : hederaNetwork,
      readOnly: true
    };
    mainWindow.webContents.send('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
    console.log('No topic ID specified. Will not subscribe to any topics.');
    return;
  }

  // Initialize client with whatever credentials we have (can be null for read-only)
  const customEndpoint = hederaCustomEndpoint || null;
  console.log("Network configuration:", {
    network: hederaNetwork,
    customEndpoint: customEndpoint,
    customMirrorEndpoint: hederaCustomMirrorEndpoint || null,
    topicId: hederaTopicId,
    hasCredentials: !!(hederaAccountId && hederaPrivateKey)
  });
  
  const success = hederaClient.init(
    hederaAccountId,
    hederaPrivateKey,
    hederaNetwork,
    hederaTopicId,
    customEndpoint
  );

  if (success) {
    // Subscribe to the topic
    hederaClient.subscribeToTopic((message) => {
      console.log('Received message:', message);
      
      // Only forward message objects with name and message fields
      if (typeof message === 'object' && message.name && message.message) {
        // Add to message queue and history
        messageQueue.push(message);
        messageHistory.push({
          ...message,
          timestamp: new Date()
        });
        
        // Send to display window
        mainWindow.webContents.send('hcs-message', message);
        
        // Send to dashboard window
        if (dashboardWindow) {
          dashboardWindow.webContents.send('hcs-message', message);
          dashboardWindow.webContents.send('queue-update', messageQueue.length);
        }
      } else if (typeof message === 'string') {
        // Try to parse as JSON if it's a string
        try {
          const parsedMessage = JSON.parse(message);
          if (parsedMessage.name && parsedMessage.message) {
            // Add to message queue and history
            messageQueue.push(parsedMessage);
            messageHistory.push({
              ...parsedMessage,
              timestamp: new Date()
            });
            
            // Send to display window
            mainWindow.webContents.send('hcs-message', parsedMessage);
            
            // Send to dashboard window
            if (dashboardWindow) {
              dashboardWindow.webContents.send('hcs-message', parsedMessage);
              dashboardWindow.webContents.send('queue-update', messageQueue.length);
            }
          }
        } catch (e) {
          // Not a JSON string or doesn't have required fields
          console.log('Message format not supported:', message);
        }
      }
    });
    
    const status = {
      connected: true,
      topicId: hederaTopicId,
      network: customEndpoint ? 'custom' : hederaNetwork,
      readOnly: !(hederaAccountId && hederaPrivateKey)
    };
    
    mainWindow.webContents.send('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
  } else {
    console.error('Failed to initialize Hedera client');
    const status = {
      connected: false,
      error: 'Failed to initialize Hedera client',
      network: customEndpoint ? 'custom' : hederaNetwork
    };
    
    mainWindow.webContents.send('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
  }
}

// Update queue length when a message is processed
function updateQueue() {
  if (messageQueue.length > 0) {
    // Remove the first message from the queue (it's been displayed)
    messageQueue.shift();
    
    // Update the dashboard with the new queue length
    if (dashboardWindow) {
      dashboardWindow.webContents.send('queue-update', messageQueue.length);
    }
  }
}

// IPC handlers
ipcMain.on('create-topic', async (event) => {
  if (!hederaClient.client) {
    const status = { connected: false, error: 'Client not initialized' };
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
    return;
  }

  if (!hederaAccountId || !hederaPrivateKey) {
    const status = { 
      connected: false, 
      error: 'Cannot create topic: No credentials provided',
      readOnly: true
    };
    
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
    return;
  }

  try {
    const topicId = await hederaClient.createTopic();
    if (topicId) {
      hederaTopicId = topicId.toString();
      
      const status = {
        connected: true,
        topicId: hederaTopicId,
        network: hederaCustomEndpoint ? 'custom' : hederaNetwork,
        readOnly: false
      };
      
      event.reply('hcs-connection-status', status);
      if (dashboardWindow) {
        dashboardWindow.webContents.send('hcs-connection-status', status);
      }
      
      // Subscribe to the newly created topic
      hederaClient.subscribeToTopic((message) => {
        console.log('Received message:', message);
        if (typeof message === 'object' && message.name && message.message) {
          // Add to message queue and history
          messageQueue.push(message);
          messageHistory.push({
            ...message,
            timestamp: new Date()
          });
          
          // Send to display window
          mainWindow.webContents.send('hcs-message', message);
          
          // Send to dashboard window
          if (dashboardWindow) {
            dashboardWindow.webContents.send('hcs-message', message);
            dashboardWindow.webContents.send('queue-update', messageQueue.length);
          }
        }
      });
    } else {
      const status = { connected: false, error: 'Failed to create topic' };
      event.reply('hcs-connection-status', status);
      if (dashboardWindow) {
        dashboardWindow.webContents.send('hcs-connection-status', status);
      }
    }
  } catch (error) {
    console.error('Error creating topic:', error);
    const status = { connected: false, error: error.message };
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
  }
});

ipcMain.on('submit-message', async (event, message) => {
  if (!hederaClient.client || !hederaClient.topicId) {
    const status = { connected: false, error: 'Client not initialized or no topic ID' };
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
    return;
  }

  if (!hederaAccountId || !hederaPrivateKey) {
    const status = { 
      connected: true, 
      error: 'Cannot submit message: No credentials provided',
      topicId: hederaClient.topicId.toString(),
      readOnly: true
    };
    
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
    return;
  }

  try {
    const success = await hederaClient.submitMessage(message);
    const status = { 
      connected: true, 
      topicId: hederaClient.topicId.toString(),
      messageStatus: success ? 'sent' : 'failed',
      network: hederaCustomEndpoint ? 'custom' : hederaNetwork,
      readOnly: false
    };
    
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
  } catch (error) {
    console.error('Error submitting message:', error);
    const status = { connected: false, error: error.message };
    event.reply('hcs-connection-status', status);
    if (dashboardWindow) {
      dashboardWindow.webContents.send('hcs-connection-status', status);
    }
  }
});

// Add IPC handler for TTS requests
ipcMain.handle('generate-speech', async (event, { name, message }) => {
  try {
    const text = `${name} sent a message: ${message}`;
    const audioPath = await ttsService.generateSpeech(text);
    
    // Update the queue after speech is generated (message is being processed)
    updateQueue();
    
    return { success: true, audioPath };
  } catch (error) {
    console.error('TTS error:', error);
    
    // Update the queue even if there's an error with TTS
    updateQueue();
    
    return { success: false, error: error.message };
  }
});

// Add IPC handler for overlay toggle
ipcMain.on('toggle-overlay', (event, show) => {
  if (mainWindow) {
    if (show) {
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
    } else {
      mainWindow.hide();
    }
    
    // Notify the dashboard of the current state
    if (dashboardWindow) {
      dashboardWindow.webContents.send('overlay-state', show);
    }
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Add these switches to prevent background throttling
  app.commandLine.appendSwitch('high-dpi-support', 1);
  app.commandLine.appendSwitch('force-device-scale-factor', 1);
  
  // Create the main display window
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
})

// Clean up on app quit
app.on('before-quit', () => {
  if (hederaClient) {
    hederaClient.close();
  }
}); 