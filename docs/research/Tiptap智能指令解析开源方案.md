# **意图架构：富文本编辑器中自然语言指令解析的开源范式**

## **1\. 引言：数字创作的范式转移**

数字文本编辑的演变历程，是一个抽象程度不断提升的过程：从早期命令行编辑器的刚性代码输入，发展到“所见即所得”（WYSIWYG）界面的视觉直观性。几十年来，交互模型基本保持静态：用户作为唯一的操控者，通过显式的、确定性的输入（点击按钮加粗文本、拖动手柄调整图像大小、敲击键盘输入字符）来手动操作文档状态。这种范式虽然有效，但将结构和样式的执行负担完全压在了人类用户身上。

大语言模型（LLM）和生成式 AI 的出现促成了这种交互模型的根本性转变——从显式的手动格式化转向\*\*“意图驱动编辑”（Intent-Based Editing）\*\*。在这种新范式中，用户通过自然语言表达高层意图（例如“让语气更专业点”、“把这段话转成详细的表格”或“将关键点总结为检查清单”），而系统则自主将这种概率性的意图转化为编辑器内具体的、确定性的状态变更。这一转变代表了人机交互的一次巨大飞跃，将文本编辑器从被动的画布转变为能够理解语义细微差别和结构复杂性的主动协作者 1。

Tiptap 作为基于强大的 ProseMirror 库构建的领先无头（Headless）编辑器框架，一直处于这场革命的前沿。通过 **Tiptap AI** 和 **AI Toolkit**，Tiptap 定义了 AI 增强编辑的用户体验标准，提供了诸如上下文感知自动补全、智能指令解析和复杂内容生成等功能 3。这些专有扩展有效地弥合了自然语言的混乱、非结构化特性与文档模型刚性、模式强制结构之间的鸿沟。然而，这些专有解决方案的便利性伴随着巨大的权衡。对 Tiptap 云基础设施的依赖引入了数据隐私问题，特别是在医疗、金融和国防等对数据主权有严格要求的受监管行业。此外，基于“云文档”数量和 API 调用次数的定价模型，对于高流量应用或自托管平台而言可能极其昂贵 5。

本报告旨在对**构建 Tiptap AI 指令解析能力的开源、自托管替代方案**进行详尽的技术分析和架构指导。它探讨了现代开源技术的融合——特别是 **Vercel AI SDK**、用于本地推理的 **Ollama** 以及 **ProseMirror** 的事务系统——以构建一个稳健、隐私保护且具有成本效益的 AI 编辑技术栈。本文的核心论点是：编辑器语境下的“指令解析”不仅仅是一个文本生成任务，而是一个\*\*结构化输出（Structured Output）**和**工具调用（Tool Calling）\*\*的挑战，需要严格的模式定义和状态管理。

## ---

**2\. 解构 Tiptap 和 ProseMirror 生态系统**

要设计出 Tiptap AI 的可行替代方案，首先必须对它所操控的底层系统有深入、细致的理解。Tiptap 不是一个独立的编辑器，而是 **ProseMirror** 的一个高级封装，ProseMirror 是一个用于在 Web 上构建富文本编辑器的工具包。AI 集成的威力——以及难度——在于 ProseMirror 对文档 Schema（模式）的严格遵守。

### **2.1 文档模型：JSON vs HTML**

与简单的文本区域（Textarea）或基本的 HTML 编辑器不同，ProseMirror 不会将文档视为扁平的字符流或松散的 DOM 元素集合。相反，它维护着自己内部的文档模型，即一棵 **节点（Nodes）** 树。该模型通常序列化为 JSON 以便存储和传输，这种格式对于任何 AI 集成策略都至关重要 7。

区分视觉表现（HTML）和内部模型（JSON）至关重要。当 AI “编辑”文档时，它实际上是在操纵这个 JSON 结构。

* **节点 (Nodes)：** 结构的构建块，如 doc（文档）、paragraph（段落）、heading（标题）、blockquote（引用）和 bulletList（无序列表）。每个节点可以包含其他节点（其“内容”），并具有特定的属性（attrs），例如标题的级别或段落的对齐方式 9。  
* **标记 (Marks)：** 应用于文本节点的内联格式，如 bold（加粗）、italic（斜体）、link（链接）或 highlight（高亮）。与节点不同，标记不会改变树的结构，而是装饰文本叶子节点。

**标准的 Tiptap JSON 结构示例：**

JSON

{  
  "type": "doc",  
  "content": \[  
    {  
      "type": "heading",  
      "attrs": { "level": 1 },  
      "content": \[{ "type": "text", "text": "项目概览" }\]  
    },  
    {  
      "type": "paragraph",  
      "content":  
    }  
  \]  
}

AI 代理不能简单地向这个结构中“写入文本”。要将一个段落变为标题，它必须执行特定的转换并遵守树的规则。例如，text 节点不能是 doc 节点的直接子节点；它必须被包裹在像 paragraph 这样的块级节点中。专有的 AI 扩展在内部处理这种验证；开源替代方案必须使用 Zod Schema 或类似机制来复制这种验证逻辑 11。

### **2.2 事务系统：变更的原子单位**

ProseMirror 中的状态变更是严格**确定性**的。编辑器状态是不可变的；更新是通过**事务（Transactions）应用的。一个事务将一个或多个步骤（Steps）**（如 ReplaceStep 或 AddMarkStep 等原子变更）组合成一个单元，将 状态 A 转换为 状态 B 12。

这种架构给 AI 集成带来了特定的挑战：

1. **翻译鸿沟：** LLM 输出的是概率性的、非结构化的文本或 JSON。  
2. **执行要求：** 编辑器需要精确的、确定性的事务。

如果用户要求 AI “删除第二句话”，AI 不能简单地返回一个新的文档字符串。这样做会破坏编辑器的历史堆栈（撤销/重做），中断活跃的协作会话（Y.js），并可能重置光标位置。相反，AI 必须识别第二句话的确切范围（例如 from: 54, to: 120）并发出一个 deleteRange 事务。这种对**结构感知修改**的需求，正是区分复杂的“AI 指令解析器”与简单的“文本续写器”的关键所在 1。

### **2.3 解构 Tiptap AI 的专有功能**

Tiptap 的商业 AI 产品分为三个不同的能力集，每个都解决了 AI-编辑器接口的不同方面。理解这些有助于定义开源等效方案的需求。

#### **2.3.1 AI 生成 (文本补全)**

此功能允许用户基于提示词生成文本。这是最容易复制的。其机制涉及将当前选区和周围的上下文窗口（以保持连贯性）发送到后端。Tiptap 云会截断此上下文以适应模型的窗口大小，这是开源实现也必须管理的优化关键点 15。

#### **2.3.2 AI 编辑 (转换)**

此功能获取现有文本并对其进行转换——缩短、扩展、改变语气或修复语法。这里的架构复杂性在于**上下文保留（Context Preservation）**。如果用户高亮显示包含加粗单词的段落并要求 AI “把它写长一点”，返回的文本必须智能地决定是保留该加粗格式还是丢弃它。Tiptap 的后端可能采用了复杂的 Diff 算法或特定的提示词指令来在转换过程中处理富文本标记 4。

#### **2.3.3 AI 代理 (指令解析)**

这是最高级且最有价值的功能。它允许 AI 在编辑器内执行“工具”或“命令”。AI 不返回文本，而是返回一个 JSON 有效负载，指示编辑器执行操作，例如 insertTable({ rows: 3, cols: 3 })。**Tiptap AI Toolkit** 充当桥梁，将编辑器的命令 API 暴露给 LLM。它是“Schema 感知”的，这意味着它只暴露与当前编辑器实例中安装的扩展相关的工具 17。

### **2.4 开源的经济必要性**

Tiptap AI 的定价模型是开发开源替代方案的重要驱动力。“Start”计划起价为每月 49 美元，最多支持 500 个云文档，而“Business”计划则飙升至每月 999 美元 5。对于拥有数千名用户的 SaaS 平台，每个用户可能创建数百个文档，这些限制是极具约束力的。此外，“云文档”的定义意味着要使用 AI 功能，文档状态必须与 Tiptap 的服务器同步。这造成了供应商锁定，将编辑体验与开发者的自有后端解耦，引入了许多企业用例无法接受的延迟和隐私风险 20。

## ---

**3\. 开源技术栈：技术的融合**

Tiptap AI 开源替代方案的可行性取决于三项关键技术的成熟度：用于编排的 **Vercel AI SDK**、用于本地/私有推理的 **Ollama** 以及用于模式验证的 **Zod**。它们共同构成了一个强大的技术栈，能够复制甚至在某些情况下超越专有解决方案的能力。

### **3.1 编排器：Vercel AI SDK**

**Vercel AI SDK** 已成为 React/Next.js 生态系统中构建 AI 驱动用户界面的事实标准。它通过一套高度优化的库解决了“胶水问题”——即连接前端编辑器与后端 LLM 11。

#### **3.1.1 核心能力**

* **流式协议 (Stream Protocol)：** 该 SDK 定义了一个稳健的协议，用于从服务器向客户端流式传输文本和工具调用。这对于实现 AI 生成内容逐字出现的“幽灵文本”效果至关重要。  
* **工具调用 (generateText with tools)：** 此函数是指令解析的基石。它允许开发者使用 **Zod** 模式定义一组工具（函数）。SDK 处理所需的提示工程（Prompt Engineering），向 LLM 描述这些工具，并将 LLM 的输出解析回结构化的 JSON 11。  
* **提供商抽象 (Provider Abstraction)：** SDK 抽象了不同模型提供商之间的差异。无论后端使用的是 OpenAI、Anthropic 还是本地 Ollama 实例，客户端代码基本保持不变。这允许“热交换”模型——例如，使用快速、廉价的模型（如 Llama 3 8B）处理简单的格式化命令，而使用更大的模型（如 GPT-4o）处理复杂的内容生成 22。

### **3.2 推理引擎：Ollama 与本地 LLM**

**Ollama** 代表了大语言模型可访问性的突破。它将 LLM 复杂的运行时要求（量化、内存管理、GPU 卸载）打包成一个类似 Docker 的简单命令行工具。对于编辑器替代方案，Ollama 实现了**本地推理（Local Inference）**，这解决了 Tiptap AI 的两个最大缺点：成本和隐私 23。

#### **3.2.1 “小”语言模型 (SLM) 的崛起**

**Llama 3.1 (8B)**、**Mistral (7B)** 和 **Gemma 2 (9B)** 等模型的发布改变了格局。这些模型足够小，可以在消费级硬件（如 MacBook Pro 或标准游戏 PC）上以低延迟运行，同时拥有足够的推理能力来理解复杂指令并准确执行工具调用。

* **延迟：** 本地推理消除了网络往返。在配备像样 GPU 的机器上，Token 生成速度甚至可以超过云端 API。  
* **工具支持：** 这些模型的最新迭代专门针对工具使用进行了微调，使它们能够可靠地输出编辑器命令所需的 JSON 结构，而不会出现早期几代模型中常见的幻觉 25。

### **3.3 验证器：Zod 与模式优先设计**

在 AI 指令解析的背景下，**Zod** 不仅仅是一个验证库；它是 AI 接口的定义语言。通过为编辑器命令定义 Zod Schema（例如 z.object({ rows: z.number().min(1) })），我们创建了一个契约。Vercel AI SDK 将此 Zod Schema 转换为 JSON Schema 并提供给 LLM。这确保了 LLM 确切地知道哪些参数是有效的，防止它生成会导致编辑器崩溃的命令 11。

## ---

**4\. 指令解析的架构模式**

构建开源 AI 编辑器需要为将自然语言（NL）转化为编辑器命令选择正确的架构模式。我们确定了三种不同的模式，每种都适用于不同类型的交互。

### **4.1 模式 A：工具注册表 (函数调用)**

这是实现操纵编辑器结构的“斜杠命令”或“AI 代理”的最稳健模式。它利用了现代 LLM 的原生函数调用能力。

#### **4.1.1 概念**

我们创建一个工具的**注册表（Registry）**，与 Tiptap/ProseMirror 的命令一一对应。当用户输入请求时，LLM 从注册表中选择合适的工具并填充其参数。然后客户端执行相应的 Tiptap 命令。

#### **4.1.2 注册表定义 (服务端)**

使用 Vercel AI SDK，我们在 API 路由中定义工具。此定义充当 LLM 的“API 文档”。

TypeScript

// app/api/chat/route.ts  
import { z } from 'zod';  
import { streamText, tool } from 'ai';  
import { ollama } from 'ollama-ai-provider';

export async function POST(req: Request) {  
  const { messages } \= await req.json();

  const result \= await streamText({  
    model: ollama('llama3.1'),  
    messages,  
    tools: {  
      // 工具 1：格式化  
      applyFormat: tool({  
        description: '应用内联格式，如加粗、斜体或删除线。',  
        parameters: z.object({  
          format: z.enum(\['bold', 'italic', 'strike', 'code'\]),  
        }),  
      }),  
        
      // 工具 2：块结构  
      changeBlockType: tool({  
        description: '更改当前块的类型（段落、标题、列表）。',  
        parameters: z.object({  
          type: z.enum(\['paragraph', 'h1', 'h2', 'h3', 'bulletList', 'orderedList', 'blockquote'\]),  
        }),  
      }),  
        
      // 工具 3：复杂插入  
      insertTable: tool({  
        description: '插入具有特定尺寸的数据表格。',  
        parameters: z.object({  
          rows: z.number().describe('行数'),  
          cols: z.number().describe('列数'),  
          withHeader: z.boolean().default(true),  
        }),  
      }),  
    },  
  });

  return result.toDataStreamResponse();  
}

#### **4.1.3 客户端执行器**

客户端接收工具调用并派发实际的 Tiptap 命令。这种关注点分离至关重要：服务端/LLM 决定*做*什么，但客户端决定*如何*做，确保执行发生在浏览器编辑器实例的安全上下文中。

TypeScript

// hooks/useAICommand.ts  
import { useChat } from 'ai/react';  
import { Editor } from '@tiptap/react';

export const useAICommand \= (editor: Editor) \=\> {  
  const { append } \= useChat({  
    api: '/api/chat',  
    onToolCall: async ({ toolCall }) \=\> {  
      const { name, args } \= toolCall;  
        
      switch (name) {  
        case 'applyFormat':  
          editor.chain().focus().toggleMark(args.format).run();  
          break;  
        case 'changeBlockType':  
          if (args.type \=== 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();  
          else if (args.type \=== 'bulletList') editor.chain().focus().toggleBulletList().run();  
          //... 处理其他类型  
          break;  
        case 'insertTable':  
          editor.chain().focus()  
          .insertTable({ rows: args.rows, cols: args.cols, withHeaderRow: args.withHeader })  
          .run();  
          break;  
      }  
    }  
  });  
  return { sendCommand: (text: string) \=\> append({ role: 'user', content: text }) };  
};

**优势：**

* **确定性：** LLM 无法编造无效的命令；它被限制在 Zod Schema 定义的枚举值中。  
* **安全性：** 实际的执行代码（例如 toggleHeading）是由开发者预先编写的，而不是由 AI 生成的。  
* **带宽：** 仅传输工具名称和参数，而不是整个文档结构。

### **4.2 模式 B：生成式结构化输出 (JSON 模式)**

对于涉及生成新内容结构的任务——例如“写一篇关于 AI 的博客文章”——工具调用可能过于细碎。生成数百个 insertText 工具调用效率低下。在这种情况下，**JSON 模式**是更优的模式 10。

#### **4.2.1 概念**

我们指示 LLM 输出一个严格遵守 Tiptap 文档 Schema 的 JSON 对象。这允许 AI 一次性生成复杂的嵌套结构（例如，包含引用的列表，引用中又包含加粗的链接）。

#### **4.2.2 递归模式定义**

定义完整 ProseMirror 文档的 Zod Schema 很复杂，因为它具有递归性质（块节点可以包含其他块节点）。

TypeScript

// schemas/tiptap-json.ts  
import { z } from 'zod';

const MarkSchema \= z.object({  
  type: z.string(),  
  attrs: z.record(z.any()).optional(),  
});

const TextNodeSchema \= z.object({  
  type: z.literal('text'),  
  text: z.string(),  
  marks: z.array(MarkSchema).optional(),  
});

// 块节点的递归定义  
const ContentNodeSchema \= z.lazy(() \=\> z.union());

const ParagraphSchema \= z.object({  
  type: z.literal('paragraph'),  
  content: z.array(z.union()).optional(), // 简化的递归  
});

export const DocSchema \= z.object({  
  type: z.literal('doc'),  
  content: z.array(ContentNodeSchema),  
});

使用 Vercel AI SDK 的 generateObject 函数，我们可以强制执行此 Schema。结果是一个有效的 JSON 对象，可以直接传递给 editor.commands.setContent(json)。

**挑战：**

* **上下文窗口：** 生成完整的 JSON 树比生成 Markdown 或纯文本消耗的 Token 要多得多。  
* **幻觉：** 即使有 JSON 模式，模型有时也可能输出特定 Tiptap 配置中不存在的属性（例如，当只启用了左/右对齐时输出了 textAlign: 'justify'）。

### **4.3 模式 C：语义转换 ("AI 编辑" 流水线)**

此模式解决了“编辑”用例：重写现有文本，同时保留其含义和结构。

#### **4.3.1 “Diff” 问题**

如果我们向 AI 发送 HTML 并要求它“修复语法”，它可能会返回新的 HTML。如果我们简单地用新 HTML 替换旧 HTML，编辑器会将其视为删除旧内容并插入新内容。

* **后果：** 附在文本上的所有评论都会丢失。所有修订历史记录都会被擦除。协作光标会被重置。

#### **4.3.2 解决方案：智能 Diff**

为了解决这个问题，我们使用像 prosemirror-changeset 这样的 Diff 库 14。

1. **生成：** LLM 生成新版本的*内容*（文本）。  
2. **比较：** 客户端将新文本与旧文本进行比较。  
3. **事务构建：** 系统计算将 文本 A 转换为 文本 B 所需的最小步骤集（插入和删除）。  
4. **派发：** 这些步骤作为事务应用。这保留了未更改节点的身份，维护了评论和历史记录。

## ---

**5\. 工程化 "OpenTiptap" 实现细节**

本节深入探讨构建生产就绪系统所需的具体实现细节。

### **5.1 上下文管理与 RAG**

朴素 AI 编辑器的一个关键失效模式是缺乏上下文。如果用户问“总结引言”，但 LLM 只接收到当前段落，它就无法工作。

#### **5.1.1 窗口策略**

我们必须围绕用户的选区构建一个“上下文窗口”。

* **选区：** 主要焦点。  
* **周围文本：** 我们抓取选区前 N 个 Token 和后 N 个 Token 以提供局部上下文。  
* **代码实现：**  
  TypeScript  
  const getContext \= (editor: Editor) \=\> {  
    const { from, to } \= editor.state.selection;  
    const docSize \= editor.state.doc.content.size;  
    const start \= Math.max(0, from \- 2000); // 向前 2000 字符  
    const end \= Math.min(docSize, to \+ 2000); // 向后 2000 字符  
    return editor.state.doc.textBetween(start, end, '\\n');  
  };

#### **5.1.2 针对大文档的向量搜索 (RAG)**

对于需要全局上下文的查询（例如“检查与结论的一致性”），简单的窗口是不够的。我们必须实现一个轻量级的 RAG（检索增强生成）系统。

* **客户端 RAG：** 对于 100 页以内的文档，我们可以使用像 **Voy**（基于 WASM）这样的客户端向量搜索库。  
* **机制：**  
  1. 文档加载时，按段落对文本进行分块。  
  2. 使用小型本地模型（例如通过 Transformers.js 运行的 generic-feature-extraction）生成嵌入（Embeddings）。  
  3. 进行查询时，在向量存储中搜索相关块，并将它们附加到系统提示词中。

### **5.2 乐观 UI 与流式反馈**

延迟是编辑的大敌。等待 3 秒钟来执行一个命令会打断心流。

#### **5.2.1 乐观工具执行**

对于确定性工具（如格式化），我们可以预测结果。

1. **用户触发：** 用户输入“变粗体”。  
2. **立即行动：** UI 立即乐观地应用粗体标记。  
3. **验证：** 请求发送到 LLM。  
4. **协调：** 如果 LLM 返回 toggleMark('bold')，我们什么也不做（动作已采取）。如果它返回其他内容（例如 toggleHeading），我们撤销粗体并应用标题。

#### **5.2.2 幽灵文本流**

对于文本生成，我们必须显示进度。

* **技术：** 在光标位置插入一个 **Decoration**（装饰部件）。  
* **流式传输：** 随着 Vercel AI SDK useChat 钩子接收到数据块，更新部件的内容。  
* **定稿：** 流完成后，将部件替换为真实的文本节点。这可以防止编辑器 Schema 在生成过程中验证部分（且可能无效的）文本。

### **5.3 处理本地推理的挑战**

在本地使用 **Ollama** 会引入特定的限制。

* **量化：** Llama 3 8B 的 q4\_k\_m（4位量化）版本是内存与性能的最佳平衡点。它在大约 6GB VRAM 上运行。  
* **保活 (Keep-Alive)：** LLM 将权重加载到 VRAM 需要“冷启动”时间。配置 Ollama 使用较长的 keep\_alive 窗口（例如 \-1 或 60m），以确保模型在命令之间保持加载状态 23。  
* **中间件：** 由于标准 Ollama 端点在处理工具调用时可能与 OpenAI 略有不同（特别是对于旧模型），使用 ai-sdk-tool-call-middleware 26 有助于规范化输出，将 XML 或自定义标记解析为 Vercel SDK 期望的 JSON 格式。

## ---

**6\. 比较分析与案例研究**

### **6.1 案例研究：Novel.sh**

**Novel.sh** 是 AI 增强 Tiptap 编辑器的首选开源示例。

* **架构：** 它使用 Vercel AI SDK 的 useCompletion 钩子来实现自动补全功能。  
* **局限性：** 它主要侧重于文本生成。其“斜杠菜单”很大程度上是硬编码的，或者依赖于简单的文本替换。它没有实现本报告中描述的完整“工具注册表”模式，这意味着它无法通过 AI 处理复杂的结构性命令（如“将此段落移至末尾”）30。  
* **经验：** Novel.sh 证明了该技术栈（Next.js \+ Tiptap \+ Vercel AI SDK）的可行性，但它代表了 AI 编辑的“第一代”（补全），而“第二代”（指令解析/代理）需要工具调用架构。

### **6.2 对比表：Tiptap AI vs. 开源技术栈**

| 功能维度 | Tiptap AI (专有) | 开源技术栈 (Vercel SDK \+ Ollama) |
| :---- | :---- | :---- |
| **解析引擎** | 微调的 GPT-4o / 专有代理 | Llama 3.1 / Mistral 通过工具调用 |
| **命令感知** | 自动 (扫描活跃扩展) | 手动 (需要 Zod Schema 注册表) |
| **数据隐私** | 云端绑定 (数据离开本地) | 物理隔离 / 支持本地优先 |
| **延迟** | 网络往返 (\~300ms \+ 生成时间) | 零网络延迟 (本地 GPU) 或可变 |
| **成本模型** | 基于用量 (每个文档/调用收费) | 固定基础设施 (GPU/VPS 成本) |
| **实施工作量** | 即插即用 (分钟级) | 架构工程 (数天/数周) |
| **可定制性** | 仅限提示词 | 无限 (模型权重、工具、逻辑) |

## ---

**7\. 未来趋势与结论**

AI 编辑的发展轨迹正不可避免地向**客户端推理**移动。像 **WebLLM** 这样的项目允许 Llama 3 8B 等模型利用 WebGPU 完全在浏览器内运行，甚至消除了对 Ollama 等本地服务器的需求。这将使“零延迟、零成本”的编辑器成为可能，其中 AI 与 Tiptap 并存于网页中。

此外，\*\*CRDT（无冲突复制数据类型）\*\*与 AI 的集成是下一个前沿领域。随着 AI 代理成为文档中的活跃协作者，管理人类编辑和 AI 编辑之间的冲突将需要复杂的合并逻辑，这正是 **Y.js** 和 ProseMirror 的强项。

### **7.1 给架构师的最终建议**

1. **采用工具注册表模式：** 这是构建可靠指令解析器的唯一可扩展方式。不要依赖非结构化的文本提示。  
2. **投资 Schema 定义：** 你的 Zod Schema 就是你的 API。使它们健壮、全面且文档齐全。  
3. **利用本地 LLM：** 运行 Ollama 或类似推理引擎的隐私和成本效益太显著了，不容忽视，尤其是随着“小语言模型”在推理能力上的持续进步。

通过遵循本报告中列出的架构蓝图，开发团队可以构建出一种 AI 增强的编辑体验，这种体验不仅能与 Tiptap AI 等专有解决方案相媲美，而且在灵活性、隐私和长期可行性方面超越它们。建立在 Vercel AI SDK、Ollama 和 ProseMirror 支柱之上的“OpenTiptap”架构，是下一代智能创作工具的基础。

#### **Works cited**

1. ProseMirror, accessed January 4, 2026, [https://prosemirror.net/](https://prosemirror.net/)  
2. GitHub Copilot \- Use Prompt to Automate Common things with natural language \- YouTube, accessed January 4, 2026, [https://www.youtube.com/watch?v=Ul0oP3SzV7o](https://www.youtube.com/watch?v=Ul0oP3SzV7o)  
3. Tiptap \- Dev Toolkit Editor Suite, accessed December 27, 2025, [https://tiptap.dev/](https://tiptap.dev/)  
4. AI Toolkit \- Document Tools for AI Agents \- Tiptap, accessed January 4, 2026, [https://tiptap.dev/product/ai-toolkit](https://tiptap.dev/product/ai-toolkit)  
5. Tiptap Pricing \- Choose your fit, accessed January 4, 2026, [https://tiptap.dev/pricing](https://tiptap.dev/pricing)  
6. Tiptap Pricing \- Choose your fit, accessed January 4, 2026, [https://tiptap.dev/archive/pricing-q2-25](https://tiptap.dev/archive/pricing-q2-25)  
7. ueberdosis/tiptap: The headless rich text editor framework for web artisans. \- GitHub, accessed December 26, 2025, [https://github.com/ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)  
8. TipTap: Should I use JSON or HTML for backend storage \- Stack Overflow, accessed January 4, 2026, [https://stackoverflow.com/questions/66481863/tiptap-should-i-use-json-or-html-for-backend-storage](https://stackoverflow.com/questions/66481863/tiptap-should-i-use-json-or-html-for-backend-storage)  
9. Schema | Tiptap Editor Docs, accessed January 4, 2026, [https://tiptap.dev/docs/editor/core-concepts/schema](https://tiptap.dev/docs/editor/core-concepts/schema)  
10. Schema of JSON Rich Text Editor \- Contentstack, accessed January 4, 2026, [https://www.contentstack.com/docs/developers/json-rich-text-editor/schema-of-json-rich-text-editor](https://www.contentstack.com/docs/developers/json-rich-text-editor/schema-of-json-rich-text-editor)  
11. AI SDK \- Vercel, accessed January 4, 2026, [https://vercel.com/docs/ai-sdk](https://vercel.com/docs/ai-sdk)  
12. ProseMirror Guide, accessed December 26, 2025, [https://prosemirror.net/docs/guide/](https://prosemirror.net/docs/guide/)  
13. Reference manual \- ProseMirror, accessed January 4, 2026, [https://prosemirror.net/docs/ref/](https://prosemirror.net/docs/ref/)  
14. How to calculate the changed ranges for transactions \- discuss.ProseMirror, accessed January 4, 2026, [https://discuss.prosemirror.net/t/how-to-calculate-the-changed-ranges-for-transactions/3771](https://discuss.prosemirror.net/t/how-to-calculate-the-changed-ranges-for-transactions/3771)  
15. Tiptap's new pricing model is live – Tiptap Release Notes, accessed January 4, 2026, [https://tiptap.dev/blog/release-notes/tiptaps-new-pricing-model-is-live](https://tiptap.dev/blog/release-notes/tiptaps-new-pricing-model-is-live)  
16. Install AI Generation | Tiptap Content AI, accessed January 4, 2026, [https://tiptap.dev/docs/content-ai/capabilities/generation/install](https://tiptap.dev/docs/content-ai/capabilities/generation/install)  
17. ueberdosis/ai-agent-custom-llm-demos: Integrate the Tiptap AI Agent extension with a custom backend and AI model provider. \- GitHub, accessed January 4, 2026, [https://github.com/ueberdosis/ai-agent-custom-llm-demos](https://github.com/ueberdosis/ai-agent-custom-llm-demos)  
18. AI SDK \- AI agent tools | Tiptap Content AI, accessed January 4, 2026, [https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/tools/ai-sdk](https://tiptap.dev/docs/content-ai/capabilities/ai-toolkit/tools/ai-sdk)  
19. Tiptap AI Toolkit: Editing Interface for AI Agents, accessed January 4, 2026, [https://tiptap.dev/blog/release-notes/introducing-tiptap-ai-toolkit-beta](https://tiptap.dev/blog/release-notes/introducing-tiptap-ai-toolkit-beta)  
20. Show HN: Tiptap AI Agent – Add AI workflows to your text editor in minutes | Hacker News, accessed January 4, 2026, [https://news.ycombinator.com/item?id=44177964](https://news.ycombinator.com/item?id=44177964)  
21. AI SDK by Vercel, accessed January 4, 2026, [https://ai-sdk.dev/docs/introduction](https://ai-sdk.dev/docs/introduction)  
22. A Complete Guide To Vercel's AI SDK // The ESSENTIAL Tool For Shipping AI Apps, accessed January 4, 2026, [https://www.youtube.com/watch?v=mojZpktAiYQ](https://www.youtube.com/watch?v=mojZpktAiYQ)  
23. ai-sdk-ollama \- NPM, accessed January 4, 2026, [https://www.npmjs.com/package/ai-sdk-ollama](https://www.npmjs.com/package/ai-sdk-ollama)  
24. Vercel AI Provider for running LLMs locally using Ollama \- GitHub, accessed January 4, 2026, [https://github.com/sgomez/ollama-ai-provider](https://github.com/sgomez/ollama-ai-provider)  
25. Tool calling \- Ollama's documentation, accessed January 4, 2026, [https://docs.ollama.com/capabilities/tool-calling](https://docs.ollama.com/capabilities/tool-calling)  
26. I made a ai-sdk middleware to add tool-calling to ollama/local/any model. \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1n8gvf3/i\_made\_a\_aisdk\_middleware\_to\_add\_toolcalling\_to/](https://www.reddit.com/r/LocalLLaMA/comments/1n8gvf3/i_made_a_aisdk_middleware_to_add_toolcalling_to/)  
27. AI SDK Core: Tool Calling, accessed January 4, 2026, [https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)  
28. Export to JSON and HTML | Tiptap Editor Docs, accessed January 4, 2026, [https://tiptap.dev/docs/guides/output-json-html](https://tiptap.dev/docs/guides/output-json-html)  
29. artemnistuley/awesome-prosemirror \- GitHub, accessed January 4, 2026, [https://github.com/artemnistuley/awesome-prosemirror](https://github.com/artemnistuley/awesome-prosemirror)  
30. steven-tey/novel: Notion-style WYSIWYG editor with AI-powered autocompletion. \- GitHub, accessed January 4, 2026, [https://github.com/steven-tey/novel](https://github.com/steven-tey/novel)  
31. Novel \- Notion-style WYSIWYG editor with AI-powered autocompletions, accessed January 4, 2026, [https://novel.sh/](https://novel.sh/)  
32. Novel \- What is it? How does it work? | ListedAI, accessed January 4, 2026, [https://www.listedai.co/ai/novel](https://www.listedai.co/ai/novel)