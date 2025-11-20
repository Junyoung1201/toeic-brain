import { BrowserWindow } from 'electron';
import * as path from 'path';

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

        // 개발 환경에서는 localhost 사용, 프로덕션에서는 파일 로드
        if (process.env.NODE_ENV === 'development') {
            WindowManager.mainWindow.loadURL('http://localhost:8080');
        } else {
            WindowManager.mainWindow.loadFile(path.join(__dirname, '../index.html'));
        }

        WindowManager.mainWindow.setMenuBarVisibility(false);

        // 개발 모드에서만 DevTools 열기
        if (process.env.NODE_ENV === 'development') {
            WindowManager.mainWindow.webContents.openDevTools({ mode: 'detach' });
        }

        return WindowManager.mainWindow;
    }

    static getMainWindow(): BrowserWindow | null {
        return WindowManager.mainWindow;
    }
}
