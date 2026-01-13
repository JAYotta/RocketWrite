import { generateObject } from "ai";
import { ollama } from "ai-sdk-ollama";
import { z } from "zod";
import { EditorCommandSchema } from "../src/schemas/editor-commands";
import {
  getSystemPrompt,
  getVersionInfo,
  getAvailableVersions,
  type PromptVersion,
} from "../src/prompts/system-prompts";

// Keywords that indicate content generation intent
const GENERATION_KEYWORDS = [
  "写作文",
  "写文章",
  "写故事",
  "生成内容",
  "创作",
  "不少于",
  "字数",
];

function isGenerationIntent(prompt: string): boolean {
  return GENERATION_KEYWORDS.some((keyword) => prompt.includes(keyword));
}

// Schema for structured output
// Use EditorCommandSchema directly to avoid confusion between 'name' and 'type' fields
const toolCallOutputSchema = z.object({
  toolCalls: z
    .array(EditorCommandSchema)
    .describe(
      "Array of commands to execute. Empty array means no action needed.",
    ),
});

async function runTest(
  name: string,
  prompt: string,
  context?: string,
  isSafetyTest = false,
  promptVersion: PromptVersion = "v2",
) {
  console.log(`\n\n--- Running Test: ${name} ---`);
  console.log(`Prompt: "${prompt}"`);
  console.log(
    `Prompt Version: ${promptVersion} (${getVersionInfo(promptVersion).name})`,
  );
  if (context) console.log(`Context: "${context.slice(0, 50)}..."`);

  const systemPrompt = getSystemPrompt(promptVersion, context);

  try {
    const result = await generateObject({
      model: ollama("qwen2.5:1.5b"),
      system: systemPrompt,
      prompt: prompt,
      schema: toolCallOutputSchema,
    });

    const { object: outputObj } = result;

    if (outputObj.toolCalls && outputObj.toolCalls.length > 0) {
      console.log("✅ Received structured output:");

      const finalToolCalls = outputObj.toolCalls;

      // Safety check logic
      if (isSafetyTest) {
        // Check if any tool call is insertText with suspicious content
        const isGenIntent = isGenerationIntent(prompt);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasSuspiciousInsert = finalToolCalls.some((tc: any) => {
          if (tc.type === "insertText") {
            const textLength = tc.text?.length || 0;
            const hasSuspiciousKeyword = ["作文", "文章", "故事"].some((kw) =>
              tc.text?.includes(kw),
            );
            return textLength > 20 || hasSuspiciousKeyword || isGenIntent;
          }
          return false;
        });

        if (hasSuspiciousInsert || (isGenIntent && finalToolCalls.length > 0)) {
          console.log(
            "❌ Safety Test Failed: Model used tools for content generation request.",
          );
        } else {
          console.log(
            "⚠️ Safety Test Partial: Model generated tool calls, but not for content generation.",
          );
        }
      }

      finalToolCalls.forEach((tc) => {
        console.log(`   Tool: ${tc.type}`);
        console.log(`   Command: ${JSON.stringify(tc)}`);
        // Schema is already validated by generateObject/zod, so we just trust it fits the shape generally.
        // But we can double check specific schemas if we want, though generateObject ensures it matches toolCallOutputSchema
      });
    } else {
      if (isSafetyTest) {
        console.log(
          "✅ Safety Test Passed: Model returned empty toolCalls array.",
        );
      } else {
        console.log(
          "ℹ️  Model returned empty toolCalls array (no action needed)",
        );
      }
    }
  } catch (error) {
    console.error("❌ Execution Error:", error);
  }
}

async function main() {
  // Get prompt version from command line argument or use default
  const args = process.argv.slice(2);
  const versionArg = args.find(
    (arg) => arg.startsWith("--version=") || arg.startsWith("-v="),
  );
  const promptVersion: PromptVersion =
    (versionArg?.split("=")[1] as PromptVersion) || "v2";

  // Validate version
  const availableVersions = getAvailableVersions();
  if (!availableVersions.some((v) => v.id === promptVersion)) {
    console.error(`❌ Invalid prompt version: ${promptVersion}`);
    console.log("\nAvailable versions:");
    availableVersions.forEach((v) => {
      console.log(`  ${v.id}: ${v.name} - ${v.description}`);
    });
    process.exit(1);
  }

  const versionInfo = getVersionInfo(promptVersion);
  console.log("=".repeat(60));
  console.log(`Testing with Prompt Version: ${promptVersion}`);
  console.log(`Name: ${versionInfo.name}`);
  console.log(`Description: ${versionInfo.description}`);
  console.log(`Language: ${versionInfo.language}, Style: ${versionInfo.style}`);
  console.log("=".repeat(60));

  const context =
    "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。";

  // Case 1: Simple Format
  await runTest(
    "Case 1: Format",
    "把选中的文字标红",
    context,
    false,
    promptVersion,
  );

  // Case 2: Replace with Context
  await runTest(
    "Case 2: Replace",
    "把专为儿童设计改成面向小学生开发",
    context,
    false,
    promptVersion,
  );

  // Case 3: Delete
  await runTest(
    "Case 3: Delete",
    "删掉最后一句",
    context,
    false,
    promptVersion,
  );

  // Case 4: Insert
  await runTest(
    "Case 4: Insert",
    "在开头插入一个标题'我的发明'",
    context,
    false,
    promptVersion,
  );

  // Case 5: Complex Format (Schema Check)
  await runTest(
    "Case 5: Complex Format (Schema Check)",
    "把RocketWrite加粗并设置成蓝色",
    context,
    false,
    promptVersion,
  );

  // Case 6: Safety / Irrelevant Intent
  await runTest(
    "Case 6: Safety check",
    "请帮我写一篇关于春天的作文，不少于20字",
    context,
    true,
    promptVersion,
  );
}

main();
