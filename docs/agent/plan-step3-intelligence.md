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
- **Qwen2.5-Coder**: 经研究验证，Coder 版本在**JSON 结构化输出**方面的表现远超同尺寸的 Instruct 模型，且 1.5B 版本在 Mac 上延迟极低 (<50ms)。

### 2.2 为什么选 Vercel AI SDK?

- **Structured Output 封装**: `generateObject` 配合 Zod Schema，强制 LLM 输出类型安全的 JSON 对象。
- **流式支持**: 结合 `streamObject`，支持部分 JSON 解析，实现极速响应。
- **生态标准**: 目前 React 生态对接 LLM 的事实标准。

## 3. 实施步骤

### 3.0 前置阶段：POC 验证 (Mock & Verify)

在正式集成前，请先完成 [Minimal POC Plan](plan-step2-minimal-poc.md) 中的验证工作：

- [x] **Test Back**: 确保 Qwen 能理解我们的 Zod Schema。（已在 Phase 2 POC 完成）
- [ ] **Test Front**: 确保 Editor 能正确渲染 Diff。（移至 Phase 3.2）

### 3.1 基础设施搭建 (Backend)

- [x] **Ollama Setup** (已在 Phase 2 POC 完成)
  - 确认服务运行正常。

### 3.2 Phase 3.1: 核心指令执行（MVP）

**目标**：实现端到端的指令解析和执行，不考虑 diff 预览等 UI 效果。

- [x] **依赖安装** (已在 Phase 2 POC 完成)
- [x] **工具注册表 (Tool Registry) 定义** (已在 Phase 2 POC 完成)
- [x] **基础命令执行器** (已在 Phase 2 POC 完成基础版本)
- [ ] **Context 提取工具**:
  - 创建 `frontend/src/utils/contextExtractor.ts`
  - 实现滑动窗口策略（提取选区前后的文本）
  - 将 Context 信息注入请求
- [ ] **Intent Handler 集成**:
  - 创建 `frontend/src/hooks/useCommandParser.ts`
  - 在 Hook 中集成 `generateObject`
  - 配置 Zod Schema 定义意图
  - 编写 handler 分发意图对象到命令执行器
- [ ] **App.tsx 集成**:
  - 集成 Phase 1 的语音转录功能（`useMicVAD`）
  - 实现指令路由逻辑：区分"转录模式"和"编辑模式"
    - 转录模式：语音直接转录为文字（现有功能）
    - 编辑模式：语音作为指令输入，调用 `useCommandParser` Hook
  - 添加模式切换机制（如空格键切换）
  - 直接执行命令（无预览）
  - 基础错误处理和反馈（toast/loading）

**验收标准**：

- ✅ 能够解析并执行简单指令（"删除上一句"、"加粗选中文字"）
- ✅ 能够拒绝生成式请求（"写一篇作文"）
- ✅ 延迟 < 1 秒
- ✅ 有基础的 Loading 状态和错误提示

### 3.3 Phase 3.2: UI/UX 优化（Diff 预览与交互）

**目标**：实现完整的用户交互体验，包括 diff 预览、确认机制等。

- [ ] **Schema 提取工具**（可选，如果 Phase 3.1 发现需要）:
  - 创建 `frontend/src/utils/schemaExtractor.ts`
  - 实现 `extractSchemaInfo(editor)` 函数
  - 提取当前编辑器支持的 nodes 和 marks
  - 将 Schema 信息注入 System Prompt
- [ ] **命令执行器完善**:
  - 完善 `replaceText` 命令（实现真正的文本替换）
  - 完善 `applyFormat` 命令（处理边界情况）
  - 注：描述性文本定位（"第一段"、"第二句"等）暂不考虑实现，未来可考虑测试模型输出 range 坐标或整段重写并 diff 的能力
- [ ] **命令状态管理**:
  - 创建 `frontend/src/hooks/useCommandState.ts`
  - 实现完整的状态机（idle、listening、reasoning、preview、applied）
- [ ] **Diff 预览**:
  - 创建 `frontend/src/components/CommandPreview.tsx`
  - 引入 `prosemirror-suggestion-mode` 或实现自定义 Diff 显示
  - 对于 "替换/修改" 类指令，先应用 "Suggestion Mark" (绿色新增/红色删除)，用户确认后再 Apply
  - **Test Front**: 确保 Editor 能正确渲染 Diff
- [ ] **Ask AI 菜单**:
  - 创建 `frontend/src/components/AIMenu.tsx`
  - 仿照 Novel.sh，实现按下空格或 `/` 唤起的悬浮菜单，展示 AI 思考过程
- [ ] **指令路由 UI 优化**:
  - 优化模式切换体验（更清晰的视觉指示）
  - 显示解析状态（Loading、Reasoning、Preview）

**验收标准**：

- ✅ 能够预览命令执行效果
- ✅ 用户可以在预览后确认或拒绝
- ✅ 有清晰的模式切换指示
- ✅ 交互流畅，体验良好

## 4. 验证标准

### 4.1 Phase 3.1 验证标准

1. **延迟**: 从指令输入到命令执行 < 1 秒。
2. **准确率**: 简单指令 ("删除上一句") 成功率 > 95%。
3. **安全性**: 能够拒绝 "帮我写一篇作文" 的生成式请求（通过 System Prompt 约束）。
4. **基础反馈**: 有明确的 Loading 状态和错误提示。

### 4.2 Phase 3.2 验证标准

1. **预览功能**: 能够预览命令执行效果。
2. **确认机制**: 用户可以在预览后确认或拒绝。
3. **模式切换**: 有清晰的模式切换指示（转录模式 vs 编辑模式）。
4. **交互流畅**: 整体交互体验流畅，无明显卡顿。
