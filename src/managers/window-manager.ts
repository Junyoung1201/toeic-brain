import { BrowserWindow } from 'electron';
import * as path from 'path';

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;

    createWindow(): BrowserWindow {
        this.mainWindow = new BrowserWindow({
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
            this.mainWindow.loadURL('http://localhost:8080');
        } else {
            this.mainWindow.loadFile(path.join(__dirname, '../index.html'));
        }

        this.mainWindow.setMenuBarVisibility(false);
        
        // 개발 모드에서만 DevTools 열기
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools({ mode: 'detach' });
        }

        return this.mainWindow;
    }

    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }
}
