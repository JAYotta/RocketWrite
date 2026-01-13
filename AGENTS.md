# Agent Context

> **项目定位**：面向小学生的语音录入作文工具，纯效率工具，不提供内容生成功能。

## 核心约束

### 必须遵守

1. **禁止生成内容**

   - 不允许 AI 生成、润色、改写内容
   - 只允许直接替换（如"把开心换成兴高采烈"）
   - 不允许"换个更高级的词汇"这类建议

2. **隐私优先**

   - 所有处理必须在本地完成
   - 不能使用云端 API（即使准确率更高）
   - 符合儿童数据保护要求

3. **纯效率工具**

   - 不提供创作辅助或引导性建议
   - 最终版本仍需誊抄
   - 让孩子保持自主思考

## 当前状态

**第一阶段：文字转录功能**

- 技术栈：React + TypeScript + Tiptap
- ASR: MLX Whisper (Stateless Backend) - _RealtimeSTT has been deprecated_
- UI Library: HeroUI v3 (Beta)
  - Styling: Tailwind CSS v4
  - Icons: Iconoir React
  - State: React Hooks
- 状态：**已完成** (UI 待持续优化)

**第二阶段：智能指令解析 (Minimal POC)**

- 目标：验证本地 LLM 的意图解析能力
- 技术栈：
  - **LLM**: Ollama + Qwen2.5-Coder-1.5B
  - **Framework**: Vercel AI SDK Core (`generateObject`)
  - **Protocol**: Structured Output (Zod Schema)
- 状态：**进行中** (准备进入 POC 开发)

**核心痛点**：

- 手写速度慢（10-15 字/分钟）
- 草稿修改需要反复誊抄
- 打字速度慢，影响思路
- 一篇作文可能需要 2+ 小时

**解决方案**：

- 语音录入作文草稿
- 语音完成修改
- 最终仍需誊抄

## 技术约束

- 目标平台：Web 浏览器（第一步）
- 包管理器：pnpm (Required) - use `pnpm dlx` instead of `npx`
- 性能要求：可接受 1-2 秒延迟
- 兼容性：现代浏览器（Chrome、Edge、Safari、Firefox）

## 文档索引

详细的系统架构、项目背景与研究、技术选型、实施计划的文档索引请查看 [文档索引](docs/Readme.md)

## 参考资料

- [Vercel AI SDK 文档 (Full)](docs/reference/vercel-llms-full.txt) - 包含 Core, React, and Provider 的完整 API 参考。
