import { BrowserWindow } from 'electron';
import * as path from 'path';
import {__dirname} from '../constants';

export class WindowManager {
    private static mainWindow: BrowserWindow | null = null;

    static sendToRenderer(win: BrowserWindow | null, channel: string, ...args: any[]) {
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, ...args);
        }
    }
    
    static createWindow(): BrowserWindow {
        WindowManager.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false,
            },
        });
        
        if (process.env.NODE_ENV === 'development') {
            WindowManager.mainWindow.loadURL('http://localhost:8080');
        } else {
            WindowManager.mainWindow.loadFile(path.join(__dirname, '../index.html'));
        }

        WindowManager.mainWindow.setMenuBarVisibility(false);

        if (process.env.NODE_ENV === 'development') {
            WindowManager.mainWindow.webContents.openDevTools({ mode: 'detach' });
        }

        return WindowManager.mainWindow;
    }

    static getMainWindow(): BrowserWindow | null {
        return WindowManager.mainWindow;
    }
}
