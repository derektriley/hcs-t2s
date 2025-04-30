const { app, BrowserWindow, nativeImage } = require('electron')
const path = require('path')

// Set application name
app.name = 'Message Display';

// Create the browser window.
const createWindow = () => {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    backgroundColor: '#00FF0000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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

  // Open the DevTools. (Comment this out for production)
  // mainWindow.webContents.openDevTools()
}

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

// On macOS, recreate the window when the dock icon is clicked and no other windows are open
app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
}) 