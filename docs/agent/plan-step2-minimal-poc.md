# Phase 2 POC: 最小集验证计划 (Mock & Verify)

为了降低集成风险，我们将“前端业务逻辑”与“后端模型能力”解耦，分别进行独立验证。

## 1. 验证策略：双侧独立测试

### 1.1 Test Back (验证模型能力)

**目标**：不启动前端 UI，直接验证 Ollama + Qwen 2.5 Coder 能否稳定输出符合 Schema 的 Tool Call。
**工具**：Node.js 脚本 (`scripts/test-backend.ts`)
**输入**：模拟的用户 prompt ("把第一段标红")
**期望输出**：验证 Zod Schema 解析通过，Tool Call 参数正确。

### 1.2 Test Front (验证交互逻辑)

**目标**：不依赖真实 LLM（消除延迟和不确定性），验证前端能否正确处理 Tool Call 并更新编辑器。
**工具**：Mock LLM Provider (`src/lib/mock-provider.ts`)
**模拟**：

- 输入 "删除这段" -> 立即返回 Tool Call `{ tool: "deleteText", args: { target: "selection" } }`
- 输入 "把第一段标红" -> 立即返回 Tool Call `{ tool: "applyFormat", args: { target: "第一段", format: "highlight" } }`
- 输入 "把'开心'换成'兴高采烈'" -> 立即返回 Tool Call `{ tool: "replaceText", args: { old: "开心", new: "兴高采烈" } }`
- 验证：UI 是否显示 Diff？点击确认后是否执行？

## 2. 实施步骤

### Step 0: 基础设施搭建 (Infrastructure)

> 此步骤已从 Phase 3 前置，作为 POC 的必要条件。

- [ ] **Ollama Setup**:
  - 安装并启动 Ollama (`OLLAMA_ORIGINS="*"`)
  - 拉取模型 (`ollama pull qwen2.5-coder:1.5b`)
- [ ] **Project Setup**:
  - 安装依赖: `pnpm install ai zod @ai-sdk/ollama`
  - 安装开发脚本工具: `pnpm install -D tsx`

### Step 1: 环境准备 (已包含在 Step 0)

- [ ] 安装必要的 Dev 依赖: `tsx` (运行 TS 脚本), `ai`, `zod`, `@ai-sdk/ollama`.

### Step 2: 后端验证脚本 (`scripts/test-backend.ts`)

编写一个独立脚本，使用 Vercel AI SDK Core (`generateText`) 调用本地 Ollama。

**前置条件**：需要先完成 Step 3（Tool Registry 定义），因为测试脚本需要导入工具定义来验证输出。

**关键增强：上下文注入 (Context Injection)**
为了测试 "Context Awareness"，Prompt 必须包含 Simulation Context：

```javascript
const context =
  'RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具...';
const prompt = "把选中的文字改成'面向小学生开发'";
```

**测试用例**：

- **Case 1 (Replace)**: "把'开心'换成'兴高采烈'" -> `replaceText({ old: "开心", new: "兴高采烈" })`
- **Case 2 (Delete)**: "删除第二句" -> `deleteText({ target: "第二句" })`
- **Case 3 (Format)**: "把第一段标红" -> `applyFormat({ target: "第一段", format: "highlight", color: "red" })`
- **Case 4 (Insert)**: "在开头插入标题" -> `insertText({ text: "标题", position: "start" })`
- **Case 5 (Schema)**: 验证生成的 Tool Call 是否符合我们定义的 Zod Schema，防止幻觉（Schema Awareness）。
- **Case 6 (Safety)**: 输入"写一篇关于春天的作文" -> 应该拒绝或返回错误（生成防护测试）。

### Step 3: Tool Registry 定义（前置）

**目标**：定义工具 Schema，供测试脚本和 Mock 使用。

**任务清单**：

- [ ] 创建 `frontend/src/schemas/editor-commands.ts`
- [ ] 定义四个核心工具的 Zod Schema（`insertText`, `deleteText`, `replaceText`, `applyFormat`）
- [ ] 导出 TypeScript 类型

**注意**：这是前置工作，完整的 Tool Registry 集成在阶段三，但定义需要在阶段二完成。

### Step 4: 基础命令执行器（前置）

**目标**：实现基础的命令执行函数，供 Mock 测试使用。

**任务清单**：

- [ ] 创建 `frontend/src/utils/commandExecutor.ts`
- [ ] 实现基础的执行函数（至少支持简单场景，如直接文本替换）
- [ ] 复杂文本定位（"第一段"、"第二句"）可以暂缓到阶段三

**注意**：这是前置工作，完整的命令执行器（包括复杂定位）在阶段三实现。

### Step 5: 前端 Mock 适配器 (`frontend/src/utils/mock-provider.ts`)

创建一个实现了 Vercel AI SDK `LanguageModelV1` 接口的 Mock 类，或者简单地在 `useChat` 中根据开关切换模拟数据。

- 定义一组 "预制" 的 Request-Response 对（覆盖所有工具类型）。
- 在 UI 中增加 "Debug Mode" 开关，开启时通过 Mock 返回毫秒级响应，方便调试 UI 动画和 Diff 逻辑。

**Mock 数据示例**：

```typescript
const mockToolCalls = {
  把第一段标红: {
    toolCalls: [
      {
        toolCallId: 'call_1',
        toolName: 'applyFormat',
        args: { target: '第一段', format: 'highlight', color: 'red' },
      },
    ],
  },
  删除第二句: {
    toolCalls: [
      {
        toolCallId: 'call_2',
        toolName: 'deleteText',
        args: { target: '第二句' },
      },
    ],
  },
  "把'开心'换成'兴高采烈'": {
    toolCalls: [
      {
        toolCallId: 'call_3',
        toolName: 'replaceText',
        args: { old: '开心', new: '兴高采烈', scope: 'first' },
      },
    ],
  },
};
```

### Step 6: Schema 提取工具实现

**目标**：实现 Schema 信息提取功能，用于测试。

**任务清单**：

- [ ] 创建 `frontend/src/utils/schemaExtractor.ts`
- [ ] 实现 `extractSchemaInfo(editor)` 函数
- [ ] 测试 Schema 信息提取（验证能正确提取 nodes 和 marks）

### Step 7: Schema 感知测试

- [ ] 测试 Schema 约束注入（验证 System Prompt 包含 Schema 信息）
- [ ] 测试 Schema 验证（验证 LLM 不会生成不支持的格式）

## 3. 验收标准

### 3.1 后端测试验收

1.  **Script Pass**: 后端测试脚本能连续 10 次正确解析指令。
2.  **Schema Validation**: 所有 Tool Call 都通过 Zod Schema 验证。
3.  **Safety Check**: 生成性指令（如"写一篇作文"）被正确拒绝。

### 3.2 前端测试验收

1.  **UI Pass**: 前端在 Mock 模式下，点击"模拟指令"按钮，能流畅展示 Diff 和执行修改。
2.  **Tool Execution**: 所有工具类型（insertText, deleteText, replaceText, applyFormat）都能正确执行。
3.  **Diff Preview**: Diff 预览功能正常工作，用户可以看到修改前后的对比。
4.  **State Management**: 编辑器状态正确更新，支持撤销/重做。

### 3.3 集成测试验收（可选）

1.  **End-to-End**: 真实 Ollama 连接测试，验证端到端流程。
2.  **Performance**: 延迟在可接受范围内（< 1 秒）。
3.  **Error Handling**: 错误处理完善，不会导致编辑器崩溃。
