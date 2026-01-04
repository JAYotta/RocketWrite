# 技术规范：本地智能助手架构 (Phase 2)

本文档供 AI 辅助开发时参考，定义了前端与本地 LLM 的交互协议与架构约束。

## 1. 核心架构 (The "Ollama Stack")

系统采用 **Client-Side Intelligence** 架构，前端直接通过标准 API 连接本地推理引擎。

- **Model Endpoint**: `http://localhost:11434/v1` (Ollama)
- **Model Name**: `qwen2.5-coder:1.5b`
- **SDK**: `ai` (Vercel AI SDK Core)

## 2. 工具定义 (Tool Registry)

所有编辑指令必须定义为标准的 Tool，严禁使用非结构化的自然语言返回。

### 2.1 核心工具列表

| Tool Name     | Description        | Parameters (Zod Schema)                                                                    |
| :------------ | :----------------- | :----------------------------------------------------------------------------------------- |
| `insertText`  | 在指定位置插入文本 | `text`: string, `position`: "cursor" \| "start" \| "end" (default: "cursor")               |
| `deleteText`  | 删除指定的文本     | `target`: string (位置描述，如"第一段"、"第二句"、"高兴")                                  |
| `replaceText` | 替换文本内容       | `old`: string, `new`: string, `scope`: "first" \| "all" (default: "first")                 |
| `applyFormat` | 对文本应用格式     | `target`: string (位置描述), `format`: "bold" \| "italic" \| "highlight", `color?`: string |

**工具定义示例 (TypeScript)**：

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  insertText: tool({
    description: '在指定位置插入文本',
    parameters: z.object({
      text: z.string().describe('要插入的文本'),
      position: z.enum(['cursor', 'start', 'end']).default('cursor'),
    }),
  }),

  deleteText: tool({
    description: '删除指定的文本',
    parameters: z.object({
      target: z
        .string()
        .describe('目标文本或位置描述，如"第一段"、"第二句"、"高兴"'),
    }),
  }),

  replaceText: tool({
    description: '替换文本内容',
    parameters: z.object({
      old: z.string().describe('要被替换的文本'),
      new: z.string().describe('新文本'),
      scope: z.enum(['first', 'all']).default('first'),
    }),
  }),

  applyFormat: tool({
    description: '对文本应用格式',
    parameters: z.object({
      target: z.string().describe('目标文本或位置，如"第一段"'),
      format: z.enum(['bold', 'italic', 'highlight']),
      color: z.string().optional().describe('高亮颜色，如"red"、"yellow"'),
    }),
  }),
};
```

### 2.2 System Prompt 约束

LLM 必须配置如下 System Prompt 以防止生成式行为：

```
You are a precise command parser for a text editor.
Your task is to parse user's natural language instructions into structured tool calls.

Core Constraints:
1. You do NOT generate content. You ONLY output tool calls based on the user's intent.
2. Forbidden operations: generate, rewrite, expand, summarize, create
3. Allowed operations: insert, delete, replace, format

If the user's intent is unclear or ambiguous, you should still attempt to parse it
based on context. Do not generate text responses.

Schema Constraints:
- Supported nodes: [从编辑器Schema动态注入]
- Supported marks: [从编辑器Schema动态注入]
- Only use supported nodes and marks.
```

### 2.3 Schema 感知实现

前端在发送请求前，必须提取当前编辑器的 Schema 信息并注入 System Prompt：

**前端实现**：

```typescript
function extractSchemaInfo(editor: Editor) {
  return {
    nodes: Object.keys(editor.schema.nodes),
    marks: Object.keys(editor.schema.marks),
  };
}

// 在构建 System Prompt 时注入
const schemaInfo = extractSchemaInfo(editor);
const systemPrompt = buildSystemPrompt(schemaInfo);
```

**后端处理**：

后端接收 Schema 信息，在构建 System Prompt 时注入约束，确保 LLM 只使用支持的节点和标记。

## 3. 前端交互状态机

前端 `CommandDispatcher` 维护以下状态：

- **Idle**: 等待唤醒 (空格键 / 语音指令)。
- **Listening**: 正在录入指令 (ASR)。
- **Reasoning**: 发送请求至 Ollama，等待 Tool Call。
- **Preview**: 收到 Tool Call，在编辑器中显示 Diff (ProseMirror Decoration)。
- **Applied**: 用户确认，Transaction 提交。

## 4. 开发注意事项

1.  **不要手动 fetch**: 始终使用 SDK 提供的 `useChat` 或 `generateText`。
2.  **CORS**: 确保用户运行 `OLLAMA_ORIGINS="*" ollama serve`。
3.  **Tool Calling**: 优先依赖 Tool Calling 能力，而非强制 JSON Mode，Qwen Coder 对 Tool 支持更好。
4.  **Schema 感知**: 每次请求前提取编辑器 Schema，注入 System Prompt，防止生成不支持的格式。
5.  **文本定位**: `target` 参数支持模糊定位（"第一段"、"第二句"），需要在前端实现文本定位逻辑。
