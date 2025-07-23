const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      sandbox: false
    }
  })

  // Desarrollo vs Producción
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3001')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../dist/index.html'),
      protocol: 'file:',
      slashes: true
    }))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})