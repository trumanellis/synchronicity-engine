import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer.html'))
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
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

// IPC handlers for test execution
ipcMain.handle('run-tests', async () => {
  console.log('Starting test execution...')
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npm', ['run', 'test:run'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true // Add shell option for better compatibility
    })

    let output = ''
    let error = ''

    testProcess.stdout.on('data', (data) => {
      const chunk = data.toString()
      console.log('STDOUT:', chunk)
      output += chunk
    })

    testProcess.stderr.on('data', (data) => {
      const chunk = data.toString()
      console.log('STDERR:', chunk)
      error += chunk
    })

    testProcess.on('close', (code) => {
      console.log('Test process closed with code:', code)
      console.log('Total output length:', output.length)
      resolve({
        exitCode: code,
        stdout: output,
        stderr: error,
        success: code === 0
      })
    })

    testProcess.on('error', (err) => {
      console.error('Test process error:', err)
      reject(err)
    })

    // Add timeout as fallback
    setTimeout(() => {
      console.log('Test execution timeout - killing process')
      testProcess.kill()
      resolve({
        exitCode: -1,
        stdout: output,
        stderr: error + '\n[TIMEOUT] Test execution timed out after 60 seconds',
        success: false
      })
    }, 60000)
  })
})