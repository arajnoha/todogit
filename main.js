const { app, Tray, dialog, BrowserWindow, Menu, shell } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let tray;
let token = null;
let gitlabUrl = null;
let mainWindow;

const configPath = path.join(__dirname, 'config.json');

app.on('ready', () => {
  createMainWindow(); 
  createTrayIcon(); 

  loadConfig();

  setInterval(updateTaskCount, 1 * 60 * 1000);
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 250,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (event) => {
    if (app.quitting) {
      mainWindow = null;
    } else {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function loadConfig() {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    if (config.gitlab && config.gitlab.token && config.gitlab.url) {
      token = config.gitlab.token;
      gitlabUrl = config.gitlab.url;
      updateTaskCount(); 
    } else {
      mainWindow.show();
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      createConfigFile(configPath);
      mainWindow.show();
    } else if (error instanceof SyntaxError) {
      dialog.showErrorBox('Configuration Error', 'Config file is empty or invalid. Please check and correct.');
      createConfigFile(configPath);
      mainWindow.show();
    } else {
      dialog.showErrorBox('Error', 'Failed to load config file. Please check file permissions.');
      app.quit();
    }
  }
}

function createConfigFile(configPath) {
  const defaultConfig = {
    gitlab: {
      token: null,
      url: null
    }
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  } catch (error) {
    dialog.showErrorBox('Error', 'Failed to create config file. Please check file permissions.');
    app.quit();
  }
}

async function updateTaskCount() {
  if (!token || !gitlabUrl) {
    return;
  }

  try {
    const taskCount = await fetchAssignedMergeRequestCount(token, gitlabUrl);
    tray.setTitle(`${taskCount}`);
  } catch (error) {
    dialog.showErrorBox('Task Fetch Error', 'Failed to fetch tasks. Please check your connection and settings.');
  }
}

async function fetchAssignedMergeRequestCount(token, url) {
  try {
    const response = await axios.get(`${url}/api/v4/merge_requests`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        scope: 'assigned_to_me',
        state: 'opened'
      }
    });
    return response.data.length;
  } catch (error) {
    throw error;
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const { ipcMain } = require('electron');
ipcMain.on('save-config', (event, arg) => {
  token = arg.token;
  gitlabUrl = arg.url;
  updateConfigFile(configPath, { token, gitlabUrl });
  updateTaskCount(); 
  mainWindow.hide(); 
});

function updateConfigFile(configPath, { token, gitlabUrl }) {
  const config = {
    gitlab: {
      token,
      url: gitlabUrl
    }
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    dialog.showErrorBox('Error', 'Failed to update config file. Please check file permissions.');
  }
}

function createTrayIcon() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Configure', 
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('update-config', { token, gitlabUrl });
      }
    },
    { 
      label: 'Open GitLab', 
      click: () => shell.openExternal(gitlabUrl) 
    },
    { 
      label: 'Quit', 
      click: () => {
        app.quitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('GitLab Tasks');
  tray.setContextMenu(contextMenu);
}
