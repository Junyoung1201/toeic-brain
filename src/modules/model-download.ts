import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { logInfo, logError } from '../utils/logger';
import { WindowManager } from './windows';

/**
 * Hugging Face에서 GGUF 모델 다운로드
 */
export async function downloadModel(repoId: string, filename: string, saveDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // 저장 디렉토리 생성
            if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
            }

            const savePath = path.join(saveDir, filename);

            // 이미 파일이 있으면 바로 반환
            if (fs.existsSync(savePath)) {
                logInfo(`Model already exists: ${savePath}`);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-complete', { path: savePath });
                resolve(savePath);
                return;
            }

            // Hugging Face URL 구성
            const url = `https://huggingface.co/${repoId}/resolve/main/${filename}`;

            logInfo(`Downloading model from: ${url}`);
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-status', { message: 'Starting download...' });

            const file = fs.createWriteStream(savePath);
            let downloadedSize = 0;
            let totalSize = 0;

            const request = https.get(url, { headers: { 'User-Agent': 'toeic-brain' } }, (response) => {
                // 리다이렉트 처리
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    if (!redirectUrl) {
                        reject(new Error('Redirect without location'));
                        return;
                    }

                    https.get(redirectUrl, (redirectResponse) => {
                        totalSize = parseInt(redirectResponse.headers['content-length'] || '0', 10);

                        redirectResponse.on('data', (chunk) => {
                            downloadedSize += chunk.length;
                            const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;

                            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-progress', {
                                downloaded: downloadedSize,
                                total: totalSize,
                                progress: progress.toFixed(2)
                            });
                        });

                        redirectResponse.pipe(file);

                        file.on('finish', () => {
                            file.close();
                            logInfo(`Model downloaded successfully: ${savePath}`);
                            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-complete', { path: savePath });
                            resolve(savePath);
                        });
                    }).on('error', (err) => {
                        fs.unlinkSync(savePath);
                        reject(err);
                    });

                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                totalSize = parseInt(response.headers['content-length'] || '0', 10);

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;

                    WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-progress', {
                        downloaded: downloadedSize,
                        total: totalSize,
                        progress: progress.toFixed(2)
                    });
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    logInfo(`Model downloaded successfully: ${savePath}`);
                    WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-complete', { path: savePath });
                    resolve(savePath);
                });
            });

            request.on('error', (err) => {
                fs.unlinkSync(savePath);
                logError('Download error:', err);
                WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-error', { error: err.message });
                reject(err);
            });

            file.on('error', (err) => {
                fs.unlinkSync(savePath);
                reject(err);
            });

        } catch (error) {
            logError('Download error:', error);
            WindowManager.sendToRenderer(WindowManager.getMainWindow(), 'model-download-error', { error: String(error) });
            reject(error);
        }
    });
}
