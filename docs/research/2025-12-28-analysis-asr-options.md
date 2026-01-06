# ASR 技术选型分析（最终版）

## 1. 核心需求

### 1.1 第一步的核心目标
- ✅ 语音转录为文字
- ✅ 直接上屏到 Tiptap 编辑器
- ✅ 快速验证交互流程
- ✅ **隐私优先**（儿童数据保护）
- ✅ **效果优先**（给自己孩子用，不考虑打包）

**关键考虑因素：**
- 准确率（特别是儿童中文语音）
- 隐私保护（本地优先）
- 实现时间和复杂度
- 用户体验（实时反馈）

## 2. ASR 方案全景对比

### 2.1 方案概览表

| 方案 | 准确率 | 实时性 | 隐私 | 开发复杂度 | Mac 性能 | 推荐度 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Native MLX (Stateless)** | ⭐⭐⭐⭐⭐ 极高 | ⭐⭐⭐⭐ 快 (整句) | ⭐⭐⭐⭐⭐ | ⭐⭐ 低 | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Selected) |
| **Sherpa-ONNX** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 流式 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ (不稳定) | ⭐⭐⭐ |
| **RealtimeSTT** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 流式 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ 高 (Stateful) | ⭐⭐⭐⭐ (CPU) | ⭐⭐⭐⭐ (Phase 9 Ref) |
| **Whisper WASM** | ⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Web Speech API** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐ 低 | ⭐⭐ 极低 | ⭐⭐⭐ | ⭐⭐ |

## 3. 详细方案分析

### 3.1 Web Speech API
- **特点**：浏览器原生，零配置。
- **缺点**：准确率不足，隐私不可控。
- **结论**：仅适合原型，**不推荐**。

### 3.2 RealtimeSTT (Python Stateful)
- **特点**：基于 WebSocket 的长连接服务，内置 VAD 和 Growing Buffer，体验极佳（防抖）。
- **缺点**：Stateful 架构导致后端逻辑复杂，难以编写可靠的单元测试；在 Mac 上主要依赖 CPU/PyTorch，不如 MLX 高效。
- **结论**：作为 **Phase 9 (True Streaming)** 的技术标杆和参考，**Phase 1 不采用**。

### 3.3 Whisper WASM (Pure Frontend)
- **特点**：纯前端运行，无后端依赖。
- **缺点**：模型加载慢，占用浏览器内存，性能不如 Native 后端。
- **结论**：作为无法安装 Python 环境时的**降级方案**。

### 3.4 Vosk WASM
- **缺点**：中文模型效果一般。
- **结论**：**不推荐**。

### 3.5 Native MLX Backend (Mac-First) ⭐⭐⭐⭐⭐
- **核心技术**：`mlx-whisper` (Apple 官方优化)。
- **运行机制**：
    - 前端 VAD (vad-react) 切分静音片段。
    - 后端通过 HTTP 接收文件 -> MLX 快速推理 -> 返回文本。
- **优势**：
    - **性能极致**：利用 Mac GPU/NPU，4-bit 量化下速度极快 (<500ms)。
    - **架构极简**：后端无状态 (Stateless)，代码量少，稳定性 100%。
    - **隐私安全**：完全本地运行。
- **结论**：**Phase 1 最终选择方案**。

### 3.6 Sherpa-ONNX
- **运行机制**：通过 CoreML 调用 ANE (Neural Engine)。
- **Mac 现状**：
    - 性能不错，但 CoreML 算子覆盖不全，常出现 Operator Fallback (回退 CPU) 导致性能波动。
    - 依赖 ONNX Runtime，还需要专门下载 ONNX 模型，生态不如 MLX 直接。
- **结论**：在 Mac 平台上不如 MLX 原生方案。

## 4. 架构决策 (Phase 1)

**最终选择：Frontend VAD + Stateless MLX Backend**

1.  **前端 (React)**: 使用 `vad-react` (ONNX) 进行静音检测和音频切分。
2.  **通信**: HTTP POST (Stateless)。
3.  **后端 (Python)**: FastAPI + `mlx-whisper`，只负责计算，不维护状态。

**放弃 RealtimeSTT 的理由**：
我们由"繁"入"简"。RealtimeSTT 虽然体验好，但引入了复杂的流状态管理。对于 Phase 1，优先保证工程的**可测试性**和**稳定性**。

## 5. 关键技术概念

### 5.1 Growing Buffer (累积缓冲)
RealtimeSTT 的核心机制，通过不断重识别不断变长的音频缓冲来实现"流式更正"。

### 5.2 Stateless vs Stateful
- **Stateful (RealtimeSTT)**: 后端维护 Session 和 Buffer，网络断开需重连机制。
- **Stateless (MLX)**: 后端无状态，一次请求对应一次响应，天然容错。

## 6. 附录：RealtimeSTT 的"真·实时"体验标杆 (Phase 9 参考)

我们虽然在 Phase 1 选择了"整句上屏"，但 `RealtimeSTT` (库) 所实现的 **"Text Stabilization" (文本防抖)** 算法依然是行业标杆，也是我们 Phase 9 回归流式体验的参考标准。

### 6.1 什么是文本防抖 (Text Stabilization)？

当使用流式 ASR (如 Whisper Streaming) 时，你会发现随着更多音频输入，前面的文字会不断变化：

```
[0.5s] "今天"
[1.0s] "今天天" -> "今天去" (前面的字变了，屏幕闪烁)
[1.5s] "今天去哪"
```

这种"闪烁" (Flickering) 极度影响阅读体验。`RealtimeSTT` 通过以下机制解决了这个问题：

1.  **Longest Common Prefix (LCP)**：比较新旧两次转录结果，找出**绝对稳定**的前缀。
2.  **Locking Mechanism**：一旦前缀被锁定，就显示为"正式文本"（黑色），不再变化。
3.  **Future Buffer**：未锁定的后缀部分作为"幽灵文本"（灰色斜体）显示，允许下一帧变化。

**结论**：Phase 1 优先保证**准确和稳定** (整句上屏)，待架构成熟后，在 Phase 9 引入这套算法作为"体验增强包"。
