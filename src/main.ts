import { app, BrowserWindow } from 'electron';
import { WindowManager } from './managers/window-manager';
import { PythonManager } from './managers/python-manager';
import { PipInstaller } from './managers/pip-installer';
import { registerIpcHandlers } from './handlers/ipc-handlers';

// 매니저 인스턴스 생성
const windowManager = new WindowManager();
const pythonManager = new PythonManager();
const pipInstaller = new PipInstaller(null, pythonManager);

// Python 매니저에 설치 핸들러 등록
pythonManager.setInstallHandler((options) => {
    pipInstaller.install(options);
});

// IPC 핸들러 등록
registerIpcHandlers(pythonManager, pipInstaller);

// 앱 준비 완료
app.whenReady().then(() => {
    // Python 백엔드 시작
    pythonManager.start();
    
    // 메인 윈도우 생성
    const mainWindow = windowManager.createWindow();
    
    // 매니저들에 윈도우 참조 설정
    pythonManager.setMainWindow(mainWindow);
    pipInstaller.setMainWindow(mainWindow);

    // macOS에서 독 아이콘 클릭 시 윈도우 재생성
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const newWindow = windowManager.createWindow();
            pythonManager.setMainWindow(newWindow);
            pipInstaller.setMainWindow(newWindow);
        }
    });
});

// 모든 윈도우 닫힘 시 처리
app.on('window-all-closed', () => {
    pythonManager.stop();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
