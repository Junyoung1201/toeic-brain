import * as fs from 'fs';
import * as path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function getLogFileName(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}${month}${dd}-${hh}${min}${ss}.log`;
}

const logFilePath = path.join(LOGS_DIR, getLogFileName());

function logToFile(message: string, level: 'INFO' | 'ERROR' = 'INFO'): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;
    try {
        fs.appendFileSync(logFilePath, logLine);
    } catch (e) {
        console.error('Failed to write to log file:', e);
    }
}

export function logInfo(message: string, ...args: any[]): void {
    console.log(message, ...args);
    const formatted = [message, ...args].map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    logToFile(formatted, 'INFO');
}

export function logError(message: string, ...args: any[]): void {
    console.error(message, ...args);
    const formatted = [message, ...args].map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    logToFile(formatted, 'ERROR');
}
