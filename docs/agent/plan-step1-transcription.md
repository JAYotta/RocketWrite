# 第一步实施计划：文字转录功能（ASR + Tiptap 编辑器集成）

## 1. 目标与范围

### 1.1 核心目标

实现语音实时转录为文字，并直接上屏到 Tiptap 编辑器，完成从"语音输入"到"文字输出"的基础流程。

### 1.2 功能范围

- ✅ 语音识别（ASR）：将语音流实时转换为文字
- ✅ Tiptap 编辑器集成：接收转录文字并显示在编辑器中
- ✅ 实时上屏：流式显示，检测到语音结束后处理并上屏
- ✅ 基础 UI：简化的界面，支持麦克风开关控制
- ❌ 暂不包括：语音修改、意图识别、去口语化等高级功能

### 1.3 技术选型

**前端框架：**

- React 18+ with TypeScript
- Vite 作为构建工具

**编辑器：**

- Tiptap (基于 ProseMirror)
- 使用 React 集成包 `@tiptap/react`

**语音识别方案（核心架构）：**

- **RealtimeSTT（本地服务）**
  - **RealtimeSTT**：Python 后端服务，基于 Whisper 的实时语音识别
  - **核心机制**：VAD 断句 + Growing Buffer Re-transcription（实时更正）
  - **优势**：
    - ✅ 效果最好（原生 RealtimeSTT 体验，实时更正）
    - ✅ 实现最简单（只需前端调用 API，无需实现 VAD + Growing Buffer）
    - ✅ 开发时间最短（2-3 小时即可完成）
    - ✅ 准确率高（基于 Whisper，中文支持优秀）
    - ✅ 完全本地，隐私极好（符合儿童数据保护要求）
  - **原理**：前端通过 WebSocket/HTTP 连接本地 RealtimeSTT 服务 → 发送音频流 → 接收实时转录结果（支持 Growing Buffer 实时更正）
  - **部署方式**：本地启动 Python 服务 + 前端开发服务器（个人使用，不需要打包）

## 2. 项目结构

```
/
├── frontend/                               # 前端项目根目录
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── audio-processor.js              # AudioWorklet 处理器（用于音频降采样）
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   ├── VoiceEditor.tsx        # 主编辑器组件
│   │   │   │   ├── VoiceEditor.module.css
│   │   │   │   └── extensions.ts          # Tiptap扩展配置
│   │   │   ├── VoiceControl/
│   │   │   │   ├── MicrophoneButton.tsx   # 麦克风控制按钮
│   │   │   │   ├── MicrophoneButton.module.css
│   │   │   │   └── VoiceVisualizer.tsx    # 声波动画（可选）
│   │   │   └── StatusIndicator.tsx        # 状态指示器（空闲/录音中/处理中）
│   │   ├── services/
│   │   │   └── asr/
│   │   │       └── RealtimeSTTService.ts  # RealtimeSTT 服务封装
│   │   ├── hooks/
│   │   │   ├── useRealtimeSTT.ts          # RealtimeSTT Hook
│   │   │   └── useTiptapEditor.ts         # Tiptap编辑器Hook
│   │   ├── utils/
│   │   │   └── editorConfig.ts            # 编辑器配置
│   │   └── types/
│   │       └── index.ts                   # TypeScript类型定义
│   └── README.md
├── backend/                                # 后端项目根目录
│   ├── server.py                           # Python WebSocket 服务端入口
│   ├── requirements.txt                    # Python 依赖（RealtimeSTT）
│   └── README.md
├── start.sh                                # 启动脚本（同时启动 RealtimeSTT 服务和前端）
└── README.md
```

## 3. 实施步骤

### 3.1 项目初始化（已完成）

**步骤：**

1. **创建项目结构**：建立 `frontend` 和 `backend` 目录。✅
2. **前端初始化 (`frontend`)**：✅
   - 在 `frontend` 目录下使用 Vite 初始化 React + TypeScript 项目。
   - **安装依赖**：
   - 编辑器核心：`@tiptap/react`, `@tiptap/starter-kit`
   - ProseMirror 类型：`@tiptap/pm`
3. **后端初始化 (`backend`)**：✅
   - 在 `backend` 目录下创建虚拟环境和 `requirements.txt`。
   - **安装依赖**：
   - 语音识别：`realtimestt`
   - 服务端框架：`fastapi`, `uvicorn`, `websockets`
   - 数学计算：`numpy`, `scipy`
   - 系统依赖：`portaudio` (macOS 需通过 brew 安装)
4. **环境配置**：✅
   - 确保 `frontend/tsconfig.json` 包含严格类型检查
   - 配置路径别名（可选）

### 3.2 后端服务开发（backend/server.py）（1-2 小时）

**目标**：在 `backend` 目录下创建 Python WebSocket 服务，作为 RealtimeSTT 库的接口层。

**实现逻辑：**

1. **初始化 FastAPI**：配置 CORS 允许跨域。
2. **初始化 Recorder**：配置 `AudioToTextRecorder`，设置模型（建议 tiny/base）、语言（zh）及 VAD 参数。
3. **WebSocket 端点**：
   - 接收前端发送的 Float32 或 Int16 音频数据块。
   - 调用 `recorder.feed_audio()` 喂入数据。
   - 通过回调将识别文本（区分 `realtime` 和 `final`）推回前端。

### 3.3 启动脚本创建（10 分钟）

**目标**：一键启动前后端。
**逻辑**：在根目录创建 `start.sh`，并行运行 `python backend/server.py` 和 `cd frontend && npm run dev`。

### 3.4 语音识别与编辑器连接（1-2 小时）

**前端服务层 (`RealtimeSTTService.ts`)：**

- **AudioWorklet**：加载 `audio-processor.js`，在独立线程处理音频降采样（防止主线程卡顿）。
- **WebSocket**：建立连接，将 Worklet 处理后的 PCM 数据流式发送给后端。
- **状态管理**：管理连接状态、错误重试。

**Hook 层 (`useRealtimeSTT.ts`)：**

- 封装 `start/stop` 方法。
- 暴露 `onFinal`（最终结果）和 `onInterim`（临时结果）回调。

### 3.5 Tiptap 编辑器集成（2-3 小时）

**核心逻辑：**

- **Hook 封装**：实现 `useTiptapEditor.ts`，配置编辑器参数（参考 `editorConfig.ts`）。
- **扩展配置**：在 `extensions.ts` 中配置 `StarterKit` 和自定义扩展。
- **最终结果处理**：直接调用 `insertContent` 插入文本。
- **临时结果处理**：调用自定义扩展 `InterimResultExtension`（在 `extensions.ts` 中定义），更新装饰器状态。

### 3.6 UI 组件开发（2-3 小时）

**组件清单：**

1. **MicrophoneButton** (`src/components/VoiceControl/MicrophoneButton.tsx`)

   - 显示录音状态（开启/关闭）
   - 点击切换录音状态
   - 视觉反馈（动画效果）

2. **VoiceVisualizer** (`src/components/VoiceControl/VoiceVisualizer.tsx`) (可选)

   - 接收音频音量/频率数据
   - 显示声波动画，增加互动感

3. **StatusIndicator** (`src/components/StatusIndicator.tsx`)

   - 显示当前状态：空闲/录音中/处理中
   - 简单的文字或图标提示

4. **VoiceEditor** 主界面整合
   - 布局：编辑器占据主要区域
   - 控制栏：麦克风按钮 + 状态指示器
   - 响应式设计（适配平板）

**样式要求：**

- 简洁清爽的界面
- 大号按钮（适合儿童操作）
- 明确的视觉反馈
- 适配深色模式（可选）

### 3.7 错误处理与边界情况（1-2 小时）

**需要处理的场景：**

- RealtimeSTT 服务未启动或连接失败
- 用户拒绝麦克风权限
- WebSocket 连接断开（需要重连）
- 服务端口被占用
- 编辑器状态异常

**实现方式：**

- 友好的错误提示和连接状态提示
- 服务连接状态检查
- 自动重连机制（可选）
- 权限引导
- 清晰的错误信息（如"请先启动 RealtimeSTT 服务"）

### 3.8 测试与优化（1-2 小时）

**测试内容：**

- 基础功能测试：RealtimeSTT 连接、音频流传输、转录结果上屏
- 边界测试：长时间录音、快速切换状态、服务重启
- 浏览器兼容性：Chrome、Edge、Safari、Firefox
- 实时更正测试：Growing Buffer 机制是否正常工作
- 准确性测试：不同说话速度、不同环境噪音

**优化方向：**

- WebSocket 连接稳定性优化
- 临时结果显示优化（如果需要显示实时更正过程）
- UI 响应速度优化

## 4. 技术细节

### 4.1 核心架构设计

**1. 音频采集与处理 (Frontend)**

- **AudioWorklet**：使用 `AudioWorkletProcessor` 在独立线程中处理音频流，避免 UI 阻塞。
- **降采样**：浏览器录音通常为 44.1kHz/48kHz，需降采样至 16kHz 以匹配 Whisper 模型要求。
- **数据传输**：通过 WebSocket 发送 Float32Array 或 Int16Array 原始 PCM 数据。

**2. 语音识别服务 (Backend)**

- **FastAPI + WebSocket**：提供长连接服务。
- **RealtimeSTT**：利用其 `feed_audio` 接口接收流式数据。
- **VAD + Growing Buffer**：后端自动处理静音检测和累积缓冲，实现“边说边改”的实时效果。

**3. 幽灵文字 (Ghost Text) 实现**

- **机制**：使用 ProseMirror 的 `Decoration` 机制，而非直接修改文档内容。
- **优势**：
  - **不污染撤销栈**：临时结果的变化不会被记录到 Undo History 中。
  - **视觉区分**：临时结果显示为灰色斜体，与正式文本区分。
  - **光标稳定**：避免因频繁插入/删除导致的输入光标跳动。
- **实现**：自定义 `InterimResultExtension`，通过 `Plugin` 的 `decorations` 属性渲染 Widget Decoration。

## 5. 后续优化方向（超出第一步范围）

### 5.1 性能优化

- **连接稳定性**：实现 WebSocket 自动重连机制
- **临时结果显示**：如果需要，可以显示实时更正过程
- **音频格式优化**：根据实际需求调整音频参数（采样率、比特率等）

## 6. 验收标准

### 6.1 功能完整性

- [x] 能够启动 RealtimeSTT 服务
- [x] 能够点击按钮开始/停止录音
- [x] 音频流能够正确发送到 RealtimeSTT 服务
- [x] 能够接收实时转录结果（支持 Growing Buffer 实时更正）
- [x] 转录结果能够正确显示在编辑器中
- [x] 识别延迟在可接受范围内（200-500ms，接近实时）

### 6.2 用户体验

- [x] 界面简洁，操作直观
- [x] 有明确的状态反馈（空闲/录音中/处理中）
- [x] 服务连接状态提示
- [x] 错误提示友好（服务未启动、连接失败等）
- [x] 响应流畅，无明显卡顿
- [x] 支持实时更正效果（Growing Buffer）

### 6.3 技术质量

- [x] 代码结构清晰，可维护
- [x] TypeScript 类型完整
- [x] WebSocket 连接管理良好（正确关闭连接）
- [x] 无明显的性能问题
- [x] 浏览器兼容性良好（Chrome、Edge、Safari、Firefox）
- [x] 启动脚本工作正常

## 7. 时间估算

| 任务                 | 时间估算         | 累计时间            |
| -------------------- | ---------------- | ------------------- |
| 项目初始化           | 1 小时           | 1 小时              |
| RealtimeSTT 服务集成 | 1-2 小时         | 3 小时              |
| 启动脚本创建         | 0.5 小时         | 3.5 小时            |
| Tiptap 编辑器集成    | 2-3 小时         | 6 小时              |
| 语音与编辑器连接     | 1-2 小时         | 8 小时              |
| UI 组件开发          | 2-3 小时         | 11 小时             |
| 错误处理与边界情况   | 1 小时           | 12 小时             |
| 测试与优化           | 1-2 小时         | 14 小时             |
| **总计**             | **9.5-14 小时**  | **~1.5-2 个工作日** |
| **总计 (优化后)**    | **11.5-16 小时** | **~2 个工作日**     |

**注意：**

- 相比 Whisper WASM 方案，时间大幅减少（约 50%）
- 主要优势：无需实现 VAD + Growing Buffer，直接使用成熟方案
- 效果最好：原生 RealtimeSTT 体验，实时更正

## 8. 风险与应对

### 8.1 RealtimeSTT 服务启动

**风险：** 服务未启动或启动失败  
**应对：**

- 提供清晰的启动脚本
- 前端检测服务连接状态
- 友好的错误提示（如"请先启动 RealtimeSTT 服务"）
- 在 README 中说明启动步骤

### 8.2 WebSocket 连接稳定性

**风险：** 连接可能断开或失败  
**应对：**

- 实现连接状态检测
- 友好的错误提示
- 可选：实现自动重连机制
- 处理连接超时

### 8.3 服务依赖

**风险：** 需要 Python 环境和 RealtimeSTT 安装  
**应对：**

- 在 README 中详细说明安装步骤
- 启动脚本可以自动检查环境
- 提供 requirements.txt 便于安装依赖

### 8.4 音频格式兼容性

**风险：** 音频格式可能需要调整（采样率、编码等）  
**应对：**

- 根据 RealtimeSTT 的文档调整音频参数
- 实现音频格式转换（如果需要）
- 测试不同浏览器的音频捕获差异

### 8.5 CORS 问题

**风险：** 前端和后端在不同端口，可能有 CORS 限制  
**应对：**

- RealtimeSTT 服务通常支持 CORS 配置
- 或者使用 Vite 代理
- 或者前端和后端使用同一域名（本地开发时）

### 8.6 API 文档不完整

**风险：** RealtimeSTT 的 API 文档可能不够详细  
**应对：**

- 查看 RealtimeSTT 的 GitHub 文档和示例
- 参考其官方示例代码
- 可能需要查看源码了解具体实现
