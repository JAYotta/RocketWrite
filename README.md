# 飞速作文：小学生语音写作效率工具 (RocketWrite)

## 项目简介

面向小学生的纯效率工具，通过语音技术消除物理书写障碍，帮助孩子将口语表达快速转化为书面文字。

## 快速启动

本项目包含三个主要服务：

1. **ASR 后端** (MLX Whisper): 运行在本地的语音识别服务。
2. **前端界面**: React 编辑器界面。
3. **Ollama**: 本地智能指令解析引擎 (Phase 2)。

### 1. 运行 ASR 后端

首次运行请先执行 `bash setup_mac.sh` (仅限 macOS)。

```bash
# 激活环境并启动
source .venv/bin/activate
python backend/server.py
```

_后端默认运行在 `http://localhost:8000`_

### 2. 运行前端

```bash
cd frontend
pnpm install
pnpm run dev
```

_前端默认运行在 `http://localhost:5173`_

### 3. 配置 Ollama (智能功能)

本项目使用 Ollama 提供本地智能指令解析。

```bash
# 启动 Ollama 并允许跨域访问
OLLAMA_ORIGINS="*" ollama serve

# 下载所需模型
ollama run qwen2.5-coder:1.5b
```

## 文档索引

### 核心文档

- [AGENTS.md](AGENTS.md) - Agent 开发上下文与状态
- [系统架构](docs/architecture.md)
- [研究文档](docs/research/)
- [启动指南细节](backend/README.md)

## License

Apache License 2.0
