# Schema Verification Test Cases

**Model Target**: Qwen 2.5 Coder 1.5B / 7B (Local via Ollama)
**Pattern**: Intent-Based Commands (Structured Output)

## Feasibility Reasoning

Why this schema structure is safe for a small 1.5B model:

1.  **Strict `type` Discriminator**: Using a top-level `type` field (z.literal) allows the model to immediately anchor its generation to a specific tool, reducing ambiguity.
2.  **Flat Structure**: We avoid nested objects where possible (e.g., `target` is a string, not `{ start: number, end: number }`). Small models struggle with coordinate math but excel at string copying.
3.  **Explicit `old` Text**: In `replaceText`, requiring the `old` text forces the model to "ground" its action in the document content, reducing hallucinations.
4.  **Enum Constraints**: `format` is strictly limited to `['bold', 'italic', 'highlight']`, preventing the model from inventing CSS styles.

---

## Verification Cases (Few-Shot)

We will use these examples to verify the model's ability to map Natural Language -> JSON.

### 1. Tool: `insertText`

| User Intent                | Expected JSON Output                                                  | Note              |
| :------------------------- | :-------------------------------------------------------------------- | :---------------- |
| "在开头插入标题'我的假期'" | `{"type": "insertText", "text": "我的假期", "position": "start"}`     | Explicit position |
| "插入一句话'真开心啊'"     | `{"type": "insertText", "text": "真开心啊", "position": "selection"}` | Default position  |
| "文末加上'完'"             | `{"type": "insertText", "text": "完", "position": "end"}`             | Explicit position |

### 2. Tool: `deleteText`

| User Intent      | Expected JSON Output                            | Note               |
| :--------------- | :---------------------------------------------- | :----------------- |
| "删除这段话"     | `{"type": "deleteText", "target": "selection"}` | Context implied    |
| "删掉第二句"     | `{"type": "deleteText", "target": "第二句"}`    | Descriptive target |
| "把最后一段删了" | `{"type": "deleteText", "target": "最后一段"}`  | Descriptive target |

### 3. Tool: `replaceText`

| User Intent                    | Expected JSON Output                                              | Note                                       |
| :----------------------------- | :---------------------------------------------------------------- | :----------------------------------------- |
| "把'开心'改成'兴高采烈'"       | `{"type": "replaceText", "old": "开心", "new": "兴高采烈"}`       | Simple replacement                         |
| "修正错别字: '以经' -> '已经'" | `{"type": "replaceText", "old": "以经", "new": "已经"}`           | Correction                                 |
| "把标题换成'难忘的一天'"       | `{"type": "replaceText", "old": "我的假期", "new": "难忘的一天"}` | Context required (old text must match doc) |

### 4. Tool: `applyFormat`

| User Intent          | Expected JSON Output                                                    | Note                          |
| :------------------- | :---------------------------------------------------------------------- | :---------------------------- |
| "把'重点'两个字加粗" | `{"type": "applyFormat", "format": "bold", "target": "重点"}`           | Specific text                 |
| "高亮选中的文字"     | `{"type": "applyFormat", "format": "highlight", "target": "selection"}` | Selection                     |
| "把第一段便斜体"     | `{"type": "applyFormat", "format": "italic", "target": "第一段"}`       | Typo tolerance ("便" -> "变") |

### 5. Tool: `undo`

| User Intent          | Previous Command Context                                          | Expected JSON Output | Note                   |
| :------------------- | :---------------------------------------------------------------- | :------------------- | :--------------------- |
| "撤销上一个操作"     | `{"type": "replaceText", "old": "开心", "new": "兴高采烈"}`       | `{"type": "undo"}`   | Undo replace operation |
| "撤销刚才插入的文字" | `{"type": "insertText", "text": "我的假期", "position": "start"}` | `{"type": "undo"}`   | Undo insert operation  |
| "撤销删除"           | `{"type": "deleteText", "target": "第二句"}`                      | `{"type": "undo"}`   | Undo delete operation  |
| "撤销刚才的修改"     | `{"type": "applyFormat", "format": "bold", "target": "重点"}`     | `{"type": "undo"}`   | Undo format operation  |

### 6. Tool: `redo`

| User Intent      | Previous Command Context                                          | Expected JSON Output | Note                    |
| :--------------- | :---------------------------------------------------------------- | :------------------- | :---------------------- |
| "重做"           | `{"type": "replaceText", "old": "开心", "new": "兴高采烈"}`       | `{"type": "redo"}`   | Redo last undone action |
| "恢复刚才的操作" | `{"type": "insertText", "text": "我的假期", "position": "start"}` | `{"type": "redo"}`   | Redo insert operation   |

### 7. Correction Scenarios (Flexible Implementation)

| User Intent          | Previous Command Context                                    | Expected JSON Output (Option 1) | Expected JSON Output (Option 2)                             | Note                                                             |
| :------------------- | :---------------------------------------------------------- | :------------------------------ | :---------------------------------------------------------- | :--------------------------------------------------------------- |
| "改回原来的样子"     | `{"type": "replaceText", "old": "开心", "new": "兴高采烈"}` | `{"type": "undo"}`              | `{"type": "replaceText", "old": "兴高采烈", "new": "开心"}` | Model may use undo (simpler) or reverse replaceText (explicit)   |
| "把刚才改错的改回来" | `{"type": "replaceText", "old": "开心", "new": "兴高采烈"}` | `{"type": "undo"}`              | `{"type": "replaceText", "old": "兴高采烈", "new": "开心"}` | Both approaches are acceptable; undo is preferred for simplicity |

**Note on Correction**: When the user requests correction, the model may choose either:

- **Option 1 (Preferred)**: Use `undo` command - simpler and leverages editor's history stack
- **Option 2 (Acceptable)**: Use `replaceText` with reversed values - more explicit but requires model to track the reversal

---

## Context Usage: Previous Command

The system prompt now supports a `previousCommand` parameter that provides context about the last executed operation. This context is used to:

1. **Enable Undo/Redo Operations**: The model can understand what operation to undo/redo based on the previous command context.
2. **Support Correction Requests**: When users request corrections (e.g., "改回原来的样子"), the model can either use `undo` or reverse the previous operation explicitly.

**Context Format in Prompt**:

```
Previous Command: { "type": "replaceText", "old": "开心", "new": "兴高采烈" }
```

**Boundary Case**: When `previousCommand` is `undefined` and user requests undo, the model should return an empty array `[]` or handle gracefully without crashing.

---

## Implementation Notes

These test cases are also integrated into the system prompt versions for few-shot learning. See:

- [`frontend/src/prompts/system-prompts/`](../../../frontend/src/prompts/system-prompts/) for prompt implementations
- [`frontend/scripts/test-backend.ts`](../../../frontend/scripts/test-backend.ts) for test execution
