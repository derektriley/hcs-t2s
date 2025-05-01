const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Receive message from main process
    receive: (channel, func) => {
      const validChannels = ['hcs-message', 'hcs-connection-status'];
      if (validChannels.includes(channel)) {
        // Remove the event listener to avoid memory leaks
        ipcRenderer.removeAllListeners(channel);
        // Add a new listener
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    // Send message to main process
    send: (channel, data) => {
      const validChannels = ['create-topic', 'submit-message'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    }
  }
);

contextBridge.exposeInMainWorld('tts', {
  generateSpeech: (name, message) => ipcRenderer.invoke('generate-speech', { name, message })
}); 