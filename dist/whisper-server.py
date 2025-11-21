#!/usr/bin/env python3

import sys
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any, List
import traceback

try:
    from faster_whisper import WhisperModel
    import torch
except ImportError as e:
    # 의존성 누락 시 에러 메시지 출력
    error_msg = {
        "type": "error",
        "data": {
            "error": f"필수 패키지가 설치되지 않았습니다: {str(e)}\n"
                    "다음 명령어로 설치하세요:\n"
                    "pip install faster-whisper torch"
        }
    }
    print(json.dumps(error_msg), flush=True)
    sys.exit(1)


class WhisperServer:
    def __init__(self):
        self.model: Optional[WhisperModel] = None
        self.model_name: Optional[str] = None
        self.device: str = "cpu"
        self.compute_type: str = "int8"
        
    def log(self, message: str):
        """로그 메시지 전송"""
        response = {
            "type": "log",
            "data": {"message": message}
        }
        print(json.dumps(response), flush=True)
        
    def send_progress(self, message: str, percentage: Optional[int] = None):
        """진행 상황 전송"""
        data = {"message": message}
        if percentage is not None:
            data["percentage"] = percentage
            
        response = {
            "type": "load-progress",
            "data": data
        }
        print(json.dumps(response), flush=True)
        
    def send_error(self, error_msg: str, request_type: str = "error"):
        """에러 메시지 전송"""
        response = {
            "type": f"{request_type}-error" if request_type != "error" else "error",
            "data": {"error": error_msg}
        }
        print(json.dumps(response), flush=True)
        
    def send_success(self, request_type: str, data: Dict[str, Any]):
        """성공 응답 전송"""
        response = {
            "type": f"{request_type}-complete",
            "data": data
        }
        print(json.dumps(response), flush=True)
        
    def check_cuda(self) -> Dict[str, Any]:
        """CUDA 사용 가능 여부 확인"""
        cuda_available = torch.cuda.is_available()
        result = {
            "available": cuda_available,
            "device_count": torch.cuda.device_count() if cuda_available else 0,
        }
        
        if cuda_available:
            result["device_name"] = torch.cuda.get_device_name(0)
            result["cuda_version"] = torch.version.cuda
            
        return result
        
    def load_model(self, request_data: Dict[str, Any]):
        """Whisper 모델 로드"""
        try:
            model_name = request_data.get("modelName", "large-v3")
            device = request_data.get("device", "auto")
            compute_type = request_data.get("computeType", "auto")
            
            self.log(f"Whisper 모델 로딩 시작: {model_name}")
            
            # 디바이스 자동 선택
            if device == "auto":
                cuda_info = self.check_cuda()
                if cuda_info["available"]:
                    device = "cuda"
                    compute_type = "float16" if compute_type == "auto" else compute_type
                    self.log(f"GPU 감지됨: {cuda_info.get('device_name', 'Unknown')}")
                else:
                    device = "cpu"
                    compute_type = "int8" if compute_type == "auto" else compute_type
                    self.log("GPU를 찾을 수 없습니다. CPU 모드로 실행합니다.")
            
            self.device = device
            self.compute_type = compute_type
            
            self.send_progress(f"모델 다운로드 중: {model_name}...", 10)
            
            # Whisper 모델 로드
            self.model = WhisperModel(
                model_name,
                device=device,
                compute_type=compute_type,
                download_root=None,  # 기본 캐시 디렉토리 사용
                local_files_only=False
            )
            
            self.model_name = model_name
            
            self.send_progress("모델 로드 완료", 100)
            self.send_success("load", {
                "modelName": model_name,
                "device": device,
                "computeType": compute_type
            })
            
        except Exception as e:
            error_msg = f"모델 로드 실패: {str(e)}\n{traceback.format_exc()}"
            self.log(error_msg)
            self.send_error(error_msg, "load")
            
    def transcribe_audio(self, request_data: Dict[str, Any]):
        """오디오 파일 음성 인식"""
        try:
            if self.model is None:
                raise Exception("모델이 로드되지 않았습니다.")
                
            audio_path = request_data.get("audioPath")
            if not audio_path or not os.path.exists(audio_path):
                raise Exception(f"오디오 파일을 찾을 수 없습니다: {audio_path}")
                
            # Whisper 옵션
            language = request_data.get("language")  # None이면 자동 감지
            task = request_data.get("task", "transcribe")  # transcribe or translate
            beam_size = request_data.get("beamSize", 5)
            vad_filter = request_data.get("vadFilter", True)
            
            self.log(f"음성 인식 시작: {audio_path}")
            
            # 음성 인식 실행
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                task=task,
                beam_size=beam_size,
                vad_filter=vad_filter,
                word_timestamps=False
            )
            
            # 결과 수집
            full_text = []
            chunks = []
            
            for segment in segments:
                full_text.append(segment.text)
                chunks.append({
                    "timestamp": [segment.start, segment.end],
                    "text": segment.text.strip()
                })
            
            result = {
                "text": " ".join(full_text).strip(),
                "chunks": chunks,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration
            }
            
            self.log(f"음성 인식 완료: {len(chunks)}개 세그먼트")
            self.send_success("transcribe", result)
            
        except Exception as e:
            error_msg = f"음성 인식 실패: {str(e)}\n{traceback.format_exc()}"
            self.log(error_msg)
            self.send_error(error_msg, "transcribe")
            
    def get_model_info(self):
        """모델 정보 반환"""
        info = {
            "loaded": self.model is not None,
            "modelName": self.model_name,
            "device": self.device,
            "computeType": self.compute_type
        }
        self.send_success("model-info", info)
        
    def unload_model(self):
        """모델 언로드"""
        try:
            if self.model is not None:
                del self.model
                self.model = None
                self.model_name = None
                self.log("모델 언로드 완료")
                self.send_success("unload", {})
            else:
                self.log("언로드할 모델이 없습니다.")
                
        except Exception as e:
            error_msg = f"모델 언로드 실패: {str(e)}"
            self.log(error_msg)
            self.send_error(error_msg, "unload")
            
    def handle_request(self, request: Dict[str, Any]):
        """요청 처리"""
        request_type = request.get("type")
        data = request.get("data", {})
        
        if request_type == "load-model":
            self.load_model(data)
        elif request_type == "transcribe":
            self.transcribe_audio(data)
        elif request_type == "model-info":
            self.get_model_info()
        elif request_type == "check-cuda":
            cuda_info = self.check_cuda()
            self.send_success("check-cuda", cuda_info)
        elif request_type == "unload":
            self.unload_model()
        else:
            self.send_error(f"알 수 없는 요청 타입: {request_type}")
            
    def run(self):
        """서버 메인 루프"""
        self.log("Whisper 서버 시작됨 (faster-whisper)")
        
        # Ready 신호 전송
        ready_msg = {
            "type": "ready",
            "data": {}
        }
        print(json.dumps(ready_msg), flush=True)
        
        # stdin에서 JSON 요청 읽기
        for line in sys.stdin:
            try:
                line = line.strip()
                self.log(f"Received line: {line}")  # 디버깅용
                if not line:
                    continue
                    
                request = json.loads(line)
                self.log(f"Parsed request: {request.get('type', 'unknown')}")  # 디버깅용
                self.handle_request(request)
                
            except json.JSONDecodeError as e:
                self.send_error(f"JSON 파싱 오류: {str(e)}, line: {line}")
            except Exception as e:
                self.send_error(f"요청 처리 오류: {str(e)}\n{traceback.format_exc()}")


def main():
    # UTF-8 인코딩 설정
    if sys.platform == "win32":
        # Windows에서는 UTF-8 모드로 설정하지만 detach는 피함
        import io
        sys.stdin.reconfigure(encoding='utf-8')
        sys.stdout.reconfigure(encoding='utf-8')
    
    server = WhisperServer()
    try:
        server.run()
    except KeyboardInterrupt:
        server.log("서버 종료됨")
    except Exception as e:
        error_msg = {
            "type": "error",
            "data": {"error": f"서버 오류: {str(e)}\n{traceback.format_exc()}"}
        }
        print(json.dumps(error_msg), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
