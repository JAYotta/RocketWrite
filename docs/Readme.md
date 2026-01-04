# 文档索引

为了便于新人快速了解项目，建议按以下顺序阅读文档：

## 1. 系统架构 (Architecture)

了解系统的整体设计、模块划分及数据流向。

- [系统架构](architecture.md)

## 2. 项目背景与研究 (Research)

了解项目的起源、痛点分析和核心理念。

- [面向小学生写作痛点的“口头作文”智能辅助工具可行性深度研究报告](research/小学生语音写作工具可行性分析.md)
  > **研究需求**：需要用语音录入作文草稿，并用语音完成修改。
- [基于语音交互的小学生作文纯效率工具可行性深度研究报告](research/语音作文草稿工具可行性研究.md)
  > **研究需求**：不是代写，而是提效工具。核心是用语音录入作文草稿，并用语音完成修改，痛点在于写字的草稿修改麻烦，打字速度不够快操作不够熟练并且会影响思路。不提供生成功能，不提供引导性建议。
- [“口述即草稿”：面向小学生的语音交互式写作效率工具（Cursor for Kids）](research/小学生高效语音写作工具：基于“Cursor模式”的可行性分析.md)
  > **研究需求**：背景重心应该是写作的低效率，小学生抄写每分钟只能十几个字，草稿修改更是需要反复誊抄，一篇作文可能需要两个小时甚至更多。3.1.1 里，内容润色举的例子”换个更高级的词汇“改成”把开心换成兴高采烈“，因为我们不应该辅助创造，而是纯粹的效率工具。3.2.1 双通道似乎并不是个好设计，但是触发了我的灵感，比如双屏设计，左侧是正文内容，右侧是语音识别，把语音识别里的意图识别出来变成正文显示在左侧，当识别出修改意图时，左侧可以高亮修改区域并显示新内容，同时给一个撤销的操作，类似 cursor 的代码 diff&accept/reject 3.2.3 也可以同步更新，但不要作为核心创新点。4.2.1 是否可以参考 cursor 等可视化工具是怎么做到的。
- [针对儿童作文场景的自研 Tiptap 语音智能写作工具：技术可行性、竞品分析与战略路径深度研究报告](research/Tiptap语音写作工具可行性分析.md)
  > **研究需求**：参考 tiptap voice control demo https://www.youtube.com/watch?v=FYETnU-RhyA 思考，并且可能可以忽略我提出的双屏以及二次确认思路，不要考虑墨水屏什么的，我只需要做一个效率工具给自家孩子用，需要先分析可行性，包括能否达到预期效果，技术可行性后加入是否有更好的选择的思考。
- [语音优先 literacy 架构：面向小学生写作过程的非生成式效率工具深度研究报告](research/儿童写作低效解决方案研究.md)
  > **研究需求**：解决核心痛点需要考虑孩子写作的低效率，小学生抄写每分钟只能十几个字，草稿修改更是需要反复誊抄，打字速度不够快操作不够熟练并且会影响思路，一篇作文可能需要两个小时甚至更多。不要提供辅助创作能力，可能会让孩子不自主思考。不需要考虑物理输出，最终版本还是需要誊抄的。

**总结**：目前来看 `针对儿童作文场景的自研 Tiptap 语音智能写作工具` 最接近我想要的效果，但是没有严格禁止生成式，而 `语音优先 literacy 架构` 又丢弃了 tiptap voice control 的效果，似乎偏离了。

- [意图架构：富文本编辑器中自然语言指令解析的开源范式](research/Tiptap智能指令解析开源方案.md)
  > **研究需求** 已完成 tiptap 和语音转录的功能，现在需要思考智能指令解析的技术方案。目前的建议是
  >
  > ```
  > 引入一个极轻量的本地 LLM 来做这个“意图判断”任务：
  > 模型选择：Qwen2.5-0.5B 或 Llama-3.2-1B。这些模型只有几百 MB，在 Mac 上运行飞快（几毫秒到几十毫秒）。
  > 用途：由它来判断用户的这段话是“指令”（如：“把这段删了”、“变成红色标题”）还是“正文内容”。
  > ```
  >
  > 需要考虑怎么样让 LLM 输出编辑器可执行的编辑指令 可能 https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/primitives/edit-the-document 这个 ai-toolkit 最合适，但是在订阅外额外需要联系销售购买的功能，没法快速使用
  >
  > 可能可以参考 https://github.com/artemnistuley/awesome-prosemirror 和 https://github.com/ueberdosis/awesome-tiptap 看看是否能找到合适的库
- [解构黑盒与本地化实现方案：用 LangChain 复现 Tiptap AI Toolkit 的结构化编辑命令](research/Tiptap%20AI%20Toolkit%20结构化输出研究.md)

  > **研究需求**: 从 https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/tools/available-tools 来看，似乎可以通过 langchain 完成结构化的输出？但是 ai-toolkit 怎么包装的结构化编辑命令似乎仍然是个黑盒，请向这个方向继续展开研究

**架构决策 (2026.01.04)**：采用 **Ollama + Vercel AI SDK** 方案。

- **模型**: Qwen2.5-Coder-1.5B (本地)
- **协议**: OpenAI-Compatible API (通过 Ollama Serve)
- **前端**: Vercel AI SDK (`useChat` + Tool Calling)
- **详情**: [架构决策文档](research/2026-01-04-decision-ollama-vercel.md) | [Phase 2 实施计划](agent/plan-step2-intelligence.md)

## 3. 技术选型

- [ASR 方案评估](research/analysis-asr-options.md) - 对比 Web Speech, Whisper WASM, RealtimeSTT 和 Native MLX 方案
- [Agent 架构决策](agent/asr-architecture-decision.md) - **(Agent Reference)** 核心架构决策记录：Frontend VAD + Stateless MLX Backend

## 4. 实施计划

具体的开发计划和步骤。

- [整体项目计划](agent/plan-overall.md)
- [第一步实施计划](agent/plan-step1-transcription.md)
- [Phase 2 实施计划](agent/plan-step2-intelligence.md)
