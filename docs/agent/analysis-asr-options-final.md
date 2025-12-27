# ASR 技术选型分析（最终版）

## 1. 核心需求

### 1.1 第一步的核心目标

- ✅ 语音转录为文字
- ✅ 直接上屏到 Tiptap 编辑器
- ✅ 流式显示（支持 Growing Buffer Re-transcription 的实时更正效果）
- ✅ 快速验证交互流程
- ✅ **隐私优先**（儿童数据保护）
- ✅ **效果优先**（给自己孩子用，不考虑打包）

**关键考虑因素：**

- 准确率（特别是儿童中文语音）
- 隐私保护（本地优先）
- 实现时间和复杂度
- 用户体验（实时更正、低延迟）

## 2. ASR 方案全景对比

### 2.1 方案概览表

| 方案                        | 准确率        | 实时性          | 隐私            | 开发复杂度    | 中文支持        | 推荐度     |
| --------------------------- | ------------- | --------------- | --------------- | ------------- | --------------- | ---------- |
| **Web Speech API**          | ⭐⭐⭐ 中     | ⭐⭐⭐⭐⭐ 极好 | ⭐⭐ 中         | ⭐⭐ 极低     | ⭐⭐⭐ 一般     | ⭐⭐⭐     |
| **Whisper WASM**            | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中等     | ⭐⭐⭐⭐⭐ 极好 | ⭐⭐⭐⭐ 中高 | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐   |
| **RealtimeSTT（本地服务）** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 极好 | ⭐⭐⭐⭐⭐ 极好 | ⭐⭐ 低       | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐⭐⭐ |
| **Vosk WASM**               | ⭐⭐⭐⭐ 较高 | ⭐⭐⭐⭐ 好     | ⭐⭐⭐⭐⭐ 极好 | ⭐⭐⭐ 中     | ⭐⭐⭐ 一般     | ⭐⭐⭐     |

**注意**：

- RealtimeSTT 作为 Python 后端库，可以通过本地服务的方式使用（不需要打包）
- 如果只需要给自己孩子用，这是最简单且效果最好的方案

## 3. 详细方案分析

### 3.1 Web Speech API

**成熟度：** ⭐⭐⭐⭐⭐ 非常成熟

**技术特点：**

- 浏览器原生 API，零配置
- 真正的流式识别（逐字上屏）
- 延迟极低（<100ms）

**适用场景：**

- 快速原型验证
- 对准确率要求不高的场景
- 需要立即看到效果

**不适合的场景：**

- 儿童语音识别（准确率不够）
- 隐私要求高的场景（数据上传云端）
- 需要长期使用的产品

**结论：** 适合快速验证，不适合最终产品

### 3.2 RealtimeSTT（本地服务）⭐⭐⭐⭐⭐ 最推荐

**成熟度：** ⭐⭐⭐⭐ 成熟

**项目信息：**

- GitHub: https://github.com/KoljaB/RealtimeSTT
- 基于 Whisper 的实时语音识别
- Python 后端库，可作为本地服务运行

**核心机制：VAD 断句 + Growing Buffer Re-transcription**

- VAD 检测语音开始 → 开始累积音频缓冲
- 每隔 500ms 左右，对当前累积的整个音频缓冲重新识别
- 用户看到识别结果在不断更正和改进
- VAD 检测语音结束 → 输出最终结果

**技术特点：**

- ✅ **真正的实时识别和更正**：Growing Buffer 机制，用户看到结果实时改进
- ✅ **低延迟**：200-500ms
- ✅ **基于 Whisper**：准确率高，中文支持优秀
- ✅ **本地运行**：完全本地，隐私极好
- ✅ **无需自己实现 VAD + Growing Buffer**：已集成，开箱即用

**实现方式（本地服务模式）：**

```bash
# 1. 安装 RealtimeSTT
pip install realtimestt

# 2. 启动本地服务
python -m realtimestt.server --port 8000
```

```typescript
// 前端通过 WebSocket 或 HTTP 连接
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.text - 转录结果
  // data.is_final - 是否最终结果
  updateEditor(data.text, data.is_final);
};

// 发送音频流
stream.getTracks().forEach((track) => {
  // 将音频流发送到 RealtimeSTT
});
```

**优势：**

- ✅ **最佳体验**：原生 RealtimeSTT 体验，实时更正
- ✅ **实现简单**：只需前端调用 API，无需实现 VAD + Growing Buffer
- ✅ **开发时间最短**：2-3 小时即可完成集成
- ✅ **效果最好**：直接使用成熟的解决方案
- ✅ **隐私极好**：完全本地运行

**劣势：**

- ⚠️ 需要启动本地 Python 服务（但可以写启动脚本）
- ⚠️ 需要安装 Python 环境（个人使用可接受）

**适合场景：**

- ✅ 个人使用（给自己孩子用）
- ✅ 不需要打包部署
- ✅ 效果优先，实现时间优先
- ✅ 可以接受启动时运行两个服务（前端 + Python 服务）

**结论：** **强烈推荐**，特别是对于个人使用场景

### 3.3 Whisper WASM（分块处理）

**成熟度：** ⭐⭐⭐⭐ 较为成熟

**技术特点：**

- 基于 OpenAI Whisper 模型
- 编译为 WebAssembly，浏览器中运行
- 需要自己实现分块处理或 VAD + Growing Buffer

**优势：**

- ✅ 准确率高（特别是中文）
- ✅ 完全本地，隐私极好
- ✅ 支持标点符号自动添加
- ✅ 可以针对儿童语音微调模型
- ✅ 浏览器兼容性好（所有支持 WASM 的浏览器）

**劣势：**

- ⚠️ 需要自己实现 VAD + Growing Buffer（如果要有 RealtimeSTT 的体验）
- ⚠️ 延迟较高（固定分块：1-2 秒；VAD + Growing Buffer：实现复杂）
- ⚠️ 模型体积大（75-140MB）
- ⚠️ 首次加载慢（5-15 秒）
- ⚠️ 内存占用高（100-200MB）
- ⚠️ 实现复杂度高（6-10 小时，包含 VAD + Growing Buffer）

**固定分块处理的问题：**

- ❌ 无法实现"实时更正"效果
- ❌ 可能切词（即使有重叠窗口）
- ⚠️ 需要实现重叠窗口机制避免切词
- ⚠️ 必须使用 Web Worker 避免 UI 阻塞

**VAD + Growing Buffer 实现：**

- ✅ 可以复刻 RealtimeSTT 的体验
- ❌ 实现复杂度高（需要集成 Silero VAD、实现 Growing Buffer 逻辑）
- ❌ 开发时间长（6-10 小时）

**结论：** 如果可以选择本地服务，RealtimeSTT 更简单；如果必须是纯浏览器方案，Whisper WASM 是选择

### 3.4 Vosk WASM

**成熟度：** ⭐⭐⭐⭐ 成熟

**技术特点：**

- ✅ 轻量级（模型体积小：20-50MB）
- ✅ 低延迟（支持真正的流式识别）
- ✅ 完全离线（隐私极好）
- ❌ 中文支持有限（主要针对英文优化，中文准确率一般）

**结论：** **不推荐**（中文支持不足）

## 4. 针对第一步的推荐方案

### 4.1 方案 A：RealtimeSTT（本地服务）⭐⭐⭐⭐⭐ 最推荐

**推荐理由：**

1. ✅ **效果最好**：原生 RealtimeSTT 体验，实时更正
2. ✅ **实现最简单**：只需前端调用 API
3. ✅ **开发时间最短**：2-3 小时即可完成
4. ✅ **准确率高**：基于 Whisper，中文支持优秀
5. ✅ **隐私极好**：完全本地运行
6. ✅ **无需自己实现复杂逻辑**：VAD + Growing Buffer 已集成

**实现复杂度：** ⭐⭐ 低（2-3 小时）

**实现步骤：**

1. **安装和启动 RealtimeSTT**（10 分钟）

   ```bash
   pip install realtimestt
   python -m realtimestt.server --port 8000
   ```

2. **前端集成**（1-2 小时）

   - 创建 WebSocket 连接
   - 发送音频流
   - 接收转录结果
   - 集成到 Tiptap 编辑器

3. **启动脚本**（10 分钟）
   ```bash
   # start.sh
   python -m realtimestt.server --port 8000 &
   npm run dev
   ```

**技术栈：**

- RealtimeSTT（Python 服务）
- React + TypeScript（前端）
- WebSocket 或 HTTP API（通信）
- Tiptap（编辑器）

**适合场景：**

- ✅ 个人使用（给自己孩子用）
- ✅ 不需要打包部署
- ✅ 效果优先，实现时间优先

### 4.2 方案 B：Whisper WASM + VAD + Growing Buffer ⭐⭐⭐⭐

**推荐理由：**

1. ✅ **准确率高**：特别是中文识别
2. ✅ **隐私极好**：完全本地
3. ✅ **纯浏览器方案**：不需要后端服务
4. ✅ **可以复刻 RealtimeSTT 体验**：VAD + Growing Buffer

**实现复杂度：** ⭐⭐⭐⭐ 中高（6-10 小时）

**技术栈：**

- Silero VAD（@ricky0123/vad-web）- 语音活动检测
- Whisper WASM（@xenova/transformers）- 转录
- 需要实现 Growing Buffer Re-transcription 逻辑

**适合场景：**

- 必须是纯浏览器方案
- 不能运行本地服务
- 需要打包部署

**说明：**

- 如果可以选择本地服务，RealtimeSTT 更简单
- 如果需要纯浏览器方案，这是可行的选择

### 4.3 方案 C：Whisper WASM（固定分块）⭐⭐⭐

**推荐理由：**

1. ✅ **准确率高**
2. ✅ **隐私极好**
3. ⚠️ **实现相对简单**（不需要 VAD）

**问题：**

- ❌ 无法实现实时更正效果
- ❌ 可能切词（需要重叠窗口）
- ⚠️ 延迟较高（1-2 秒）
- ⚠️ 必须使用 Web Worker

**结论：** 不推荐，除非时间非常紧迫且可以接受较差体验

### 4.4 方案 D：Web Speech API ⭐⭐⭐

**推荐理由：**

1. ✅ **开发最快**（2-3 小时）
2. ✅ **真正的实时**（延迟极低）

**问题：**

- ❌ **准确率不够**（特别是儿童语音）
- ❌ **隐私问题**（数据可能上传云端）

**结论：** 仅适合快速原型验证，不适合最终产品

## 5. 关键技术概念

### 5.1 Growing Buffer Re-transcription（累积缓冲重识别）

**机制说明：**

这是 RealtimeSTT 等高质量实时语音转写的核心机制：

```
时间线：
[0s] VAD 检测到语音开始 → 开始累积缓冲
[0.5s] 识别 [0-0.5s] 的音频 → "今天"
[1.0s] 重新识别 [0-1.0s] 的音频 → "今天天气"（更正了前面的结果）
[1.5s] 重新识别 [0-1.5s] 的音频 → "今天天气很好"（再次更正）
[2.0s] VAD 检测到语音结束 → 输出最终结果
```

**优势：**

- ✅ 避免切词（每次都识别整句）
- ✅ 实时更正（用户看到结果在改进）
- ✅ 更准确（利用更多上下文）

**为什么需要 VAD：**

- VAD 检测语音开始：决定何时开始累积缓冲
- VAD 检测语音结束：决定何时停止并输出最终结果
- 支持 Growing Buffer：只有在有语音时才累积和处理

### 5.2 固定分块处理的问题

**问题：**

```typescript
// 固定分块的问题
[0-3s] → 识别 → "今天天气很" ❌ 不完整
[3-6s] → 识别 → "好我去公园" ❌ 切词了，且无法修正前面的结果
```

**即使有重叠窗口：**

- 仍然可能切词（如果句子边界不在重叠区域）
- 无法实现"持续更正"的效果
- 每块独立处理，无法利用上下文

**结论：** 如果要实现 RealtimeSTT 级别的体验，固定分块是不够的，需要 VAD + Growing Buffer

## 6. 最终推荐

### 6.1 第一步推荐：RealtimeSTT（本地服务）⭐⭐⭐⭐⭐

**推荐理由：**

1. ✅ **效果最好**：原生 RealtimeSTT 体验
2. ✅ **实现最简单**：只需前端调用 API
3. ✅ **开发时间最短**：2-3 小时
4. ✅ **准确率高**：基于 Whisper，中文支持优秀
5. ✅ **隐私极好**：完全本地运行
6. ✅ **无需自己实现复杂逻辑**：VAD + Growing Buffer 已集成

**适用场景：**

- ✅ 个人使用（给自己孩子用）
- ✅ 不需要打包部署
- ✅ 效果优先，实现时间优先
- ✅ 可以接受启动时运行本地服务

### 6.2 备选方案：Whisper WASM + VAD + Growing Buffer

**适用场景：**

- 必须是纯浏览器方案
- 不能运行本地服务
- 需要打包部署

**说明：**

- 实现复杂度高（6-10 小时）
- 需要自己实现 VAD + Growing Buffer 逻辑
- 如果可以选择，RealtimeSTT 更简单

### 6.3 不推荐

- **Whisper WASM（固定分块）**：无法实现实时更正效果
- **Web Speech API**：准确率不够，隐私问题
- **Vosk WASM**：中文支持不足

## 7. 技术实现建议

### 7.1 RealtimeSTT（本地服务）实现

**启动脚本：**

```bash
#!/bin/bash
# start.sh

# 启动 RealtimeSTT 服务（后台运行）
python -m realtimestt.server --port 8000 &

# 启动前端开发服务器
npm run dev
```

**前端集成示例：**

```typescript
// src/services/asr/RealtimeSTTService.ts
export class RealtimeSTTService {
  private ws: WebSocket | null = null;

  async start(callbacks: {
    onTranscript: (text: string, isFinal: boolean) => void;
  }) {
    // 连接到本地 RealtimeSTT 服务
    this.ws = new WebSocket("ws://localhost:8000/ws");

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callbacks.onTranscript(data.text, data.is_final);
    };

    // 获取麦克风音频流
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 将音频流发送到 RealtimeSTT
    // （根据 RealtimeSTT 的具体 API 实现）
    this.sendAudioStream(stream);
  }

  stop() {
    this.ws?.close();
  }
}
```

**注意事项：**

- 需要查看 RealtimeSTT 的具体 API 文档
- 可能需要调整音频格式（采样率等）
- 如果前端和后端在不同端口，需要配置 CORS 或使用代理

### 7.2 抽象层设计（支持未来切换）

```typescript
// src/services/asr/ASRProvider.ts
interface ASRProvider {
  start(): Promise<void>;
  stop(): void;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  isSupported(): boolean;
}

// RealtimeSTT 实现
class RealtimeSTTProvider implements ASRProvider { ... }

// Whisper WASM 实现（备选）
class WhisperWASMProvider implements ASRProvider { ... }

// Web Speech API 实现（仅用于开发）
class WebSpeechProvider implements ASRProvider { ... }
```

## 8. 结论

### 8.1 最终推荐

**第一步推荐：RealtimeSTT（本地服务）**

**理由：**

1. ✅ **效果最好**：原生 RealtimeSTT 体验，实时更正
2. ✅ **实现最简单**：只需前端调用 API，无需实现复杂逻辑
3. ✅ **开发时间最短**：2-3 小时即可完成
4. ✅ **准确率高**：基于 Whisper，中文支持优秀
5. ✅ **隐私极好**：完全本地运行，符合儿童数据保护要求

### 8.2 关键要点

- **RealtimeSTT（本地服务）是最佳选择**：对于个人使用场景，这是最简单且效果最好的方案
- **无需自己实现 VAD + Growing Buffer**：RealtimeSTT 已集成，开箱即用
- **启动方式简单**：写一个启动脚本即可，运行两个服务
- **如果必须是纯浏览器方案**：可以使用 Whisper WASM + VAD + Growing Buffer，但实现复杂度高
- **隐私优先**：所有推荐方案都是本地运行，符合儿童数据保护要求

### 8.3 实施建议

**推荐方案：**

1. **第一步**：使用 RealtimeSTT（本地服务）

   - 时间估算：2-3 小时
   - 效果最好，实现最简单

2. **备选方案**：如果必须是纯浏览器方案
   - 使用 Whisper WASM + VAD + Growing Buffer
   - 时间估算：6-10 小时
   - 实现复杂度高，但可以达到类似效果
