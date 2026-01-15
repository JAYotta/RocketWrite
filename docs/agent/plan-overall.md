# 整体项目计划：小学生语音写作效率工具

## 1. 项目概述

### 1.1 核心定位

面向小学生的**纯效率工具**，通过语音技术消除物理书写障碍，帮助孩子将口语表达快速转化为书面文字，解决"想得出写不出"的效率问题。

### 1.2 核心原则

- **非生成式**：严格禁止 AI 生成内容，只做转录和编辑指令解析
- **纯效率工具**：不提供教学引导、建议或评分功能
- **语音优先**：全语音交互，参考 Serenade.ai 和 iOS Voice Control 的交互模式
- **隐私优先**：优先考虑本地部署，保护未成年人数据

### 1.3 目标用户

- 主要用户：小学生（2-6 年级）
- 使用场景：家庭作业、作文草稿录入
- 痛点：手写速度慢（10-15 字/分钟），草稿修改麻烦

## 2. 技术架构

### 2.1 技术栈

**前端：**

- React 18+ with TypeScript
- Tiptap（无头编辑器框架，基于 ProseMirror）
- Vite（构建工具）

**语音识别（ASR）：**

- **核心方案**：Native MLX Backend (Mac-First)
- **实现原理**：前端 VAD (ONNX) + 后端 MLX Whisper (FastAPI)
- **通信模式**：HTTP Post (Sentence-Level) / WebSocket (Future)
- **备选**：Whisper WASM（纯前端方案降级）

**自然语言理解（NLU）：**

- **核心方案**：Ollama (Local Inference)
- **模型**：Qwen2.5-Coder-1.5B (JSON Optimized)
- **框架**：Vercel AI SDK (Frontend) + `generateObject`
- **原则**：仅用于指令解析，禁止内容生成

**语音合成（TTS，可选）：**

- 用于反馈确认（"找到 2 处，请说数字"）
- 本地 TTS 引擎或轻量级云端 API

### 2.2 系统架构图

详见 [系统架构文档](../architecture.md)

## 3. 功能模块

### 3.1 阶段一：文字转录（当前计划）

**目标：** 实现语音转文字的基础功能

**功能清单：**

- [x] Python 本地服务搭建 (FastAPI + MLX-Whisper)
- [x] 前端 VAD 集成 (@ricky0123/vad-react)
- [x] 录音状态管理 (Listening/Processing)
- [x] Tiptap 编辑器基础配置
- [x] 整句转录与上屏 (Sentence-Level)
- [ ] 幽灵文字 (Ghost Text) 装饰器实现 (延迟至后续优化)
- [x] 基础 UI（悬浮麦克风按钮、HeroUI v3、Glassmorphism）

**技术方案：**

- 采用 Client-Server 架构 (Localhost)
- 前端负责 VAD 切分，后端负责纯净音频转录 (Stateless)

**时间估算：** 2-3 个工作日

**详细计划：** 见 [plan-step1-transcription.md](plan-step1-transcription.md)

### 3.2 阶段一延伸：工程化封装 (Phase 1.5)

**目标：** 降低本地 Python 服务的启动门槛，作为 Phase 2 的坚实基础。

**功能清单：**

- [ ] 启动脚本 (Start Script) 整合 Ollama + Python Server
- [ ] 错误边界处理 (服务健康检查)
- [ ] 延迟优化 (AudioWorklet 调优)

**时间估算：** 随 Phase 2 并行推进

### 3.3 阶段二：MVP 与 最小集验证 (POC Mock) <!-- Phase 2.1 -->

**目标：** 完成基础设施搭建，并通过双侧独立验证消除风险。

**功能清单：**

- [x] **Infrastructure Setup (基础设施前置)**:
  - [x] Ollama 服务搭建 (Qwen2.5-Coder-1.5B) ✅ 已完成
  - [x] Vercel AI SDK 依赖安装 (`ai`, `zod`, `ai-sdk-ollama`) ✅ 已完成
- [x] **Tool Registry 定义 (前置)**:
  - [x] 定义核心工具的 Zod Schema (`insertText`, `deleteText`, `replaceText`, `applyFormat`, `undo`, `redo`) ✅ 已完成
  - [x] 创建工具定义文件 (`frontend/src/schemas/editor-commands.ts`) ✅ 已完成
  - [x] 创建核心类型文件 (`frontend/src/utils/editor-commands.ts`) ✅ 已完成
  - [x] 注：完整集成在阶段三，但定义需要在阶段二完成（供测试使用）✅ 已完成
- [x] **基础命令执行器 (前置)**:
  - [x] 实现基础的命令执行函数（支持所有命令类型）✅ 已完成
  - [x] 创建命令执行器文件 (`frontend/src/utils/commandExecutor.ts`) ✅ 已完成
  - [x] 支持 range 坐标操作 ✅ 已完成
  - [x] 注：完整实现（包括复杂文本定位）在阶段三，但基础版本需要在阶段二完成（供测试使用）✅ 已完成
- [ ] **Schema 提取工具** (未来考虑):
  - [ ] 实现 Schema 信息提取函数 (`extractSchemaInfo`)
  - [ ] 注：当前 Schema 固定，可在 System Prompt 中硬编码；动态扩展时再实现
- [ ] **Validation (双侧验证)**:
  - [ ] 后端脚本验证 (`scripts/test-backend.ts`) - 使用 Tool Registry 定义验证输出
  - [x] 单元测试验证 (`frontend/src/__tests__/`) - 使用命令执行器验证执行逻辑 ✅ 已完成

**技术方案：**

- 详见 [Phase 2 POC 验证计划](plan-step2-minimal-poc.md)

**时间估算：** 2-3 个工作日（包含 Tool Registry 定义和基础命令执行器）

### 3.4 阶段三：完整智能指令解析 (Local AI Toolkit) <!-- Phase 2.2 -->

**目标：** 移除 Mock，实现端到端的自然语言指令控制。

**功能清单：**

- [ ] **Integration (端到端集成)**:
  - [ ] `useChat` Hook 对接本地 Ollama API
  - [ ] 移除 Mock Provider（或保留作为 Debug 模式）
  - [ ] 实现指令路由逻辑（区分"内容输入"和"编辑指令"）
- [ ] **Command Bridge 完善 (指令解析)**:
  - [x] Tool Registry 定义（已在阶段二完成）
  - [ ] 完善命令执行器（实现复杂文本定位："第一段"、"第二句"等）
  - [ ] 实现文本定位逻辑 (`findTextPosition`)
  - [ ] 意图分类与参数提取（LLM 调用）
- [ ] **Schema & Context 完整实现**:
  - [ ] Schema 提取工具实现（阶段二标记为未来考虑，阶段三需要实现）
  - [ ] Schema 约束注入到 System Prompt（完整实现）
  - [ ] Context 提取（滑动窗口策略）
  - [ ] Context 注入到请求
- [ ] **UX/UI**:
  - [ ] "Ask AI" 悬浮菜单 (参考 Novel.sh)
  - [ ] Diff 预览 (基于 `prosemirror-suggestion-mode`)
  - [ ] 确认/拒绝交互
  - [ ] 加载状态和错误处理

**技术方案：**

- 详见 [Phase 3 实施计划](plan-step3-intelligence.md)

**时间估算：** 3-5 个工作日

### 3.5 阶段四：去口语化处理

**目标：** 智能过滤口语中的非流利成分

**功能清单：**

- [ ] 填充词过滤（"那个"、"然后"、"就是"）
- [ ] 重复修正识别（"蓝色的，不对，红色的" → "红色的"）
- [ ] 语法错误保留（仅标记，不自动修正）
- [ ] 可配置的过滤规则

**技术方案：**

- 规则引擎 + 轻量级 LLM 辅助判断
- 区分"修正意图"和"语法错误"

**时间估算：** 3-4 个工作日

### 3.6 阶段五：标点与格式自动化

**目标：** 自动处理标点和段落格式

**功能清单：**

- [ ] 基于停顿自动添加标点
- [ ] 语调识别（问句、感叹句）
- [ ] 自动分段（长停顿识别）
- [ ] 格式指令支持（"标题"、"加粗"等）

**时间估算：** 2-3 个工作日

### 3.7 阶段六：高级交互优化

**目标：** 完善用户体验和性能优化

**功能清单：**

- [ ] 同音字可视化选择（图标选择，非文字列表）
- [ ] 语音反馈（TTS 确认操作）
- [ ] 撤销/重做优化
- [ ] 长文档性能优化
- [ ] 离线模式支持

**时间估算：** 4-5 个工作日

### 3.8 阶段七：ASR 升级（可选）

**目标：** 提升语音识别准确率

**功能清单：**

- [ ] Whisper WASM 集成
- [ ] 模型量化优化（平衡准确率和性能）
- [ ] 儿童语音数据集微调（可选）
- [ ] 云端 API 备选方案

**时间估算：** 5-7 个工作日

### 3.9 阶段八：跨平台与原生化 (Cross-platform & Native)

**目标**：打破 Python 依赖，实现全平台覆盖与极致性能。

**路径 A：Hybrid Engine (Desktop Cross-platform)**

- **架构**：Election/Tauri + Python Backend (打包)。
- **适配**：
  - Windows/Linux: 使用 `Faster-Whisper` (CUDA/CPU)。
  - macOS: 使用 `MLX-Whisper` (Python 绑定)。

**路径 B：Pure Native (Apple Ecosystem)**

- **技术栈**：Swift + SwiftUI + **MLX Swift**。
- **核心优势**：
  - **`mlx-swift`**：Apple 官方提供的 Swift 接口，直接在 Swift 中调用 MLX 模型，无需 Python 环境。
  - **性能**：零跨语言损耗，内存占用更低。
  - **分发**：符合 Mac App Store 审核标准 (Sandbox Friendly)。

### 3.10 阶段九：真·实时流式升级 (True Streaming)

**目标**：在架构稳定后，回归"字字蹦出"的极致体验。

**参考标准**：复刻 `RealtimeSTT` 的抗抖动体验 (详见分析文档)。

**技术方案**：

- **Backend Streaming**：将 MLX/Whisper 接口改造为 Generator，输出 Token 流。
- **Frontend Algo**：即 "Stabilization Algorithm"，通过比对新旧 Token 流的 LCP (Longest Common Prefix) 来决定上屏时机，消除屏幕闪烁。

## 4. 核心交互流程

### 4.1 文字录入流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 界面
    participant ASR as 语音识别
    participant Editor as 编辑器

    User->>UI: 点击麦克风按钮
    UI->>ASR: 开始录音
    ASR->>UI: 实时识别结果
    UI->>Editor: 插入文本
    Editor->>User: 显示文字
    User->>UI: 点击停止
    UI->>ASR: 停止录音
```

### 4.2 语音编辑流程（阶段三）

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 界面
    participant User as 用户
    participant UI as 界面
    participant ASR as 语音识别 (Server)
    participant SDK as Vercel AI SDK
    participant Ollama as 本地模型 (Qwen)
    participant Editor as 编辑器

    User->>UI: 按住空格键 + "删掉'高兴'"
    UI->>ASR: 识别语音
    ASR->>UI: 返回 "删掉高兴"
    UI->>SDK: append("删掉高兴")
    SDK->>Ollama: generateObject (Zod Schema)
    Ollama->>SDK: JSON { type: "deleteText", args: { text: "高兴" } }
    SDK->>Editor: Dispatch Command
    Editor->>UI: 显示 Diff 预览 (Red Strikethrough)
    UI->>User: 确认?
    User->>UI: 确认
    UI->>Editor: Commit Transaction
```

### 4.3 数字编号选择机制

**设计参考：** iOS Voice Control

**实现方式：**

1. 检测到歧义（如多个匹配项）
2. 在文本上显示数字标签（1、2、3...）
3. TTS 语音提示："找到 3 处，请说数字"
4. 用户说出数字选择
5. 高亮对应项，等待确认

**UI 示例：**

```
今天天气很好 [1]，我去公园玩了
昨天天气也很好 [2]，我在家里
```

## 5. 技术难点与解决方案

### 5.1 歧义处理

**问题：** "把'他'改成'小明'"——如果文中有多个"他"？

**解决方案：**

- 数字编号选择机制（参考 iOS Voice Control）
- 最近优先原则（优先选择光标附近）
- 上下文语义分析（LLM 辅助判断）

### 5.2 延迟优化

**问题：** LLM 推理延迟（100-300ms）+ ASR 延迟（200ms）= 总延迟可能超过 500ms

**解决方案：**

- 乐观 UI 更新（先显示临时结果）
- 本地轻量级 LLM（避免网络延迟）
- 规则引擎旁路（常见指令不走 LLM）

### 5.3 生成防护

**问题：** 如何确保 LLM 不会生成内容？

**解决方案（三层防护）：**

1. **System Prompt 约束**：明确禁止生成
2. **Strict Structured Output**：Zod Schema 强制仅输出预定义指令格式
3. **运行时验证**：检查输出内容是否在原始语音中出现

### 5.4 中文语音识别准确率

**问题：** 儿童语音 + 中文 = 识别准确率挑战

**解决方案：**

- 儿童语音数据集微调（可选）
- 多 ASR 源交叉验证
- 用户主动纠错机制（拼音提示）

## 6. 开发路线图

### 6.1 MVP 阶段（当前）

**时间：** 2-3 周

**交付物：**

- [x] 基础语音转录功能
- [ ] 简单语音编辑（规则引擎）
- [ ] 可用性测试

**目标：** 验证核心交互流程是否可行

### 6.2 Alpha 版本

**时间：** 1-2 个月

**交付物：**

- [ ] 智能指令解析（LLM）
- [ ] 数字编号选择
- [ ] 基础去口语化
- [ ] 完整 UI 设计

**目标：** 核心功能完整，可以实际使用

### 6.3 Beta 版本

**时间：** 2-3 个月

**交付物：**

- [ ] ASR 升级（Whisper WASM）
- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 用户体验优化

**目标：** 稳定可用，准备正式发布

### 6.4 1.0 版本

**时间：** 3-4 个月

**交付物：**

- [ ] 完整的文档
- [ ] 用户指南
- [ ] 性能优化
- [ ] 可选：Native 应用

**目标：** 正式发布

## 7. 技术选型对比

### 7.1 ASR 方案对比

| 方案                   | 准确率 | 延迟 | 隐私 | 成本 | 推荐阶段            |
| ---------------------- | ------ | ---- | ---- | ---- | ------------------- |
| RealtimeSTT (本地服务) | 很高   | 低   | 高   | 免费 | **第一阶段 (已选)** |
| Whisper WASM（纯前端） | 高     | 中   | 高   | 免费 | 备选/降级方案       |
| 云端 API               | 很高   | 中   | 低   | 付费 | 不推荐（隐私问题）  |

### 7.2 LLM 方案对比

| 方案             | 性能 | 延迟 | 隐私 | 成本 | 推荐阶段 |
| ---------------- | ---- | ---- | ---- | ---- | -------- |
| Qwen-1.8B (本地) | 中   | 低   | 高   | 免费 | Alpha+   |
| GPT-4o (API)     | 很高 | 高   | 低   | 付费 | 不推荐   |
| DeepSeek API     | 高   | 中   | 低   | 低   | 备选     |

### 7.3 编辑器方案对比

| 方案     | 灵活性 | 性能 | 学习曲线 | 推荐        |
| -------- | ------ | ---- | -------- | ----------- |
| Tiptap   | 很高   | 高   | 中       | ✅ 已选     |
| Draft.js | 中     | 中   | 低       | ❌ 功能不足 |
| Slate    | 高     | 高   | 高       | ❌ 复杂度高 |

## 8. 风险与应对

### 8.1 技术风险

| 风险                        | 影响 | 应对策略                        |
| --------------------------- | ---- | ------------------------------- |
| 模型加载时间长              | 中   | 模型缓存、进度提示、CDN 加速    |
| 轻量级 LLM 指令解析能力不足 | 高   | 先用规则引擎，LLM 作为增强      |
| Tiptap 集成复杂度超预期     | 中   | 参考官方示例，分步实现          |
| 固定分块导致延迟不可控      | 中   | 第一步先验证，后续添加 VAD 优化 |
| 性能问题（长文档）          | 低   | 虚拟滚动、Web Worker 处理       |

### 8.2 产品风险

| 风险               | 影响 | 应对策略                   |
| ------------------ | ---- | -------------------------- |
| 孩子不习惯语音交互 | 高   | 简单引导，降低学习成本     |
| 家长担心"提笔忘字" | 中   | 强调是草稿工具，最终需誊抄 |
| 误操作频繁         | 中   | 完善的撤销机制，确认流程   |

### 8.3 合规风险

| 风险         | 影响 | 应对策略                   |
| ------------ | ---- | -------------------------- |
| 儿童数据隐私 | 高   | 本地优先，数据不出设备     |
| 教育政策限制 | 中   | 定位为效率工具，非教学工具 |

## 9. 成功指标

### 9.1 功能指标

- 语音识别准确率 > 90%（针对儿童语音）
- 指令解析准确率 > 85%
- 端到端延迟 < 500ms（P95）

### 9.2 用户体验指标

- 完成一篇 300 字作文时间 < 15 分钟（vs 传统手写 1-2 小时）
- 用户满意度 > 4.0/5.0
- 学习曲线 < 5 分钟（首次使用）

### 9.3 技术指标

- 页面加载时间 < 2 秒
- 内存占用 < 200MB（长时间使用）
- 浏览器兼容性：Chrome、Edge、Safari（iOS 14.5+）

## 10. 参考资料

### 10.1 技术文档

- [Tiptap 官方文档](https://tiptap.dev/)
- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Whisper WASM](https://github.com/ggerganov/whisper.cpp)
- [Qwen 模型](https://github.com/QwenLM/Qwen)

### 10.2 设计参考

- [Serenade.ai 交互模式](https://serenade.ai/)
- [iOS Voice Control](https://support.apple.com/guide/iphone/use-voice-control-iph2c21a3c88/ios)
- [Tiptap Voice Control Demo](https://www.youtube.com/watch?v=FYETnU-RhyA)

### 10.3 项目文档

- [第一步实施计划](plan-step1-transcription.md)
