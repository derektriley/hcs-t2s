const { app, BrowserWindow, nativeImage, ipcMain } = require('electron')
const path = require('path')
const HederaClient = require('./hedera-client')
const fs = require('fs')

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

// Create the browser window.
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
    alwaysOnTop: false,
    show: true,
    title: 'Message Display'
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

  // Initialize Hedera client if credentials are available
  initializeHedera();
}

// Initialize Hedera client and subscribe to topic
function initializeHedera() {
  if (hederaAccountId && hederaPrivateKey) {
    // Initialize client
    const customEndpoint = hederaCustomEndpoint || null;
    console.log("Network configuration:", {
      network: hederaNetwork,
      customEndpoint: customEndpoint,
      customMirrorEndpoint: hederaCustomMirrorEndpoint || null
    });
    
    const success = hederaClient.init(
      hederaAccountId,
      hederaPrivateKey,
      hederaNetwork,
      hederaTopicId,
      customEndpoint
    );

    if (success) {
      // If we have a topic ID, subscribe to it
      if (hederaTopicId) {
        hederaClient.subscribeToTopic((message) => {
          console.log('Received message:', message);
          
          // Only forward message objects with name and message fields
          if (typeof message === 'object' && message.name && message.message) {
            mainWindow.webContents.send('hcs-message', message);
          } else if (typeof message === 'string') {
            // Try to parse as JSON if it's a string
            try {
              const parsedMessage = JSON.parse(message);
              if (parsedMessage.name && parsedMessage.message) {
                mainWindow.webContents.send('hcs-message', parsedMessage);
              }
            } catch (e) {
              // Not a JSON string or doesn't have required fields
              console.log('Message format not supported:', message);
            }
          }
        });
        mainWindow.webContents.send('hcs-connection-status', {
          connected: true,
          topicId: hederaTopicId,
          network: customEndpoint ? 'custom' : hederaNetwork
        });
      } else {
        console.log('No topic ID specified. Will not subscribe to any topics.');
        mainWindow.webContents.send('hcs-connection-status', {
          connected: false,
          error: 'No topic ID specified',
          network: customEndpoint ? 'custom' : hederaNetwork
        });
      }
    } else {
      console.error('Failed to initialize Hedera client');
      mainWindow.webContents.send('hcs-connection-status', {
        connected: false,
        error: 'Failed to initialize Hedera client',
        network: customEndpoint ? 'custom' : hederaNetwork
      });
    }
  } else {
    console.log('Hedera credentials not found. Running without Hedera connection.');
    mainWindow.webContents.send('hcs-connection-status', {
      connected: false,
      error: 'Credentials not found',
      network: hederaCustomEndpoint ? 'custom' : hederaNetwork
    });
  }
}

// IPC handlers
ipcMain.on('create-topic', async (event) => {
  if (!hederaClient.client) {
    event.reply('hcs-connection-status', { connected: false, error: 'Client not initialized' });
    return;
  }

  try {
    const topicId = await hederaClient.createTopic();
    if (topicId) {
      hederaTopicId = topicId.toString();
      event.reply('hcs-connection-status', {
        connected: true,
        topicId: hederaTopicId,
        network: hederaCustomEndpoint ? 'custom' : hederaNetwork
      });
      
      // Subscribe to the newly created topic
      hederaClient.subscribeToTopic((message) => {
        console.log('Received message:', message);
        if (typeof message === 'object' && message.name && message.message) {
          mainWindow.webContents.send('hcs-message', message);
        }
      });
    } else {
      event.reply('hcs-connection-status', { connected: false, error: 'Failed to create topic' });
    }
  } catch (error) {
    console.error('Error creating topic:', error);
    event.reply('hcs-connection-status', { connected: false, error: error.message });
  }
});

ipcMain.on('submit-message', async (event, message) => {
  if (!hederaClient.client || !hederaClient.topicId) {
    event.reply('hcs-connection-status', { connected: false, error: 'Client not initialized or no topic ID' });
    return;
  }

  try {
    const success = await hederaClient.submitMessage(message);
    event.reply('hcs-connection-status', { 
      connected: true, 
      topicId: hederaClient.topicId.toString(),
      messageStatus: success ? 'sent' : 'failed',
      network: hederaCustomEndpoint ? 'custom' : hederaNetwork
    });
  } catch (error) {
    console.error('Error submitting message:', error);
    event.reply('hcs-connection-status', { connected: false, error: error.message });
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Add these switches to prevent background throttling
  app.commandLine.appendSwitch('high-dpi-support', 1);
  app.commandLine.appendSwitch('force-device-scale-factor', 1);
  
  // Don't hide the app from dock/taskbar
  app.setActivationPolicy && app.setActivationPolicy('regular');
  
  createWindow();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Clean up before quit
app.on('before-quit', () => {
  if (hederaClient) {
    hederaClient.close();
  }
}); 