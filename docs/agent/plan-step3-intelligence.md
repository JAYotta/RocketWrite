# 阶段三实施计划：本地智能指令解析 (Local AI Toolkit)

## 1. 目标与范围

### 1.1 核心目标

构建一个**完全本地化、隐私保护**的 AI 编辑助手，替代商业化的 Tiptap AI Toolkit。
它不生成内容，而是理解用户的自然语言指令（如“把这一段标红”、“删掉最后一句”），并将其转化为编辑器可执行的命令。

### 1.2 核心架构 (The "Ollama Stack")

我们采用社区验证的最佳实践架构：

- **推理引擎 (Brain)**: Ollama + Qwen2.5-Coder-1.5B (本地运行)
- **编排层 (Orchestrator)**: Vercel AI SDK (前端直接集成)
- **交互层 (UI)**: Tiptap + ProseMirror Suggestion Mode (Diff 预览)

## 2. 技术选型详情

### 2.1 为什么选 Ollama + Qwen Coder?

- **Ollama**: 提供了标准的 OpenAI 兼容接口 (`/v1/chat/completions`)，使得前端可以像调用 GPT-4 一样调用本地模型，零适配成本。
- **Qwen2.5-Coder**: 经研究验证，Coder 版本在**JSON 结构化输出**和**工具调用 (Tool Calling)** 方面的表现远超同尺寸的 Instruct 模型，且 1.5B 版本在 Mac 上延迟极低 (<50ms)。

### 2.2 为什么选 Vercel AI SDK?

- **Tool Calling 封装**: 自动处理 LLM 的工具调用协议，将 JSON 映射为前端函数。
- **流式支持**: 内置 `useChat` hook，自带流式状态管理（Loading, Streaming）。
- **生态标准**: 目前 React 生态对接 LLM 的事实标准。

## 3. 实施步骤

### 3.0 前置阶段：POC 验证 (Mock & Verify)

在正式集成前，请先完成 [Minimal POC Plan](plan-step2-minimal-poc.md) 中的验证工作：

- [ ] **Test Back**: 确保 Qwen 能理解我们的 Zod Schema。
- [ ] **Test Front**: 确保 Editor 能正确渲染 Diff。

### 3.1 基础设施搭建 (Backend)

- [x] **Ollama Setup** (已在 Phase 2 POC 完成)
  - 确认服务运行正常。

### 3.2 前端集成 (Frontend)

- [x] **依赖安装** (已在 Phase 2 POC 完成)
- [x] **工具注册表 (Tool Registry) 定义** (已在 Phase 2 POC 完成)
- [ ] **Tool Registry 集成**:
  - 在 `useChat` Hook 中集成 Tool Registry
  - 配置 `onToolCall` 回调处理工具调用
- [x] **基础命令执行器** (已在 Phase 2 POC 完成基础版本)
- [ ] **命令执行器完善**:
  - 实现复杂文本定位逻辑 (`findTextPosition`): "第一段"、"第二句"等
  - 完善各命令的执行函数（处理边界情况）
  - 实现 Switch-Case 处理器，将 LLM 的 Tool Call 映射为 Tiptap 的 `editor.chain()...run()`

### 3.3 Schema & Context 完整实现

- [x] **Schema 提取工具** (已在 Phase 2 POC 完成基础版本)
- [ ] **Schema 约束注入**:
  - 在每次请求前提取 Schema 信息
  - 将 Schema 信息注入 System Prompt
  - 验证 LLM 输出符合 Schema 约束
- [ ] **Context 提取与注入**:
  - 实现滑动窗口策略（提取选区前后的文本）
  - 将 Context 信息注入请求
  - 优化 Context 大小（平衡准确率和性能）

### 3.4 交互体验 (UI/UX)

- [ ] **Diff 预览**:
  - 引入 `prosemirror-suggestion-mode` 或实现自定义 Diff 显示
  - 对于 "替换/修改" 类指令，先应用 "Suggestion Mark" (绿色新增/红色删除)，用户确认后再 Apply
- [ ] **Ask AI 菜单**:
  - 仿照 Novel.sh，实现按下空格或 `/` 唤起的悬浮菜单，展示 AI 思考过程
- [ ] **指令路由 UI**:
  - 实现 Push-to-Talk 模式切换（空格键进入编辑模式）
  - 显示解析状态（Loading、Reasoning、Preview）

## 4. 验证标准

1. **延迟**: 从说话结束到指令执行 < 1 秒。
2. **准确率**: 简单指令 ("删除上一句") 成功率 > 95%。
3. **安全性**: 能够拒绝 "帮我写一篇作文" 的生成式请求（通过 System Prompt 约束）。
