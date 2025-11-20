import { app, BrowserWindow } from 'electron';
import { WindowManager } from './modules/windows';
import { registerIpcHandlers } from './ipc';
import { LLM } from './modules/llm';
import { logInfo } from './utils/logger';

// Electron 보안 경고 숨기기
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// IPC 핸들러 등록
registerIpcHandlers();

// 앱 준비 완료
app.whenReady().then(() => {

    console.clear();
    logInfo("Toeic Brain Started.");

    // 메인 윈도우 생성
    WindowManager.createWindow();

    // macOS에서 독 아이콘 클릭 시 윈도우 재생성
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            WindowManager.createWindow();
        }
    });
});

// 모든 윈도우 닫힘 시 처리
app.on('window-all-closed', () => {
    LLM.unloadModel();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
