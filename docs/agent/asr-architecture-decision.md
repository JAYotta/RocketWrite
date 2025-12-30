# ASR 架构决策 (Agent Reference)

**Status**: Accepted (2025-12-30)
**Context**: Project RocketWrite (Offline-First AI Writing Assistant for Kids)

## 1. 核心决策：Frontend VAD + Stateless MLX Backend

我们放弃了复杂的 RealtimeSTT (Stateful Streaming) 方案，采用了 **Stateless Sentence-Level** 架构。

### 1.1 架构图

```mermaid
graph LR
    User[用户说话] -->|Vad-React 检测| Frontend[前端 (React)]
    Frontend -->|静音切分| AudioFile[Audio Blob (WAV)]
    AudioFile -->|HTTP POST| Backend[后端 (FastAPI)]
    Backend -->|MLX Whisper| ASR_Model[Whisper (4-bit)]
    ASR_Model -->|Text| Frontend
    Frontend -->|Insert| Editor[Tiptap]
```

### 1.2 关键组件

| 组件 | 选型 | 职责 | 理由 |
| :--- | :--- | :--- | :--- |
| **VAD** | `vad-react` (Silero ONNX) | 浏览器端静音检测、切分 | 减轻后端压力，交互零延迟，Stateless |
| **Server** | `FastAPI` | 接收文件，调用推理 | Python 生态标准，轻量级 |
| **Inference** | `mlx-whisper` | 音频转文字 | Mac (Quick) 性能最佳，显存占用低 |
| **Mechanism** | Sentence-Level | 整句上屏 | 避免流式防抖的复杂度，100% 稳定 |

## 2. 废弃方案 (Rejected)

- **RealtimeSTT (Python Lib)**: 虽然功能强大 (Buffering, Wake Word)，但作为 Statefull 后端，维护 WebSocket 状态极其复杂，且不易编写单元测试。
- **Web Speech API**: 准确率不足，隐私不可控。
- **Sherpa-ONNX**: 在 Mac 上对 CoreML 支持不稳定 (Operator Fallback)，不如 MLX 原生。

## 3. 未来路径 (Phase 9)

当需要回归 **"真·实时流式 (True Streaming)"** 体验时：
1.  **Frontend**: 引入 Text Stabilization 算法 (LCP) 消除闪烁。
2.  **Backend**: 改造 MLX 为 Generator 模式输出 Token 流。
3.  此阶段仅为了提升 UX，不改变后端 Stateless 的核心优势（后端只管吐流，前端管拼接）。
