import os
import requests
from huggingface_hub import hf_hub_download, list_repo_files

def download_file(url, save_path, progress_callback=None):
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    block_size = 8192
    downloaded_size = 0
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=block_size):
            if chunk:
                f.write(chunk)
                downloaded_size += len(chunk)
                if progress_callback:
                    progress_callback(downloaded_size, total_size)
    
    return save_path

def download_model(repo_id, save_dir, filename=None, progress_callback=None):
    # filename이 지정되지 않은 경우, 자동으로 적절한 GGUF 파일을 찾음
    if not filename:
        try:
            files = list_repo_files(repo_id)
            gguf_files = [f for f in files if f.endswith('.gguf')]
            
            if not gguf_files:
                raise ValueError(f"No GGUF files found in repository {repo_id}")
            
            # 우선순위: Q4_K_M > Q5_K_M > Q8_0 > 첫 번째 발견된 파일
            preferred_quants = ['Q4_K_M', 'Q5_K_M', 'Q8_0']
            selected_file = None
            
            for quant in preferred_quants:
                for f in gguf_files:
                    if quant in f:
                        selected_file = f
                        break
                if selected_file:
                    break
            
            if not selected_file:
                selected_file = gguf_files[0]
                
            filename = selected_file
            # print(f"Auto-selected model file: {filename}")
            
        except Exception as e:
            raise ValueError(f"Failed to auto-select model file: {str(e)}")

    os.makedirs(save_dir, exist_ok=True)
    
    # hf_hub_download는 캐시를 사용하지만, local_dir을 사용하면 지정된 폴더에 다운로드 함
    path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        local_dir=save_dir,
        local_dir_use_symlinks=False
    )
    
    return path
