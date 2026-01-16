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

| Tool Name     | Description        | Parameters (Zod Schema)                                                                                               |
| :------------ | :----------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `insertText`  | 在指定位置插入文本 | `text`: string, `target?`: EditorTarget (可选，不提供则插入到当前选区)                                                |
| `deleteText`  | 删除指定的文本     | `target`: EditorRange (只支持 "selection" 或 {from: number, to: number})                                              |
| `replaceText` | 替换文本内容       | `old`: string, `new`: string                                                                                          |
| `applyFormat` | 对文本应用格式     | `target`: EditorRange (只支持 "selection" 或 {from: number, to: number}), `format`: "bold" \| "italic" \| "highlight" |
| `undo`        | 撤销上一个操作     | 无参数                                                                                                                |
| `redo`        | 重做上一个撤销操作 | 无参数                                                                                                                |

**类型定义**：

- **`EditorRange`**: `"selection" | { from: number; to: number }` - 用于 deleteText 和 applyFormat
- **`EditorPosition`**: `number | "selectionStart" | "selectionEnd" | "documentStart" | "documentEnd"` - 用于 insertText 的位置
- **`EditorTarget`**: `EditorPosition | EditorRange` - insertText 的可选 target 字段

**设计决策**：

1. **类型分离**：`EditorPosition` 和 `EditorRange` 分别用于不同的命令类型
   - `insertText` 使用 `EditorTarget`（可选），包含 position 和 range
   - `deleteText` 和 `applyFormat` 只使用 `EditorRange`（不支持描述性字符串）
2. **insertText 默认行为**：如果 `target` 未提供，直接调用 `insertContent(text)`，这是 Tiptap 的默认行为
3. **Range 坐标支持**：测试验证小模型可以输出 range 坐标 `{from, to}`，因此支持精确的字符位置操作

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
5.  **文本定位**: `target` 参数使用 range 坐标 `{from, to}`，要求 LLM 直接输出坐标。描述性文本定位（"第一段"、"第二句"等）暂不考虑实现，未来可考虑测试模型输出 range 坐标的准确率或整段重写并 diff 的能力。
