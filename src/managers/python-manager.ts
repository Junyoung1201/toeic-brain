import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { logInfo, logError } from '../utils/logger';
import { getPythonExecutable } from '../utils/python-utils';

export interface PythonMessage {
    type: string;
    data?: any;
}

export class PythonManager {
    private pythonProcess: ChildProcess | null = null;
    private dataBuffer: string = '';
    private mainWindow: BrowserWindow | null = null;
    private installHandler: ((options: any) => void) | null = null;
    
    // 상태 관리
    public pendingProblem: string | null = null;
    public lastModelPath: string | null = null;
    public configuredLlamaCppUrl: string | null = null;

    constructor(mainWindow: BrowserWindow | null = null) {
        this.mainWindow = mainWindow;
    }

    setInstallHandler(handler: (options: any) => void): void {
        this.installHandler = handler;
    }

    setMainWindow(window: BrowserWindow | null): void {
        this.mainWindow = window;
    }

    start(): void {
        const scriptPath = path.join(__dirname, '../python/main.py');
        const pythonExecutable = getPythonExecutable();
        
        this.pythonProcess = spawn(pythonExecutable, [scriptPath]);
        this.dataBuffer = '';

        this.pythonProcess.stdout?.on('data', (data: Buffer) => {
            this.handleStdout(data);
        });

        this.pythonProcess.stderr?.on('data', (data: Buffer) => {
            logError('Python Error:', data.toString());
        });

        this.pythonProcess.on('close', (code: number | null) => {
            logInfo(`Python process exited with code ${code}`);
        });
    }

    private handleStdout(data: Buffer): void {
        this.dataBuffer += data.toString();
        
        const lines = this.dataBuffer.split('\n');
        this.dataBuffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const message: PythonMessage = JSON.parse(line);
                logInfo('Python Message Received:', JSON.stringify(message, null, 2));

                if (this.mainWindow) {
                    this.mainWindow.webContents.send('python-message', message);
                }

                this.handleMessage(message);
            } catch (e) {
                logError('Python JSON Parse Error:', e);
                logError('Problematic line:', line);
            }
        }
    }

    private handleMessage(message: PythonMessage): void {
        // 모델 로드 완료 시 대기 중인 문제 풀이 시작
        if (message.type === 'complete' && message.data?.task === 'load_model') {
            logInfo('Model loaded successfully. Checking for pending problem...');
            if (this.pendingProblem) {
                logInfo('Solving pending problem:', this.pendingProblem);
                this.sendCommand('solve_problem', { problem: this.pendingProblem });
                this.pendingProblem = null;
            }
        }
        
        // 설치 요청 처리
        if (message.type === 'install_needed' && this.installHandler) {
            const { package: pkg, args, task, is_temp } = message.data;
            this.installHandler({
                packageName: pkg,
                args: args || [],
                task,
                isTemp: is_temp || false
            });
        }
    }

    sendCommand(command: string, payload: any = {}): void {
        if (!this.pythonProcess) {
            logError('Python process not running');
            return;
        }

        const commandData = { command, payload };
        this.pythonProcess.stdin?.write(JSON.stringify(commandData) + '\n');
    }

    stop(): void {
        if (this.pythonProcess) {
            logInfo('Stopping Python backend...');
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
    }

    isRunning(): boolean {
        return this.pythonProcess !== null;
    }

    getProcess(): ChildProcess | null {
        return this.pythonProcess;
    }
}
