# 架构决策：本地智能指令解析方案 (2026-01-04)

## 1. 背景与挑战

在实现“通过自然语言修改文档”（如“把这段标红”、“删掉最后一句”）的功能时，我们经历了三次架构演进思考。

### 核心难点

1.  **解析精度**：如何准确区分“正文输入”与“编辑指令”？
2.  **执行可控**：如何确保 AI 不像聊天机器人那样生成一堆废话，而是精准执行编辑？
3.  **隐私与成本**：如何避免上传数据到云端（OpenAI/Claude），同时保持以秒为单位的低延迟？

## 2. 方案演进过程

### 方案 A：规则引擎 (Regex)

- **思路**：用正则表达式匹配 "删除..."、"替换..."。
- **结论**：❌ **放弃**。
- **原因**：自然语言太灵活（"把刚才那句删了" vs "删掉最后一句"），正则维护成本指数级上升，且无法处理上下文歧义。

### 方案 B：LangChain + Python Backend

- **思路**：在后端用 Python (`mlx-lm`) 跑模型，用 LangChain 做 Prompt Engineering，返回 JSON 给前端。
- **结论**：⚠️ **暂缓**。
- **原因**：
  - 开发链路长：前端 -> Python API -> MLX -> Python -> 前端。
  - 重复造轮子：需要手动处理流式输出、JSON 解析、容错。

### 方案 C：Ollama + Vercel AI SDK (✅ 最终选择)

- **思路**：
  - **Brain**: 直接用 `Ollama` 运行 `qwen2.5-coder:1.5b` (兼容 OpenAI API)。
  - **Adapter**: 前端使用 `Vercel AI SDK` (`useChat` + `Tools`) 直接连接 Ollama。
- **原因**：
  - **标准统一**：Vercel SDK 是目前 React 生态事实标准，未来切模型（如 DeepSeek）只需改 URL。
  - **Tool Calling**: Qwen 2.5 Coder 对 Tool Calling 支持极好，完美契合“指令转函数”的需求。
  - **极简架构**：去掉了中间的 Python 业务层，浏览器直连模型（Localhost）。

## 3. 最终技术栈

| 模块                   | 技术选型                           | 理由                                                                |
| :--------------------- | :--------------------------------- | :------------------------------------------------------------------ |
| **LLM Host**           | **Ollama**                         | 一键安装，兼容 OpenAI API，支持 MacOS 硬件加速。                    |
| **Model**              | **Qwen2.5-Coder-1.5B**             | 1.5B 参数在 Mac 上延迟 <50ms，且 Coder 版本遵循 JSON 指令能力最强。 |
| **Frontend Framework** | **Vercel AI SDK (Core)**           | 自动处理 Tool Calling 协议，提供 `useChat` 等优质 Hook。            |
| **Protocol**           | **Tool Calling (OpenAI Standard)** | 定义 `delete(range)`, `format(style)` 等工具，让 LLM 填参数。       |

## 4. 关键收益

1.  **隐私安全**：数据完全不出机（Localhost 闭环）。
2.  **开发效率**：利用 Vercel SDK 生态，无需手写复杂的流式解析器。
3.  **可扩展性**：工具定义（Zod Schema）与模型解耦，方便扩展新指令。
