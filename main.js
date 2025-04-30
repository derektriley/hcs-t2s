const { app, BrowserWindow } = require('electron')
const path = require('path')

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Load the index.html file
  mainWindow.loadFile('index.html')

  // Uncomment this line if you want to open DevTools by default
  // mainWindow.webContents.openDevTools()

  // Handle window being closed
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

// Create window when Electron has finished initialization
app.whenReady().then(createWindow)

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// On macOS, recreate the window when the dock icon is clicked and no other windows are open
app.on('activate', function () {
  if (mainWindow === null) createWindow()
}) 