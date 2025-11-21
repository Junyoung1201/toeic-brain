import { app } from "electron";
import path from "path";
import {fileURLToPath} from 'url';

/**  모델 파일 다운로드 경로 기본값  */
export const MODEL_DOWNLOAD_PATH_DEF = path.join(app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath(), 'models');

/**  모델 컨텍스트 크기 기본값  */
export const MODEL_CONTEXT_SIZE_DEF = 4096;

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);