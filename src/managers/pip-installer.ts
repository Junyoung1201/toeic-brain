import { spawn } from 'child_process';
import * as fs from 'fs';
import { BrowserWindow } from 'electron';
import { logInfo, logError } from '../utils/logger';
import { getPythonExecutable } from '../utils/python-utils';
import { PythonManager } from './python-manager';

export interface InstallOptions {
    packageName: string;
    args?: string[];
    task: string;
    isTemp?: boolean;
}

export class PipInstaller {
    private mainWindow: BrowserWindow | null = null;
    private pythonManager: PythonManager;

    constructor(mainWindow: BrowserWindow | null, pythonManager: PythonManager) {
        this.mainWindow = mainWindow;
        this.pythonManager = pythonManager;
    }

    setMainWindow(window: BrowserWindow | null): void {
        this.mainWindow = window;
    }

    install(options: InstallOptions): void {
        const { packageName: pkg, args = [], task, isTemp = false } = options;
        let packageName = pkg;
        
        logInfo(`Installing package: ${packageName} with args: ${args.join(' ')}`);
        
        // Python 백엔드 종료
        this.pythonManager.stop();

        // pip install 실행
        const pythonExecutable = getPythonExecutable();
        
        // llama-cpp-python 설치 시 설정된 URL이 있으면 사용
        let finalArgs = [...args];
        if (packageName === 'llama-cpp-python' && this.pythonManager.configuredLlamaCppUrl) {
            logInfo(`Using configured llama-cpp-python URL: ${this.pythonManager.configuredLlamaCppUrl}`);
            
            const extraIndexIdx = finalArgs.indexOf('--extra-index-url');
            if (extraIndexIdx !== -1) {
                finalArgs.splice(extraIndexIdx, 2);
            }
            
            if (this.pythonManager.configuredLlamaCppUrl.endsWith('.whl')) {
                packageName = this.pythonManager.configuredLlamaCppUrl;
            } else {
                finalArgs.push('--extra-index-url', this.pythonManager.configuredLlamaCppUrl);
            }
        }

        const pipArgs = [
            '-m', 'pip', 'install', packageName,
            '--no-warn-script-location', '--no-input', 
            '--prefer-binary', '--no-cache-dir', '-v',
            ...finalArgs
        ];
        
        if (this.mainWindow) {
            this.mainWindow.webContents.send('python-message', { 
                type: 'status', 
                data: `Installing ${packageName}...` 
            });
            this.mainWindow.webContents.send('python-message', { 
                type: 'log', 
                data: `Command: ${pythonExecutable} ${pipArgs.join(' ')}` 
            });
        }

        const installProcess = spawn(pythonExecutable, pipArgs, {
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PIP_PROGRESS_BAR: 'off'
            }
        });

        installProcess.stdout.on('data', (data) => {
            const output = data.toString();
            logInfo('[pip]', output);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('python-message', { 
                    type: 'log', 
                    data: output.trim() 
                });
            }
        });

        installProcess.stderr.on('data', (data) => {
            const output = data.toString();
            logError('[pip error]', output);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('python-message', { 
                    type: 'log', 
                    data: output.trim() 
                });
            }
        });

        installProcess.on('close', (code) => {
            this.handleInstallComplete(code, packageName, task, isTemp);
        });
    }

    private handleInstallComplete(code: number | null, packageName: string, task: string, isTemp: boolean): void {
        logInfo(`pip install exited with code ${code}`);
        
        if (code === 0) {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('python-message', { 
                    type: 'status', 
                    data: 'Installation completed successfully.' 
                });
            }
            
            // 임시 파일 삭제
            if (isTemp && fs.existsSync(packageName)) {
                try {
                    fs.unlinkSync(packageName);
                } catch (e) {
                    logError('Failed to delete temp file:', e);
                }
            }

            // Python 백엔드 재시작
            logInfo('Restarting Python backend...');
            this.pythonManager.start();
            
            // 재시작 후 원래 작업 복구
            setTimeout(() => {
                this.resumeTask(task);
            }, 3000);

        } else {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('python-message', { 
                    type: 'error', 
                    data: `Installation failed with code ${code}` 
                });
            }
        }
    }

    private resumeTask(task: string): void {
        if (task === 'install_pytorch') {
            if (this.mainWindow) {
                this.mainWindow.webContents.send('python-message', { 
                    type: 'complete', 
                    data: { task: 'install_pytorch' } 
                });
            }
        } else if (task === 'install_llama') {
            if (this.pythonManager.lastModelPath && this.pythonManager.isRunning()) {
                logInfo('Retrying model load...');
                this.pythonManager.sendCommand('load_model', { 
                    model_path: this.pythonManager.lastModelPath 
                });
            }
        }
    }
}
