import sys
import json
import os
import threading
import subprocess
import tempfile
from downloader import download_file, download_model

# LLM 관련 전역 변수
llm_model = None
model_path = None

def send_message(type, data):
    print(json.dumps({"type": type, "data": data}), flush=True)

def handle_command(command_data):
    cmd = command_data.get('command')
    payload = command_data.get('payload', {})

    if cmd == 'download_pytorch':
        url = payload.get('url')
        save_path = payload.get('save_path')
        
        if not url:
            send_message('error', 'Missing url for pytorch download')
            return

        try:
            from urllib.parse import unquote, urlparse
            
            # URL에서 경로 추출 후 마지막 부분만 가져오기
            parsed_url = urlparse(url)
            original_filename = os.path.basename(parsed_url.path)
            original_filename = unquote(original_filename) if original_filename else ''
            
            # URL이 .whl 파일을 직접 가리키는지 확인
            is_direct_whl = original_filename.endswith('.whl')
            
            if is_direct_whl:
                # 직접 다운로드 방식
                is_temp = False
                if not save_path:
                    # 임시 디렉토리 생성
                    temp_dir = tempfile.mkdtemp()
                    save_path = os.path.join(temp_dir, original_filename)
                    is_temp = True

                def progress_callback(current, total):
                    send_message('progress', {'task': 'download_pytorch', 'current': current, 'total': total})

                download_file(url, save_path, progress_callback)
                
                send_message('status', 'PyTorch downloaded. Requesting installation...')
                
                # Electron에게 설치 요청
                send_message('install_needed', {
                    'package': save_path,
                    'task': 'install_pytorch',
                    'is_temp': is_temp
                })
            else:
                # URL이 인덱스 URL인 경우 --extra-index-url 사용
                send_message('status', 'Installing PyTorch from index URL...')
                send_message('install_needed', {
                    'package': 'torch',
                    'args': ['--extra-index-url', url],
                    'task': 'install_pytorch',
                    'is_temp': False
                })

        except Exception as e:
            send_message('error', f'Failed to download PyTorch: {str(e)}')

    elif cmd == 'download_model':
        repo_id = payload.get('repo_id')
        filename = payload.get('filename')
        save_dir = payload.get('save_dir')

        if not repo_id or not save_dir:
            send_message('error', 'Missing repo_id or save_dir for model download')
            return

        try:
            def progress_callback(current, total):
                send_message('progress', {'task': 'download_model', 'current': current, 'total': total})
            
            # GGUF 파일명 추론 또는 지정 필요. 여기서는 repo_id에서 모델을 다운로드한다고 가정
            # 실제로는 huggingface_hub를 사용하여 다운로드
            downloaded_path = download_model(repo_id, save_dir, filename, progress_callback)
            send_message('complete', {'task': 'download_model', 'path': downloaded_path})
        except Exception as e:
            send_message('error', f'Failed to download model: {str(e)}')
    
    elif cmd == 'load_model':
        global llm_model, model_path
        model_file = payload.get('model_path')
        
        if not model_file:
            send_message('error', 'Missing model_path for load_model')
            return
        
        if not os.path.exists(model_file):
            send_message('error', f'Model file not found: {model_file}')
            return
        
        try:
            send_message('status', 'Loading LLM model...')
            send_message('log', f'Model file: {model_file}')
            send_message('log', f'File size: {os.path.getsize(model_file) / (1024**3):.2f} GB')
            
            # llama-cpp-python을 사용하여 GGUF 모델 로드
            try:
                from llama_cpp import Llama
                send_message('log', 'llama-cpp-python imported successfully')
            except ImportError as e:
                send_message('status', 'llama-cpp-python not installed. Requesting installation...')
                send_message('install_needed', {
                    'package': 'llama-cpp-python',
                    'args': ['--extra-index-url', 'https://abetlen.github.io/llama-cpp-python/whl/cu121'],
                    'task': 'install_llama'
                })
                return
            
            send_message('log', 'Initializing Llama model...')
            try:
                llm_model = Llama(
                    model_path=model_file,
                    n_ctx=4096,
                    n_gpu_layers=-1,
                    verbose=False  
                )
                model_path = model_file
                send_message('log', 'Model loaded successfully!')
                send_message('complete', {'task': 'load_model', 'path': model_file})
            except Exception as e:
                send_message('error', f'Failed to initialize Llama model: {str(e)}')

                # GPU 실패 시 CPU로 재시도
                send_message('log', 'Retrying with CPU...')
                try:
                    llm_model = Llama(
                        model_path=model_file,
                        n_ctx=4096,
                        n_gpu_layers=0,  # CPU만 사용
                        verbose=False
                    )
                    model_path = model_file
                    send_message('log', 'Model loaded successfully on CPU!')
                    send_message('complete', {'task': 'load_model', 'path': model_file})
                except Exception as e2:
                    send_message('error', f'Failed to load model on CPU: {str(e2)}')
        except Exception as e:
            send_message('error', f'Failed to load model: {str(e)}')
    
    elif cmd == 'solve_problem':
        if not llm_model:
            send_message('error', 'Model not loaded. Please load model first.')
            return
        
        problem_text = payload.get('problem')
        if not problem_text:
            send_message('error', 'Missing problem text')
            return
        
        try:
            send_message('status', 'Solving problem...')
            send_message('log', 'Preparing prompt...')

            prompt = f"""You are an expert TOEIC test solver. Analyze the following TOEIC Reading Comprehension question and provide ONLY the letter of the correct answer (A, B, C, or D).

Question:
{problem_text}

Answer (A, B, C, or D only):"""
            
            send_message('log', 'Generating response...')
            response = llm_model(
                prompt,
                max_tokens=10,
                temperature=0.1,
                stop=["\\n", ".", ","],
                echo=False
            )
            send_message('log', f'Raw response: {response}')
            
            answer_text = response['choices'][0]['text'].strip()
            
            # 답변에서 A, B, C, D 추출
            answer = None
            for char in answer_text.upper():
                if char in ['A', 'B', 'C', 'D']:
                    answer = char
                    break
            
            if not answer:
                send_message('error', f'Could not extract valid answer from: {answer_text}')
                return
            
            send_message('complete', {'task': 'solve_problem', 'answer': answer})
            
        except Exception as e:
            send_message('error', f'Failed to solve problem: {str(e)}')

def main():
    send_message('status', 'Python backend ready')
    
    for line in sys.stdin:
        try:
            if not line.strip():
                continue
            data = json.loads(line)

            # 별도 스레드에서 처리
            threading.Thread(target=handle_command, args=(data,)).start()
            
        except json.JSONDecodeError:
            send_message('error', 'Invalid JSON format')
        except Exception as e:
            send_message('error', f'Unexpected error: {str(e)}')

if __name__ == "__main__":
    main()
