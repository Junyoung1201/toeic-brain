@echo off
cd /d "%~dp0"
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt

::
:: 12.1 CUDA 또는 12.8 CUDA 중 하나 선택
::

:: pyTorch (12.1 CUDA)
pip install --force-reinstall --pre torch --index-url https://download.pytorch.org/whl/cu121

:: pyTorch (12.8 CUDA)
:: pip install --force-reinstall --pre torch --index-url https://download.pytorch.org/whl/nightly/cu128

::
:: 개발 환경일 경우 아래 주석 해제
::

:: call npm install
:: call npm run build