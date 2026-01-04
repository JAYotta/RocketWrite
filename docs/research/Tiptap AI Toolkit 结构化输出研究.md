# **解构黑盒与本地化实现方案：用 LangChain 复现 Tiptap AI Toolkit 的结构化编辑命令**

## **1\. 执行摘要**

在富文本编辑器的技术演进中，确定性的文档对象模型（DOM）操作正逐渐被大语言模型（LLM）驱动的概率性生成所增强，甚至在某些场景下被取代。Tiptap AI Toolkit 代表了这一转型的先锋，它在无头（Headless）编辑器框架内提供了一种无缝的“魔法棒”体验。然而，对于许多企业级应用和注重隐私的开发者而言，该工具包对不透明云基础设施和专有编排层的依赖，在数据主权、成本扩展和定制深度方面构成了不可接受的约束。

本报告提供了一份详尽的技术蓝图，旨在解构 Tiptap AI Toolkit 的核心功能基元——特别是其结构化编辑命令和 Schema 感知（Schema Awareness）机制——并使用完全自主的开源技术栈进行复现。通过利用 **LangChain.js** 进行编排，并结合 **本地 LLM**（特别是通过 Ollama 部署的 Qwen 2.5 系列）进行推理，我们证明了在本地环境中不仅可以实现与商业 SaaS 产品同等的功能，甚至在某些特定场景下能超越其性能。

分析显示，Tiptap AI Toolkit 的“黑盒”本质上是一种专门化的检索增强生成（RAG）实现，其中“检索到的上下文”是文档的当前状态（Selection \+ Context），而“生成约束”则是 ProseMirror 的 Schema 定义。我们将深入探讨从简单的文本补全转向 **结构感知文档转换** 所需的架构转变，利用 LangChain 的结构化输出能力直接与编辑器的事务性状态（Transactional State）进行交互。此外，我们提出，针对代码和结构化数据微调的本地小语言模型（SLM），如 Qwen 2.5-Coder，提供了优越的延迟-成本曲线，使得客户端或边缘部署的 AI 编辑成为可能，为高频编辑任务提供了比云端替代方案更具优势的解决方案 1。

## ---

**2\. 引言：AI 辅助富文本编辑的范式转移**

### **2.1 从 ContentEditable 到 AI 原生编辑器**

Web 富文本编辑器的发展历程是一部不断寻求控制权的历史。早期的编辑器依赖于浏览器原生的 contenteditable 属性，导致了著名的“HTML 混乱”问题，即不同的浏览器生成的 HTML 标记不一致。随着 **ProseMirror** 和 **Slate.js** 等框架的出现，开发者重新夺回了控制权，通过定义严格的数据模型（Schema）和事务（Transaction）来管理文档状态。Tiptap 作为基于 ProseMirror 构建的无头包装器，因其 Vue/React 友好的 API 设计而迅速成为行业标准 4。

然而，随着生成式 AI 的爆发，编辑器面临着新的挑战：如何让一个本质上不可预测的概率模型（LLM）与一个本质上需要严格结构化数据的确定性引擎（ProseMirror）协作？

### **2.2 Tiptap AI Toolkit 的价值主张与局限**

Tiptap AI Toolkit 通过提供一套预构建的工具，解决了这一矛盾。它允许开发者通过简单的 API 调用实现“缩短文本”、“调整语气”或“自动续写”等功能 2。其核心价值在于：

1. **上下文感知**：它不仅仅发送选中的文本，还发送周围的上下文，使 AI 理解语境。  
2. **Schema 感知**：它防止 AI 生成当前编辑器配置不支持的 HTML 标记（如在不支持表格的编辑器中生成 \<table\>）1。  
3. **流式传输**：它处理了复杂的网络流，实现了类似打字机的视觉效果。

尽管如此，作为一款 SaaS 产品，它引入了显著的局限性：

* **黑盒操作**：开发者无法查阅或修改发送给 LLM 的系统提示词（System Prompt），难以进行细粒度的行为调优。  
* **数据隐私**：所有内容必须经过 Tiptap 的服务器中转，这对于处理敏感数据（如法律、医疗文档）的应用是致命的阻碍。  
* **成本结构**：基于使用量的定价模型在规模化部署时成本高昂，且开发者无法利用自有的计算资源 7。

### **2.3 本地化复现的战略意义**

利用 LangChain 和本地 LLM 复现 Tiptap AI Toolkit，不仅仅是成本优化，更是一场关于 **AI 主权** 的战略转移。通过解耦编辑体验与云端 API，开发者可以获得：

* **完全的提示词控制权**：针对特定垂直领域（如学术写作、法律合同）定制 AI 的行为。  
* **模型选择的灵活性**：利用 Qwen 2.5 等开源模型在中文处理和结构化输出上的优势 3。  
* **零数据出境**：确保所有推理过程在用户设备或私有云中完成，满足最严格的合规要求。

## ---

**3\. 解构黑盒：Tiptap AI Toolkit 的解剖学分析**

为了忠实地复现 Tiptap AI Toolkit，我们必须首先对其架构行为、数据流向和核心功能基元进行深入的解剖。Tiptap AI 并非魔法，而是一套精密的中间件系统，负责在自然语言意图与 ProseMirror 引擎所需的严格数据结构之间进行翻译。

### **3.1 功能基元的分类与解析**

Tiptap AI Toolkit 的能力可以归纳为三个截然不同的操作基元。理解这些基元是设计 LangChain 替代方案的基础。

#### **3.1.1 生成式转换（Generative Transformation）**

这是最直观的功能，对应于“编辑”命令。诸如 aiShorten（缩短）、aiFixSpellingAndGrammar（拼写语法修复）或 aiAdjustTone（调整语气）等命令，其本质是对文档中特定切片（Slice）的操作 9。

* **机制**：编辑器提取用户选中范围内的 HTML 或纯文本，将其封装在一个提示词模板中（例如：“将以下文本重写得更专业...”），然后发送至云端 9。  
* **技术难点**：如果选区包含富文本格式（粗体、斜体、链接、自定义节点），AI 的响应必须保留这些格式，或者智能地重建它们。一个天真的实现如果只返回纯文本，将会剥离文档的语义丰富性，导致用户体验退化。

#### **3.1.2 Schema 感知（Schema Awareness）：安全层**

这是 Tiptap AI Toolkit 与普通 Chatbot 集成的关键区别 1。

* **问题定义**：标准的 LLM 可能会在响应中生成一个 \<table\> 标签。然而，如果当前的 Tiptap 编辑器实例没有加载 Table 扩展，注入这段 HTML 会导致编辑器崩溃，或者触发 ProseMirror 的清洗机制，导致内容丢失。  
* **Tiptap 的解决方案**：Toolkit 会序列化编辑器当前的 Schema（定义了哪些节点和标记是合法的），并将此上下文注入系统提示词中。这实际上是为 LLM 设定了“生成边界”，强迫其只使用合法的 HTML 标签 2。  
* **复现挑战**：LangChain 实现必须能够在运行时动态提取 editor.schema 规范，并将其转换为 LLM 能够理解的 Zod Schema 或 JSON Schema 约束 1。

#### **3.1.3 上下文感知（Contextual Awareness）：环顾四周**

Toolkit 不会孤立地发送选中的文本。它实现了“上下文感知编辑”，意味着 AI 能够感知选区 *周围* 的文本 2。

* **机制**：这涉及到一个滑动窗口（Sliding Window）策略，将“前文（Pre-context）”和“后文（Post-context）”作为独特的上下文块发送。这使得 LLM 能够保持叙述的连贯性（例如，确保生成的句子与前一段落逻辑衔接）。

### **3.2 专有数据流的逆向分析**

在官方的 Tiptap AI 架构中，数据流是中心化的：

1. **客户端（Client Side）**：Tiptap 扩展捕获选区，序列化 Schema，并打包上下文。  
2. **传输层（Transmission）**：通过 WebSocket 或 HTTP 请求发送至 Tiptap 的专有云后端（collab 或 ai 服务） 10。  
3. **编排层（Orchestration）**：后端充当代理，选择模型（通常是 OpenAI），管理 API 密钥，并极有可能执行提示词注入（Prompt Injection）以强制执行安全和格式规范。  
4. **推理层（Inference）**：LLM 处理请求。  
5. **流式响应（Streaming Response）**：后端将结果流式传回客户端，客户端扩展解析流并通过 ProseMirror 事务更新文档。

SaaS 模型的批判：  
虽然这种架构提供了便利，但它引入了一个“中间人”依赖。开发者无法控制 Tiptap 使用的系统提示词，无法轻易更换为微调后的本地模型，并且必须将敏感文档数据路由经过第三方处理器。

### **3.3 目标架构：无头（Headless）AI 架构**

我们的目标是复现这一流程，但将“传输层”和“编排层”重定向至自主控制的基础设施。我们将用 **LangChain.js** 后端（或客户端逻辑）替代 Tiptap Cloud，并用 **本地推理引擎**（Ollama）替代商业 LLM 提供商。

| 特性维度 | Tiptap AI Toolkit (SaaS) | 提议的 LangChain \+ 本地化架构 |
| :---- | :---- | :---- |
| **编排引擎** | 专有云代理 (Proprietary Cloud Proxy) | LangChain.js (Chains & Agents) |
| **Schema 验证** | 内部黑盒逻辑 | Zod Schema / 结构化输出 11 |
| **模型后端** | OpenAI / Cloud LLMs | 本地 Qwen 2.5 / Llama 3 via Ollama |
| **上下文窗口** | 固定 / 不透明 | 通过提示词工程完全可定制 |
| **成本模式** | 订阅制 / 用量计费 | 算力受限（零边际成本） |
| **数据隐私** | 第三方处理 | 本地/私有云驻留 |

## ---

**4\. 开源架构蓝图：LangChain.js 与本地 LLM 的融合**

为了实现本地化，我们必须构建一个能够连接基于浏览器的编辑器与本地模型的架构。**ProseMirror**（Tiptap 的底层引擎）4 和 **LangChain** 的结合提供了必要的基元。

### **4.1 前端层：Tiptap 作为消费者**

前端依然是 Tiptap，但我们不再安装 @tiptap-pro/ai-toolkit，而是构建一个自定义扩展，我们将其命名为 LocalAIExtension。

* **职责**：该扩展负责 UI 交互（浮动菜单、Slash 命令），捕获 editor.state.selection，将文档切片序列化为 JSON/Markdown，并在接收到数据后执行实际的 insertContent 或 replace 事务 12。

### **4.2 桥接层：LangChain.js**

LangChain.js 充当了专有 Tiptap 后端的替代品。它负责：

1. **提示词构建**：将编辑器 Schema 和用户指令组装成系统提示词。  
2. **模型抽象**：提供一个统一的接口来与 Ollama、OpenAI 或任何其他提供商通信，而无需更改前端代码 13。  
3. **结构化输出强制**：使用 withStructuredOutput 强迫 LLM 返回与 Tiptap JSON 结构匹配的数据或严格的 HTML 11。

### **4.3 智能层：Ollama 本地推理**

对于本地实现，我们利用 **Ollama** 作为模型服务器 15。

* **为何选择本地？** 隐私保护、小幅编辑的零延迟体验、以及无 API 成本。  
* **模型选择策略**：我们优先推荐 **Qwen 2.5**（特别是 Coder 变体）。  
  * *证据支持*：Qwen 2.5 Coder（0.5B 至 32B 参数）在结构化数据生成和指令遵循方面表现出了 SOTA（State of the Art）级别的性能，在严格的代码/JSON 任务中往往优于 Llama 3.1 3。  
  * *关联性*：ProseMirror 文档本质上是代码（JSON 树）。一个擅长生成代码的模型，天生比通用的聊天模型更擅长生成有效的文档结构。

### **4.4 架构图（概念性）**

为了更清晰地展示数据流向，我们构建如下的 Mermaid 图表：

Code snippet

graph LR  
    subgraph Client \[用户浏览器\]  
        A \--\>|1. 选区 & Schema| B(LocalAIExtension)  
        B \--\>|6. 事务 (replaceSelection)| A  
    end  
      
    subgraph Orchestration \[LangChain 服务层\]  
        B \--\>|2. HTTP/WebSocket| C{LangChain.js Backend}  
        C \--\>|3. 提示词 \+ Zod Schema| D\[Ollama / Qwen 2.5\]  
        D \--\>|4. 结构化 JSON| C  
        C \--\>|5. 验证后的 Fragment| B  
    end

这一架构图清晰地表明，原本流向 Tiptap Cloud 的数据现在被完全拦截并流向了自定义的 LangChain 服务层。

## ---

**5\. 技术实现 I：使用 LangChain 构建结构化编辑后端**

核心挑战不在于生成文本，而在于生成编辑器能够消化且不会崩溃的 **结构化更新**。我们将探讨两种实现策略：**HTML 流式传输**（较简单，类似 Tiptap 默认行为）和 **JSON 对象生成**（更健壮，利用 Qwen 的优势）。

### **5.1 策略 A：Schema 感知的 HTML 流**

Tiptap 原生支持通过 editor.commands.setContent(html) 或 insertContent(html) 消费 HTML 12。复现的最快路径是指示 LLM 返回 HTML。

#### **5.1.1 LangChain 提示词模板设计**

我们必须构建一个能够注入允许标签的系统提示词。

TypeScript

// 概念性 LangChain.js 实现  
import { ChatPromptTemplate } from "@langchain/core/prompts";

const systemPrompt \= \`你是一个专业的 AI 编辑助手。  
你的任务是根据用户的指令修改提供的文本。  
重要提示：你必须返回有效的 HTML。  
Schema 约束：编辑器仅支持以下标签：{allowedTags}。  
不要使用 Markdown。除非明确允许，否则不要使用 \<div\> 或 \<span\> 等标签。\`;

const prompt \= ChatPromptTemplate.fromMessages(\["system", systemPrompt\],  
  \["human", "上下文：{context}"\],  
  \["human", "待修改内容：{input\_text}"\],  
  \["human", "指令：{command}"\]);

#### **5.1.2 复现“Schema 感知”**

Tiptap Toolkit 提供了 getHtmlSchemaAwareness(editor.schema) 1，但在从零构建时，我们需要编写一个实用程序来提取它。我们可以遍历 editor.schema.nodes 和 editor.schema.marks 来构建白名单。

* **提取逻辑**：  
  * 遍历 editor.schema.spec.nodes。  
  * 将内部名称（如 bulletList）映射到 HTML 标签（如 \<ul\>、\<li\>）。  
  * 将此列表传递给 LangChain 提示词中的 allowedTags 变量。

#### **5.1.3 LangChain 调用链**

TypeScript

import { ChatOllama } from "@langchain/ollama";  
import { StringOutputParser } from "@langchain/core/output\_parsers";

const model \= new ChatOllama({  
  model: "qwen2.5:7b", // 强大的指令遵循能力  
  temperature: 0.2, // 低温以保证结构稳定性  
});

const chain \= prompt.pipe(model).pipe(new StringOutputParser());

### **5.2 策略 B：结构化 JSON 输出（ProseMirror 之道）**

一种更高级且稳健的方法是跳过 HTML 解析，直接生成 **Tiptap JSON**。这正是 Qwen 2.5 Coder 大显身手的地方，因为它将文档树视为代码对象。

#### **5.2.1 定义输出 Schema**

我们使用 zod 来定义 ProseMirror 节点的结构。LangChain 的 withStructuredOutput 创建了一种受限的生成模式 11。

TypeScript

import { z } from "zod";

// 简化的 ProseMirror 节点 Schema  
const TextNodeSchema \= z.object({  
  type: z.literal("text"),  
  text: z.string(),  
  marks: z.array(z.object({ type: z.string() })).optional(),  
});

const ElementNodeSchema \= z.object({  
  type: z.string(), // 例如 'paragraph', 'heading'  
  content: z.array(z.lazy(() \=\> NodeSchema)).optional(),  
  attrs: z.record(z.any()).optional(),  
});

const NodeSchema \= z.union();

const ResponseSchema \= z.object({  
  thought\_process: z.string().describe("对编辑内容的推理过程"),  
  updated\_content: z.array(NodeSchema).describe("Tiptap JSON 内容数组"),  
});

#### **5.2.2 结构化链**

TypeScript

const structuredModel \= model.withStructuredOutput(ResponseSchema);  
const result \= await structuredModel.invoke({  
  input\_text: JSON.stringify(currentSelectionJSON),  
  command: "将此文本修改得更正式",  
});

**洞察**：通过首先要求 thought\_process 字段，我们允许模型在生成 JSON 之前执行“思维链（Chain of Thought）”推理。这显著提高了编辑质量，因为模型可以在致力于严格语法之前规划重组 19。

### **5.3 流式编辑的实现挑战**

Tiptap AI Toolkit 之所以感觉流畅，是因为它是流式的。LangChain 支持流式传输，但将其桥接到 Tiptap 需要小心处理。

* **文本流式**：如果生成 HTML/文本，我们可以增量使用 editor.commands.insertContent，但这有风险，因为部分的 HTML 是无效的。  
* **“影子”文档模式**：一种更好的模式（Novel.sh 和其他高级实现所采用）是将响应流式传输到一个隐藏的或“影子”节点中，一旦流完成或达到稳定状态，再将其交换到主文档中 12。  
* **Vercel AI SDK 集成**：或者，使用 Vercel AI SDK 的 streamText（它与 Tiptap 集成良好）配合自定义 LangChain 适配器，可以兼得 LangChain 的推理链和 Vercel 的优化前端 Hooks 22。

## ---

**6\. 技术实现 II：构建 Tiptap 客户端扩展**

要完全复现体验，我们需要编写一个 Tiptap Extension，它不仅负责网络通信，还负责捕获编辑器的状态。

### **6.1 扩展的骨架设计**

我们需要创建一个自定义扩展，比如 LocalAI，它注册命令并处理状态捕获。

TypeScript

// extensions/LocalAI.ts  
import { Extension } from '@tiptap/core';

export const LocalAI \= Extension.create({  
  name: 'localAI',

  addCommands() {  
    return {  
      aiEdit: (command: string) \=\> async ({ editor, tr, dispatch }) \=\> {  
        // 1\. 捕获状态  
        const { from, to } \= editor.state.selection;  
        const slice \= editor.state.selection.content();  
        const jsonSelection \= slice.toJSON();  
          
        // 提取上下文（滑动窗口）  
        const contextSize \= 1000;  
        const contextBefore \= editor.state.doc.textBetween(Math.max(0, from \- contextSize), from);  
        const contextAfter \= editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to \+ contextSize));

        // 2\. 发送到 LangChain 后端  
        const response \= await fetch('/api/ai/edit', {  
            method: 'POST',  
            body: JSON.stringify({  
                selection: jsonSelection,  
                command: command,  
                context: { before: contextBefore, after: contextAfter }  
            })  
        });

        const data \= await response.json();

        // 3\. 应用编辑  
        if (dispatch && data.content) {  
            // 将 JSON 转换回 ProseMirror 节点  
            const node \= editor.schema.nodeFromJSON({  
                type: 'doc',   
                content: data.content  
            });  
              
            // 替换选区，保留撤销历史  
            editor.commands.insertContentAt({ from, to }, node.content);  
        }  
        return true;  
      },  
    };  
  },  
});

**代码解析**：

* **状态捕获**：不仅捕获选区 jsonSelection，还捕获了 contextBefore 和 contextAfter。这复现了 Tiptap AI 的上下文感知功能。  
* **事务应用**：insertContentAt 命令内部会创建一个 ProseMirror Transaction。通过替换范围 \[from, to\]，我们确保了操作是原子的，并且可以被 History 扩展捕获，从而支持 Ctrl+Z 撤销。

### **6.2 UI 集成：复现 Novel.sh 风格的菜单**

Novel.sh 提供了一个极佳的参考实现 21。我们需要复现其 UI 逻辑：

* **气泡菜单 (Bubble Menu)**：当用户选中一段文本时，显示“Ask AI”按钮。  
* **Slash 命令**：当用户输入 / 时，显示 AI 命令列表（如“续写”、“总结”）。

这些 UI 组件可以直接调用我们上面定义的 editor.commands.aiEdit(prompt)。

## ---

**7\. 本地化智能：Qwen 与 Ollama 的战略选择**

用户查询明确提到了“本地化实现方案”。底层模型的选择是本地实现成功与否的单一最大因素。

### **7.1 本地模型基准测试：结构化编辑**

通用聊天模型往往难以处理 ProseMirror JSON 的严格嵌套或 Schema 的具体 HTML 约束。

* **Qwen 2.5 (Coder 变体)**：研究表明，Qwen 2.5 目前是开源代码生成任务的 SOTA（State of the Art）3。  
  * *结构化输出可靠性*：由于 ProseMirror JSON 本质上是递归数据结构，Qwen 2.5 Coder（即使是 7B 或 1.5B 版本）在涉及嵌套对象的测试中，比 Llama 3.1 8B 更好地遵循 Schema 8。  
  * *指令遵循*：它在“修改”任务（例如，“重构此函数”类似于“重构此段落”）上表现出色，使其非常适合编辑用例。  
  * *多语言支持*：Qwen 系列在中文处理能力上显著优于 Llama 或 Mistral 系列，这对于中文语境下的“本地化”至关重要 24。

### **7.2 针对编辑器体验的 Ollama 优化**

为了让本地 AI 感觉像原生工具，必须最小化延迟。

* **Keep-Alive 设置**：配置 Ollama 使用较长的 keep\_alive 时长（例如 \-1 或 60m），使模型常驻 VRAM。每次编辑命令如果都需要重新加载模型，会引入 2-5 秒的延迟，这将打断用户的心流。  
* **上下文窗口管理**：与聊天不同，编辑任务通常只需要较小的上下文窗口（仅周围的段落）。将 Ollama 的上下文窗口 (num\_ctx) 限制在 4096 或 8192（而不是 128k），可以显著提高消费者级硬件上的生成速度。  
* **语法约束 (GBNF)**：Ollama 支持 GBNF（Grammar-Based Normalization Form）语法。我们可以将 Zod Schema 导出为 GBNF 语法文件并传递给 Ollama。这保证了生成的 *每一个* Token 都在 Schema 允许的范围内，从根本上消除了语法错误的可能性 19。

**性能对比表：不同硬件下的模型推荐**

| 硬件环境 | 推荐模型 | 适用场景 | 预期 TTFT (首字延迟) |
| :---- | :---- | :---- | :---- |
| **高端 (Mac Studio, RTX 4090\)** | Qwen 2.5-Coder 32B | 复杂重构、语气调整、长文生成 | \< 200ms |
| **中端 (M2 Pro, RTX 3060\)** | Qwen 2.5-Coder 7B | 标准编辑、润色、纠错 | 300-500ms |
| **低端 (普通笔记本 CPU)** | Qwen 2.5-Coder 1.5B | 拼写检查、简单扩写、自动补全 | \< 800ms |

## ---

**8\. 高级模式：Agentic Editing 与 RAG**

超越简单的文本替换，我们可以实现“代理式编辑”（Agentic Editing）。这是本地实现可以真正超越标准 Tiptap AI Toolkit 的地方。

### **8.1 Schema 验证作为工具 (Tool)**

与其仅仅希望 LLM 生成有效的 HTML，我们可以给 LangChain Agent 配备一个 ValidateHTML 工具。

1. **生成**：LLM 生成草稿。  
2. **验证**：Agent 调用 validate\_html(draft)。  
3. 自我纠正：如果验证器（使用 Tiptap 的 Schema 规则）返回错误（例如，“在标题节点中检测到非法表格”），Agent 会自我纠正并重新生成响应。  
   这种循环确保了对复杂文档结构的 100% 顺应性，这是简单的提示词工程往往无法保证的 14。

### **8.2 本地 RAG 实现“风格感知”**

标准 Toolkit 允许“语气调整”。通过本地 LangChain 设置，我们可以实现 **基于 RAG 的风格模仿**。

* **机制**：将用户过去的文档嵌入到本地向量数据库（如 ChromaDB 或 Faiss）中。  
* **检索**：当用户要求“写一段话”时，系统检索用户 *自己* 以前写作的 3-4 个示例。  
* 生成：提示词变为：“写一段关于 X 的话，模仿以下示例的风格：\[...\]”。  
  这创建了一个能够学习用户声音的超个性化编辑器，这是通用 Tiptap AI Toolkit 所不具备的功能 26。

## ---

**9\. 结论与战略路线图**

复现 Tiptap AI Toolkit 不仅仅是一次软件模仿的练习，它是通向 **AI 主权** 的战略举措。通过解耦编辑体验与不透明的云端 API，开发者获得了对以下方面的控制：

1. **数据隐私**：零数据出境。敏感的法律或医疗文档可以在 AI 辅助下编辑，而无需离开设备。  
2. **成本控制**：消除了按 Token 付费的 API 费用。  
3. **深度定制**：能够注入自定义 Schema、RAG 管道和专门的本地模型（如 Qwen 2.5 Coder），创造出远超 SaaS 替代品“拼写检查”按钮的强大编辑体验。

**实施建议**：从 **策略 A（HTML 流式传输）** 开始，使用 **Qwen 2.5 7B** 通过 **Ollama** 运行，并由简单的 **LangChain.js** 后端编排。这能以最小的复杂性提供 80% 的价值。一旦建立，再分层引入 **Schema 验证工具** 和 **JSON 结构化输出**，以实现企业级应用所需的健壮性。“黑盒”已不再必要；构建更强引擎的组件是开放且触手可及的。

### **10\. 综合参考架构表**

为了协助立即实施该策略，下表将 Tiptap AI Toolkit 的基元映射到了其开源等价物。

| Tiptap AI 基元 | 开源替代方案 (LangChain \+ Local) | 实现备注 |
| :---- | :---- | :---- |
| aiShorten, aiExtend | LangChain RunnableSequence | 提示词："将此文本重写得更短/更长..." |
| aiFixSpelling | Qwen 2.5 Correction Chain | 使用低温 (0.1) 以防止幻觉。 |
| Schema Awareness | Zod Schema \+ 提示词注入 | 将 allowed\_tags 列表注入系统消息。 |
| 流式响应 (Streaming) | HttpResponseOutputParser | 将 Chunks 直接流式传输至 editor.commands.insertContent。 |
| 上下文编辑 | 滑动窗口上下文 (Sliding Window) | 将前一段/后一段作为 "Context" 角色发送。 |
| 云后端 (Cloud Backend) | Next.js API / Express | 充当 LangChain 宿主。 |
| LLM 提供商 | Ollama (Local) | 在客户端或本地服务器运行 ollama serve。 |

该架构验证了 Tiptap AI Toolkit 的“魔法”是完全可复现的工程实践，任何愿意集成现代开源 AI 技术栈的团队均可掌握。

#### **Works cited**

1. Schema awareness \- Content AI \- Tiptap, accessed January 4, 2026, [https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/primitives/schema-awareness](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/primitives/schema-awareness)  
2. AI Toolkit overview | Tiptap Content AI, accessed January 4, 2026, [https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/overview](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/overview)  
3. Qwen AI Review 2025: Best Qwen Model for Coding & Qwen Coder Benchmarks \- Index.dev, accessed January 4, 2026, [https://www.index.dev/blog/qwen-ai-coding-review](https://www.index.dev/blog/qwen-ai-coding-review)  
4. ueberdosis/tiptap: The headless rich text editor framework for web artisans. \- GitHub, accessed January 4, 2026, [https://github.com/ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)  
5. ProseMirror, accessed January 4, 2026, [https://prosemirror.net/](https://prosemirror.net/)  
6. BlockNote vs. Tiptap: Simplicity Meets Full Control, accessed January 4, 2026, [https://tiptap.dev/alternatives/blocknote-vs-tiptap](https://tiptap.dev/alternatives/blocknote-vs-tiptap)  
7. Build AI features with document editing \- Tiptap, accessed January 4, 2026, [https://tiptap.dev/docs/editor/extensions/functionality/ai-toolkit](https://tiptap.dev/docs/editor/extensions/functionality/ai-toolkit)  
8. Qwen2.5: A Party of Foundation Models\! | Qwen, accessed January 4, 2026, [https://qwenlm.github.io/blog/qwen2.5/](https://qwenlm.github.io/blog/qwen2.5/)  
9. AI Generation editor commands | Tiptap Content AI, accessed January 4, 2026, [https://tiptap.dev/docs/content-ai/capabilities/generation/text-generation/built-in-commands](https://tiptap.dev/docs/content-ai/capabilities/generation/text-generation/built-in-commands)  
10. Configure Server AI Toolkit | Tiptap Content AI, accessed January 4, 2026, [https://tiptap.dev/docs/content-ai/capabilities/server-ai-toolkit/configure](https://tiptap.dev/docs/content-ai/capabilities/server-ai-toolkit/configure)  
11. Structured output \- Docs by LangChain, accessed January 4, 2026, [https://docs.langchain.com/oss/python/langchain/structured-output](https://docs.langchain.com/oss/python/langchain/structured-output)  
12. setContent command | Tiptap Editor Docs, accessed January 4, 2026, [https://tiptap.dev/docs/editor/api/commands/content/set-content](https://tiptap.dev/docs/editor/api/commands/content/set-content)  
13. Confused between AI SDK and LangChain \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/LangChain/comments/1fie8ul/confused\_between\_ai\_sdk\_and\_langchain/](https://www.reddit.com/r/LangChain/comments/1fie8ul/confused_between_ai_sdk_and_langchain/)  
14. Structured output \- Docs by LangChain, accessed January 4, 2026, [https://docs.langchain.com/oss/javascript/langchain/structured-output](https://docs.langchain.com/oss/javascript/langchain/structured-output)  
15. ChatOllama \- Docs by LangChain, accessed January 4, 2026, [https://docs.langchain.com/oss/javascript/integrations/chat/ollama](https://docs.langchain.com/oss/javascript/integrations/chat/ollama)  
16. Function Calling \- Qwen, accessed January 4, 2026, [https://qwen.readthedocs.io/en/v2.0/framework/function\_call.html](https://qwen.readthedocs.io/en/v2.0/framework/function_call.html)  
17. Qwen2.5-Coder Technical Report \- arXiv, accessed January 4, 2026, [https://arxiv.org/pdf/2409.12186](https://arxiv.org/pdf/2409.12186)  
18. AI SDK Core: Generating Structured Data, accessed January 4, 2026, [https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)  
19. Structured Output Comparison across popular LLM providers — OpenAI, Gemini, Anthropic, Mistral and AWS Bedrock | by Rost Glukhov | Medium, accessed January 4, 2026, [https://medium.com/@rosgluk/structured-output-comparison-across-popular-llm-providers-openai-gemini-anthropic-mistral-and-1a5d42fa612a](https://medium.com/@rosgluk/structured-output-comparison-across-popular-llm-providers-openai-gemini-anthropic-mistral-and-1a5d42fa612a)  
20. StructEval: Benchmarking LLMs' Capabilities to Generate Structural Outputs \- arXiv, accessed January 4, 2026, [https://arxiv.org/html/2505.20139v1](https://arxiv.org/html/2505.20139v1)  
21. Novel.sh vs. Tiptap: From MVP to Enterprise, accessed January 4, 2026, [https://tiptap.dev/alternatives/novel-vs-tiptap](https://tiptap.dev/alternatives/novel-vs-tiptap)  
22. AI SDK \- Vercel, accessed January 4, 2026, [https://vercel.com/docs/ai-sdk](https://vercel.com/docs/ai-sdk)  
23. arXiv:2412.15115v2 \[cs.CL\] 3 Jan 2025, accessed January 4, 2026, [https://arxiv.org/pdf/2412.15115](https://arxiv.org/pdf/2412.15115)  
24. Qwen/Qwen2.5-1.5B-Instruct \- Hugging Face, accessed January 4, 2026, [https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)  
25. AI SDK 6 \- Vercel, accessed January 4, 2026, [https://vercel.com/blog/ai-sdk-6](https://vercel.com/blog/ai-sdk-6)  
26. AI Framework Comparison: AI SDK, Genkit and Langchain \- Konstantin Komelin, accessed January 4, 2026, [https://komelin.com/blog/ai-framework-comparison](https://komelin.com/blog/ai-framework-comparison)  
27. Langchain JS vs AI SDK \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/LangChain/comments/1is9s0h/langchain\_js\_vs\_ai\_sdk/](https://www.reddit.com/r/LangChain/comments/1is9s0h/langchain_js_vs_ai_sdk/)