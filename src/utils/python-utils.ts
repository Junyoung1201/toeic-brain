import * as fs from 'fs';
import * as path from 'path';

export function getPythonExecutable(): string {
    const isWin = process.platform === 'win32';
    const projectRoot = process.cwd();
    const venvPython = isWin 
        ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
        : path.join(projectRoot, '.venv', 'bin', 'python');

    if (fs.existsSync(venvPython)) {
        console.log('Using venv python:', venvPython);
        return venvPython;
    }
    
    console.log('Using system python');
    return 'python';
}
