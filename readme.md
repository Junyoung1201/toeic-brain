## ToeicBrain
자동으로 토익 LC, RC 문제를 풀고 답안을 출력하는 프로그램입니다.<br/>
Faster-Whisper와 로컬 LLM을 사용하여 **오프라인에서도 구동 가능**합니다.<br/>
Faster-Whisper 모델은 무조건 Large-v3를 사용하며, 문제풀이를 위한 LLM은 vram 용량에 따라 다른 모델을 다운로드 받습니다.

## 시스템 요구사항
- **최소 8GB VRAM**이 필요합니다.
- **Nvidia GPU**만 지원합니다. (CUDA 사용)
- VRAM 용량에 따라 프로그램에서 사용하는 모델이 다르므로 VRAM이 클수록 좋습니다. VRAM에 따른 모델 사용은 아래를 참고해주세요.

## 개발 환경
<b>백엔드:</b> python 1.0 + nodejs + typescript + electron<br/>
<b>프론트(렌더러):</b> typescript + vite + react + react redux toolkit

## 기호표
<a href="https://drive.google.com/u/0/drive-viewer/AKGpihYhfXiSWo3MTLKo6VEW6UoGgPIah6LpD-ueSgi0xElX1xKGbLoL8pzegR4jRg22k0mY5ANoEydrbD9QG3d7il7y3lbsaFUZvg=s1600-rw-v1">기호표</a>
