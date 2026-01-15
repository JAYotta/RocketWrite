# Prompt for Tool Schema Definition and Feasibility Verification

**Context:**
We are building a local-first AI writing assistant "RocketWrite" for primary school students.

- **Frontend**: React + Tiptap Editor.
- **AI Model**: Local Qwen 2.5 Coder (1.5B/7B) via Ollama.
- **Framework**: Vercel AI SDK Core (`generateObject`).
- **Pattern**: Intent-Based Commands (Headless Editor). The AI does NOT rewrite the whole document. It outputs structured JSON commands that the frontend executes.

**Goal:**
Define the Zod Schemas for the editor's core capabilities and verify they are robust enough for a small local model to output reliably.

---

## The Request

You are a Senior AI Architect specializing in "Agentic Editing".

**Reference Documentation:**

- [Available Tools](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/tools/available-tools)
- [Execute Tool](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/primitives/execute-tool)
- [Edit Document](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/primitives/edit-the-document)
- [AI Engineering Guide](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/advanced-guides/ai-engineering)
- [Editor Commands](https://tiptap.dev/docs/editor/api/commands)
- [ProseMirror Commands Guide](https://prosemirror.net/docs/guide/#commands)
- [ProseMirror Commands Reference](https://prosemirror.net/docs/ref/#commands)
- [Vercel AI SDK: generateObject](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object)
- [Vercel AI SDK: Structured Data](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)

**Task 1: Analyze & Define Tool Schema**
Analyze the Tiptap AI Toolkit documentation and Vercel AI SDK capabilities.

**Critical Research Context**: Our internal research indicates that for local small models (Qwen 2.5 1.5B/7B), **Structured Output (`generateObject` with Zod Schema) is significantly more reliable than native Tool Calling**.

- Do NOT design for "Native Tool Calling" (where the model decides to call a function).
- Design for "Intent Extraction" where the model purely translates user text into a strict JSON structure defined by Zod.

Determine if we should adopt Tiptap's native tool patterns (e.g., generic `tiptapEdit`) or strictly separate explicit tools (`insertText`, `deleteText`, etc.).
_Constraint_: The schema must be simple enough for Qwen 2.5 Coder 1.5B/7B. Complex patch/diff formats are likely to fail. Preferred pattern is strict JSON objects that the frontend imperatively executes.

Create a TypeScript file `frontend/src/schemas/editor-commands.ts` exporting the optimal Zod definitions.
_Critical Constraint_: The schema must be simple enough for Qwen 2.5 Coder 1.5B/7B. Complex patch/diff formats are likely to fail.

Proposed Baseline Tools (verify/refine these):

1.  `insertText`: Insert text at a position (default to current selection).
2.  `deleteText`: Delete text at a target (selection, or descriptive text like "delete the second paragraph").
3.  `replaceText`: Replace specific text with new text. _Constraint_: Must include `old` (original text) for robust matching.
4.  `applyFormat`: Apply formatting (bold, italic, highlight) to a target.

**Task 2: Feasibility Verification (Mock Data)**
For each defined tool, provide 3 "Few-Shot" examples that we will use to test the model.
Format: `User Intent` -> `Expected JSON Output`.

**Requirements:**

- **Strict Typing**: Use `z.enum` where possible (e.g., for `operation` or `format` types) to constrain the small model.
- **Ambiguity Handling**: How should the schema handle "Delete the last sentence"? (Tip: Should the target be a generic string description for the specialized logic to handle, or a specific coordinate? _Preference: Descriptive string target for POC, simpler for LLM_).
- **Feasibility Check**: Explain _why_ this schema structure is safe for a Qwen 2.5 Coder 1.5B model. (e.g., "avoiding deeply nested arrays", "using explicit field names").

**Output Format:**
Please output the response in 2 sections:

1. `## Schema Definition` (TypeScript code block)
2. `## Verification Test Cases` (Markdown table or list)

---

## Implementation Status

**✅ Completed**

The Schema Definition and Verification have been implemented:

1. **Schema Definition**: [`frontend/src/schemas/editor-commands.ts`](../../../frontend/src/schemas/editor-commands.ts)

   - Defines six core commands: `insertText`, `deleteText`, `replaceText`, `applyFormat`, `undo`, `redo`
   - Uses Zod schemas with discriminated union pattern
   - Type separation: `EditorPosition` for insert operations, `EditorRange` for delete/format operations
   - Optimized for Qwen 2.5 Coder 1.5B/7B model constraints
   - Supports range coordinates `{from, to}` based on testing results

2. **Verification Test Cases**: [`docs/agent/verification/schema_verification_cases.md`](../../verification/schema_verification_cases.md)
   - Provides feasibility reasoning for small model compatibility
   - Includes few-shot examples for each tool type
   - Covers edge cases and ambiguity handling

**Key Design Decisions:**

- **Structured Output Pattern**: Using `generateObject` with Zod Schema instead of native Tool Calling
- **Type Separation**: Separated `EditorPosition` (for insertText) and `EditorRange` (for deleteText/applyFormat)
  - `insertText` uses optional `target?: EditorTarget` (includes both position and range)
  - `deleteText` and `applyFormat` only use `EditorRange` (supports "selection" or {from, to} coordinates)
- **Default Behavior**: If `insertText` target is not provided, directly calls `insertContent(text)` (Tiptap default)
- **Range Coordinate Support**: Testing confirms small models can output range coordinates `{from: number, to: number}`
- **Explicit Text Matching**: `replaceText` requires `old` field for robust matching
- **Enum Constraints**: Limited format types to `['bold', 'italic', 'highlight']` to prevent hallucinations

**⚠️ Schema Compatibility Verification:**

**Status**: ✅ **Technically Compatible** - The Schema works with Vercel AI SDK's `generateObject`

**Test Results**:

- ✅ `generateObject` accepts the Zod Schema without errors
- ✅ Schema validation passes (Zod validates the output structure)
- ✅ All four command types (`insertText`, `deleteText`, `replaceText`, `applyFormat`) are supported

**Known Issues** (from actual test runs):

- ⚠️ Model output quality varies (expected for 1.5B model)
- ⚠️ Some confusion between `name` field and `arguments.type` field in wrapper schema (see `test-backend.ts`)
- ✅ Schema structure itself is valid and compatible with `generateObject`

**Recommendation**: The base schemas in `editor-commands.ts` are correctly designed using `z.discriminatedUnion("type", ...)`. The wrapper schema in `test-backend.ts` adds a `name` field which may cause model confusion, but this is an implementation detail of the test script, not the core schema definition.
