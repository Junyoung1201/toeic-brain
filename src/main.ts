import { app, BrowserWindow } from 'electron';
import { WindowManager } from './managers/window-manager';
import { registerIpcHandlers } from './handlers/ipc-handlers';
import { llmManager } from './managers/llm-manager';
import { modelDownloader } from './managers/model-downloader';
import { logInfo } from './utils/logger';

// Electron 보안 경고 숨기기
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 매니저 인스턴스 생성
const windowManager = new WindowManager();

// IPC 핸들러 등록
registerIpcHandlers();

// 앱 준비 완료
app.whenReady().then(() => {

    console.clear();
    logInfo("Toeic Brain Started.");

    // 메인 윈도우 생성
    const mainWindow = windowManager.createWindow();
    
    // 매니저들에 윈도우 참조 설정
    llmManager.setWindow(mainWindow);
    modelDownloader.setWindow(mainWindow);

    // macOS에서 독 아이콘 클릭 시 윈도우 재생성
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const newWindow = windowManager.createWindow();
            llmManager.setWindow(newWindow);
            modelDownloader.setWindow(newWindow);
        }
    });
});

// 모든 윈도우 닫힘 시 처리
app.on('window-all-closed', () => {
    llmManager.unloadModel();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
