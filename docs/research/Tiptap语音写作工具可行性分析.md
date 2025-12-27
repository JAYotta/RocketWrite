# **针对儿童作文场景的自研 Tiptap 语音智能写作工具：技术可行性、竞品分析与战略路径深度研究报告**

## **1\. 执行摘要**

在教育科技（EdTech）领域，儿童写作辅导长期面临着“构思与转录冲突”的核心难题。随着大语言模型（LLM）与语音识别（ASR）技术的突破，利用语音交互重塑儿童写作体验已成为行业关注的焦点。本报告针对“自家孩子写作文”这一特定垂直场景，深入评估了基于无头编辑器框架 Tiptap 自研语音控制写作工具的技术与商业可行性，并与市场上现有的通用及专业解决方案进行了详尽的对比分析。

分析显示，虽然 Google Docs、讯飞语音等现有方案在通用听写能力上表现成熟，但在教育场景特有的“脚手架支持”、“多模态交互”及“结构化编辑”方面存在显著缺陷。基于 Tiptap 的自研方案依托其底层 ProseMirror 的强大事务管理机制，结合 LLM 的意图识别能力，能够实现深度的定制化教育功能，理论上是解决该场景痛点的最优技术路径。然而，该方案面临极高的工程挑战，包括端到端延迟优化、中文语境下的指令歧义处理以及复杂的文档状态同步问题。

报告最终提出，单纯的“全语音控制”并非终局，一种融合触控、语音指令与 AI 助手的“混合多模态交互架构”才是超越现有工具的更优选择。该路径不仅能有效降低技术风险，更能契合儿童的认知发展规律，实现从“口述记录”到“思维引导”的教育价值跃迁。

## ---

**2\. 场景解析与教育心理学基础：重构儿童写作的认知模型**

要准确评估技术方案的可行性，首先必须深入解构“儿童写作文”这一行为背后的认知心理学机制。与成人办公场景追求效率不同，儿童写作是一个学习与能力构建的过程，工具的介入必须符合其认知发展的阶段性特征。

### **2.1 写作的认知负荷理论与“简单写作观”**

根据 Gough 和 Tunmer 提出的“阅读简单观”的衍生理论——“写作简单观”（Simple View of Writing），写作能力被定义为转录能力（Transcription）与构思能力（Ideation）的乘积，并受到工作记忆（Working Memory）与执行功能（Executive Functions）的制约1。

对于处于小学阶段的儿童，其神经发育尚未完全成熟，导致其工作记忆容量有限。在传统的纸笔写作或键盘输入模式下，儿童必须分配大量的认知资源用于底层的“转录”过程，包括汉字的字形回忆、笔画书写、拼音拼写以及键盘键位的寻找2。这种高强度的转录负荷会产生“认知竞争”，直接挤占用于高阶思维活动的资源，如情节构思、逻辑组织和词汇选择4。

现象学上的表现即为家长常观察到的“口若悬河，提笔忘字”或“写出来的东西远不如说出来的生动”。语音转文字（Speech-to-Text, STT）技术在这一场景下的核心价值，并非简单的输入替代，而是“认知卸载”（Cognitive Offloading）5。通过将转录过程自动化，STT 技术理论上能释放工作记忆，使儿童能够专注于内容的生成与组织4。然而，研究也指出，如果 STT 工具本身的识别准确率低或交互逻辑复杂，反而会引入新的外在认知负荷（Extraneous Cognitive Load），迫使儿童频繁中断思路去修正错误，从而抵消其带来的优势4。

### **2.2 儿童作为特殊用户的交互需求**

儿童并非“缩小版的成人”，其在人机交互（HCI）中表现出独特的需求模式，这对写作工具的设计提出了极高要求：

* **即时反馈与多模态激励**：儿童对视觉和听觉反馈极为敏感。相比于成人编辑器冷冰冰的光标，儿童需要更生动的交互反馈来维持注意力。例如，当语音指令被识别时，界面应提供明确的视觉确认；当完成一段描写时，系统应给予正向的激励7。  
* **容错性与非线性修正**：儿童的口语表达往往是不连续的，伴随着大量的自我修正、停顿和重复（例如：“有一只小白兔……不对，是一只灰兔子”）。通用的听写软件往往忠实记录所有语音流，导致屏幕上充斥着碎片化的无效文本。理想的教育工具需要具备语义理解能力，能够识别并执行这种“口语化的修正意图”，而非机械转录4。  
* **脚手架支持（Scaffolding）**：根据维果茨基的“最近发展区”理论，工具应充当“更有能力的伙伴”。当孩子卡文时，工具不应只是静默等待，而应通过语音提示（如“接下来发生了什么？”或“你能描述一下它的颜色吗？”）来引导思维延伸10。

因此，针对该场景的分析必须超越单纯的“语音识别准确率”，转向对“全链路写作辅助体验”的考量。这也正是通用工具难以满足需求，从而催生自研 Tiptap 方案的核心动因。

## ---

**3\. 自研 Tiptap 语音工具的技术可行性深度分析**

Tiptap 作为一个基于 ProseMirror 的无头（Headless）富文本编辑器框架，以其高度的可扩展性和对底层文档模型的完全控制力，成为自研复杂写作应用的首选方案12。本节将详细剖析基于 Tiptap 构建语音控制写作工具的技术架构、关键实现路径及潜在的工程风险。

### **3.1 核心架构设计：从语音流到文档事务**

要实现一个能够听懂“把这一段标红”或“把第一句移到最后”的智能编辑器，不能仅依赖前端的 Web Speech API，而需要构建一个包含 ASR（自动语音识别）、NLU（自然语言理解）和编辑器状态管理的复杂流水线。

**表 3.1：建议的系统架构分层**

| 分层 | 关键技术组件 | 功能描述 | 数据流向 |
| :---- | :---- | :---- | :---- |
| **感知层** | 客户端麦克风 / WebSocket | 采集高保真音频流，进行静音检测（VAD）与降噪处理 | Audio Stream $\\to$ Server |
| **识别层** | Whisper (OpenAI) / 阿里 Paraformer | 将语音流实时转录为文本，支持流式输出以降低首字延迟 | Audio $\\to$ Text |
| **意图层** | LLM (GPT-4o / Qwen) \+ Function Calling | 分析文本意图：是“内容输入”还是“编辑指令”？并提取结构化参数 | Text $\\to$ Intent JSON |
| **执行层** | Tiptap Command Bridge | 将意图 JSON 映射为 Tiptap/ProseMirror 的 Transaction | JSON $\\to$ Doc Update |
| **渲染层** | Tiptap Vue/React Component | 应用事务，更新 DOM，并提供视觉反馈（如高亮正在修改的区域） | Doc State $\\to$ UI |

#### **3.1.1 关键路径：自然语言到 ProseMirror 指令的映射**

这是整个系统的技术心脏。Tiptap/ProseMirror 的文档状态是通过一系列原子化的“步骤”（Steps）来变更的，这些步骤构成了事务（Transaction）14。

**挑战**：自然语言是模糊的，而编辑器指令是精确的。例如，用户说“删除第二段”，编辑器底层并不直接理解“第二段”这个概念，它只理解 delete(from, to) 的坐标范围。

解决方案：基于 LLM Function Calling 的语义路由  
利用大模型的 Function Calling（或 Tool Use）能力，我们可以定义一套与 Tiptap Commands 对应的 JSON Schema。当 LLM 识别到用户的语音是指令时，它不输出文本，而是输出一个符合 Schema 的函数调用对象16。  
**示例：ProseMirror 指令的 JSON Schema 定义**

JSON

{  
  "name": "edit\_document",  
  "description": "Execute editing commands on the document",  
  "parameters": {  
    "type": "object",  
    "properties": {  
      "operation": {  
        "type": "string",  
        "enum": \["insert", "delete", "format", "move", "rewrite"\],  
        "description": "The type of editing operation"  
      },  
      "target\_scope": {  
        "type": "string",  
        "enum": \["selection", "sentence", "paragraph", "document"\],  
        "description": "The scope of text to apply the change to"  
      },  
      "formatting\_type": {  
        "type": "string",  
        "enum": \["bold", "highlight", "heading"\],  
        "description": "Specific formatting style to apply"  
      },  
      "content\_payload": {  
        "type": "string",  
        "description": "Text content to insert or use for rewriting"  
      }  
    },  
    "required": \["operation", "target\_scope"\]  
  }  
}

在 Tiptap 端，我们需要编写一个“解析器（Resolver）”，将上述 JSON 转换为实际的代码执行逻辑。例如，当接收到 {operation: "delete", target\_scope: "paragraph"} 时，解析器需要：

1. 获取当前光标位置（editor.state.selection）。  
2. 通过 Resolver 向上查找最近的父级段落节点（findParentNode）。  
3. 计算该节点的 from 和 to 坐标。  
4. 执行 editor.chain().deleteRange({from, to}).run() 19。

这种机制的优势在于它能够处理模糊指令。如果孩子说“这一段写得不好，重写一下”，LLM 可以捕捉到 rewrite 意图，并结合 ai-extension 调用生成能力，实现从“指令”到“生成”的无缝切换19。

### **3.2 中文语境下的特殊技术挑战**

在 Tiptap 中实现完美的中文语音控制面临着比英文环境更复杂的挑战，主要集中在输入法事件（IME Events）与分词逻辑上。

* **组合输入（Composition）冲突**：在 Web 编辑器中，中文输入会触发 compositionstart、compositionupdate 和 compositionend 事件。如果在语音流式上屏的过程中，用户同时尝试用键盘修正，容易导致 ProseMirror 的状态与 DOM 状态不一致，进而引发编辑器崩溃或内容重复21。自研团队必须深入 ProseMirror 的 view 层，针对中文输入特性优化事务的派发逻辑（Dispatch Logic）。  
* **语义边界识别**：英文单词之间有空格，容易确定“删除上一个词”的范围。中文没有明显的词边界。当孩子说“删掉‘快乐’这个词”时，系统需要在文档中进行全文搜索或基于上下文的模糊匹配，这增加了实现的复杂度。

### **3.3 延迟与实时性瓶颈**

对于儿童用户，系统的响应速度至关重要。如果说完指令后需要等待 2-3 秒，孩子的注意力就会分散。

* **ASR 延迟**：云端 ASR 通常有 300ms-800ms 的延迟。  
* **LLM 推理延迟**：这是最大的瓶颈。GPT-4o 或同类模型解析意图并生成 JSON 可能需要 1-2 秒。  
* **网络往返 (RTT)**：数据传输耗时。

**优化策略**：为了达到可用的体验，必须采用**端云结合**的策略。

1. **本地关键词唤醒**：在前端利用轻量级模型（如 TensorFlow.js）识别高频指令（如“逗号”、“句号”、“换行”），这些指令无需经过 LLM，直接在本地映射为 Tiptap 命令，实现毫秒级响应23。  
2. **乐观更新（Optimistic UI）**：在语音识别出文本但尚未确定最终意图前，先以“幽灵文本”（Ghost Text）的形式显示在编辑器中，待后端确认后再固化为正式内容。

### **3.4 Tiptap 生态系统的赋能与限制**

Tiptap 的插件化架构（Extension-Based Architecture）是其核心优势。

* **赋能**：可以通过开发自定义 Extension 来封装语音逻辑，使其与编辑器的其他功能（如协作、历史记录）解耦。例如，可以开发一个 VoiceHighlight 插件，当孩子说话时，实时高亮正在转录的文本片段12。  
* **限制**：Tiptap 目前的 AI 扩展主要侧重于“文本生成”（如续写、润色），而非“编辑器控制”10。这意味着如果要实现“语音控制字体变大”这样的功能，大部分逻辑需要从零开发，无法直接复用官方 AI 插件。

## ---

**4\. 现有替代方案全景对比：通用与专用的博弈**

在投入大量资源自研之前，必须通过对比分析，确认现有市场方案是否已能满足大部分需求。我们将从通用听写、专用语音输入和专业辅助三个维度进行评估。

### **4.1 通用生产力工具：Google Docs 与 Microsoft Word**

Google Docs Voice Typing 和 Office Dictation 是目前最普及的方案。

* **能力分析**：它们利用了各家科技巨头深厚的 ASR 积累，基础识别率极高。  
* **针对儿童场景的缺陷**：  
  * **指令僵化**：Google Docs 的编辑指令需要用户记忆特定的“魔法咒语”（如 "Select paragraph", "Delete last word"）25。这对儿童来说认知负担过重。孩子在构思故事时，很难分心去想“这里是该说‘逗号’还是‘Paragraph break’”。  
  * **上下文缺失**：这些工具本质上是“输入法”的延伸，它们只关注光标位置的文本插入，缺乏对文档整体结构的理解。无法执行“把第一段总结一下放到最后”这样的复杂语义指令。  
  * **缺乏教育反馈**：界面设计为成人办公服务，缺乏儿童需要的视觉激励和引导机制。

### **4.2 中文语音霸主：讯飞（iFlytek）生态**

讯飞是中文语音识别领域的绝对标杆，其产品形态覆盖纯软件（输入法、语记）和硬件（AI Note, 录音笔）。

* **能力分析**：中文识别率业界领先（\>98%），尤其擅长处理方言、口音以及中英文混合输入27。其 PC 端输入法具备一定的“口语规整”能力，能自动过滤“那个、然后”等废话。  
* **针对儿童场景的缺陷**：  
  * **封闭性（Walled Garden）**：讯飞的技术优势主要封闭在其自有 App 或硬件中。如果使用讯飞输入法配合 Word，它依然只是一个模拟键盘输入的工具，无法获取 Word 的文档上下文（DOM 结构）。这意味着它无法实现智能的格式调整或结构化编辑。  
  * **硬件依赖**：最佳的体验往往绑定在昂贵的专用硬件（如讯飞智能本 AI Note）上，这增加了家长的试错成本29。  
  * **教育深度不足**：虽然讯飞有教育类产品，但其通用语音工具并未针对“作文辅导”进行深度优化，更多是作为高效录入工具存在，缺乏“构思引导”功能。

### **4.3 专业辅助工具：Nuance Dragon**

Nuance Dragon 曾是语音控制领域的黄金标准。

* **能力分析**：具备极其强大的命令控制能力，可以通过语音操作几乎所有菜单、点击按钮、运行脚本31。  
* **针对儿童场景的缺陷**：  
  * **定位偏差**：主要服务于法律、医疗专业人士或肢体障碍者，价格昂贵且系统庞大。  
  * **学习曲线**：需要大量的训练和配置，对于“拿来即用”的儿童教育场景完全不适用。  
  * **技术架构老旧**：主要基于本地安装的软件，缺乏现代云端 LLM 的语义泛化能力。

**表 4.1：自研 Tiptap 方案与主流替代方案的多维度量化对比**

| 评估维度 | 自研 Tiptap \+ LLM 方案 | 讯飞输入法 \+ 通用编辑器 | Google Docs Voice Typing | Nuance Dragon |
| :---- | :---- | :---- | :---- | :---- |
| **中文识别准确率** | 依赖接入源 (可接讯飞/阿里 API) | **极高 (原生优势)** | 中等 | 中等 |
| **语义理解与指令泛化** | **极高** (基于 LLM，听懂模糊意图) | 低 (仅限文本转录) | 低 (需背诵特定指令) | 中 (基于规则脚本) |
| **上下文感知能力** | **强** (完全访问文档模型 JSON) | 无 (仅模拟键盘输入) | 弱 | 中 |
| **教育功能定制深度** | **极深** (可集成 AI 助教、脚手架) | 浅 (通用工具) | 无 | 浅 |
| **儿童交互友好度** | **可定制** (卡通 UI、多模态反馈) | 低 (成人办公 UI) | 低 | 低 |
| **工程实现成本** | **极高** (需维护全栈架构) | 低 (集成 SDK 或直接使用) | 零 | 高 (购买成本) |
| **实时性体验** | 低 (LLM 推理存在延迟) | **高 (流式上屏)** | **高** | 高 |

## ---

**5\. 战略路径探索：是否有更优选择？**

基于上述分析，我们面临一个典型的\*\*“技术-体验悖论”\*\*：

* **现有方案**体验不够好，因为它们不懂教育，不懂儿童，只懂“听写”。  
* **完全自研**虽然能解决定制化问题，但面临巨大的延迟挑战和研发成本，且容易陷入“造轮子”的泥潭。

针对“自家孩子写作文”这一场景，真正的痛点可能并不在于追求“100% 的全语音控制”（像科幻电影里的 AI 一样），而在于如何利用语音降低门槛，同时利用触控和视觉保持掌控感。

### **5.1 推荐方案：混合多模态交互 (Hybrid Multimodal Interaction)**

与其追求用语音解决所有问题（包括移动光标、修改错别字），不如构建一个\*\*“语音负责生成，触控负责修订，AI 负责润色”\*\*的混合系统。

1. **语音作为“思维喷涌”的入口**：  
   * **发散阶段**：利用 Tiptap 的音频录制功能，先让孩子不看屏幕，闭着眼睛把想说的故事讲出来。系统在后台进行长音频转录。  
   * **无需纠错**：此时不要求实时精准，避免孩子因看到屏幕上的错别字而打断思路（遵循“写作流”理论）。  
2. **AI 作为“结构化整理”的助手**：  
   * **自动清洗**：利用 LLM 对转录后的文本进行“书面化处理”，自动去除口语废话、自动分段、自动标点。Tiptap 接收到的已经是清洗干净的 JSON 内容19。  
   * **呈现结果**：将整理好的草稿呈现给孩子，而非原始的语音识别结果。  
3. **触控与键盘作为“精细加工”的工具**：  
   * 对于局部的修改（如改一个字），触控或键盘远比语音指令“把第三行第五个字改成某”要高效得多。Tiptap 对移动端的良好支持使得这种混合交互非常顺滑21。

### **5.2 引入 "Copilot" 而非 "Dictator"**

将工具定位从“听写机”（Dictator）转变为“副驾驶”（Copilot）。这正是 Tiptap 生态中 Content AI 类插件的核心价值所在10。

* **场景化引导**：当 Tiptap 检测到文档末尾光标长时间（如 30 秒）未移动时，触发 AI 介入。  
* **语音交互**：AI 通过 TTS（语音合成）向孩子提问：“小明后来去了哪里呢？”而不是直接帮孩子写。  
* **实现逻辑**：这利用了 Tiptap 的 Node Views 能力，可以在编辑器内插入交互式的“AI 气泡”组件，甚至是一个卡通形象的 Agent，与纯文本内容共存11。

### **5.3 渐进式研发路线图**

对于决定采用自研或半自研的团队，建议遵循以下路线，以平衡成本与体验：

* **阶段一（MVP）：Tiptap \+ 浏览器原生 ASR \+ AI 润色菜单**  
  * 利用 Web Speech API 实现基础听写（免费）。  
  * 利用 Tiptap 的 Bubble Menu（气泡菜单），选中文字后弹出“AI 帮我改通顺”按钮。  
  * **目标**：验证孩子对“语音输入+触控修改”模式的接受度。  
* **阶段二：接入专业 ASR \+ 简单的规则指令**  
  * 后端接入阿里云/讯飞的实时语音 API，提升中文识别率。  
  * 在前端实现简单的正则匹配指令（如“换行”、“标题”），解决最基础的格式需求，暂不引入昂贵的 LLM 意图识别。  
  * **目标**：提升输入的流畅度和准确性。  
* **阶段三：全能 AI 写作伴侣**  
  * 接入 LLM Function Calling，实现复杂的文档重构（如“把这段扩写成排比句”）。  
  * 引入 TTS 朗读功能，让孩子“听”自己的作文，利用听觉反馈发现语病34。  
  * **目标**：实现深度教育辅导，打造差异化护城河。

## ---

**6\. 结论**

针对“自家孩子写作文”这一场景，**自研 Tiptap 语音工具在技术上不仅可行，而且是突破现有通用工具瓶颈、实现深度教育价值的必经之路。**

现有的 Google Docs 或讯飞工具，本质上是为“效率”设计的，它们解决了“打字慢”的问题，但没有解决“不会写”或“写不好”的问题。自研方案的核心价值不在于重造一个编辑器，而在于利用 Tiptap 的**可编程性（Programmability）**，将\*\*语音交互（Voice UI）**与**结构化文档（Structured Document）\*\*深度融合，构建一个能理解、能引导、能互动的智能写作伙伴。

然而，这也意味着巨大的工程投入。对于个人开发者或小型团队，**“混合交互 \+ 局部代理”**（即语音负责输入，AI 负责整理，触控负责修改）是比“全语音控制”更务实、体验更优的切入点。这不仅规避了全指令语音控制的高延迟陷阱，也更符合儿童写作能力进阶的客观规律。

#### **Works cited**

1. Full article: Speech-to-text intervention to support text production among students with writing difficulties: a single-case study in nordic countries, accessed December 26, 2025, [https://www.tandfonline.com/doi/full/10.1080/17483107.2024.2351488](https://www.tandfonline.com/doi/full/10.1080/17483107.2024.2351488)  
2. Blog: The Benefits of Speech-to-Text for Students \- LEO Academy Trust, accessed December 26, 2025, [https://www.leoacademytrust.co.uk/657/news-blogs/post/251/blog-the-benefits-of-speech-to-text-for-students](https://www.leoacademytrust.co.uk/657/news-blogs/post/251/blog-the-benefits-of-speech-to-text-for-students)  
3. The effectiveness of using speech-to-text technology to support writing of students with learning disabilities \- Rowan Digital Works, accessed December 26, 2025, [https://rdw.rowan.edu/cgi/viewcontent.cgi?article=3483\&context=etd](https://rdw.rowan.edu/cgi/viewcontent.cgi?article=3483&context=etd)  
4. Revisions in written composition: Introducing speech-to-text to children with reading and writing difficulties \- Frontiers, accessed December 26, 2025, [https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1133930/full](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1133930/full)  
5. Using Speech to Text to Support Written Expression in Students with ADHD \- OT4ADHD, accessed December 26, 2025, [https://ot4adhd.com/2022/09/29/using-speech-to-text-to-support-written-expression-in-students-with-adhd/](https://ot4adhd.com/2022/09/29/using-speech-to-text-to-support-written-expression-in-students-with-adhd/)  
6. (PDF) Exploring transcription processes when children with and without reading and writing difﬁculties produce written text using speech recognition \- ResearchGate, accessed December 26, 2025, [https://www.researchgate.net/publication/372059117\_Exploring\_transcription\_processes\_when\_children\_with\_and\_without\_reading\_and\_writing\_difficulties\_produce\_written\_text\_using\_speech\_recognition](https://www.researchgate.net/publication/372059117_Exploring_transcription_processes_when_children_with_and_without_reading_and_writing_difficulties_produce_written_text_using_speech_recognition)  
7. UX Design for Kids: How to Create Engaging Interfaces | Gapsy Studio, accessed December 26, 2025, [https://gapsystudio.com/blog/ux-design-for-kids/](https://gapsystudio.com/blog/ux-design-for-kids/)  
8. Top 10 UI/UX Design Principles for Creating Child-Friendly Interfaces \- Aufait UX, accessed December 26, 2025, [https://www.aufaitux.com/blog/ui-ux-designing-for-children/](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)  
9. Understanding Audio-to-Intent in Voice Assistants Using AI \- Resemble AI, accessed December 26, 2025, [https://www.resemble.ai/audio-intent-voice-assistants-ai/](https://www.resemble.ai/audio-intent-voice-assistants-ai/)  
10. Tiptap Content AI \- the Powerful AI Editor, accessed December 26, 2025, [https://tiptap.dev/product/content-ai](https://tiptap.dev/product/content-ai)  
11. TipTap Editor \+ Morph Fast Apply Integration: Rich Text AI Editing, accessed December 26, 2025, [https://www.morphllm.com/use-cases/tiptap-integration](https://www.morphllm.com/use-cases/tiptap-integration)  
12. What is theTiptap Suite?, accessed December 26, 2025, [https://tiptap.dev/experiments/voice-control](https://tiptap.dev/experiments/voice-control)  
13. ueberdosis/tiptap: The headless rich text editor framework for web artisans. \- GitHub, accessed December 26, 2025, [https://github.com/ueberdosis/tiptap](https://github.com/ueberdosis/tiptap)  
14. Transaction \- ProseMirror Reference manual, accessed December 26, 2025, [https://prosemirror.net/docs/ref/version/0.17.0.html](https://prosemirror.net/docs/ref/version/0.17.0.html)  
15. ProseMirror Guide, accessed December 26, 2025, [https://prosemirror.net/docs/guide/](https://prosemirror.net/docs/guide/)  
16. OpenAI Function Calling Tutorial: Generate Structured Output \- DataCamp, accessed December 26, 2025, [https://www.datacamp.com/tutorial/open-ai-function-calling-tutorial](https://www.datacamp.com/tutorial/open-ai-function-calling-tutorial)  
17. Function Calling in the OpenAI API, accessed December 26, 2025, [https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api](https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api)  
18. Structured model outputs | OpenAI API, accessed December 26, 2025, [https://platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)  
19. AI Generation editor commands | Tiptap Content AI, accessed December 26, 2025, [https://tiptap.dev/docs/content-ai/capabilities/generation/text-generation/built-in-commands](https://tiptap.dev/docs/content-ai/capabilities/generation/text-generation/built-in-commands)  
20. Integrate AI into your editor \- Tiptap, accessed December 26, 2025, [https://tiptap.dev/docs/editor/extensions/functionality/ai-generation](https://tiptap.dev/docs/editor/extensions/functionality/ai-generation)  
21. \[Bug\]: No Japanese/Chinese support · Issue \#4499 · ueberdosis/tiptap \- GitHub, accessed December 26, 2025, [https://github.com/ueberdosis/tiptap/issues/4499](https://github.com/ueberdosis/tiptap/issues/4499)  
22. Edit source code with tiptap · ueberdosis tiptap · Discussion \#5973 \- GitHub, accessed December 26, 2025, [https://github.com/ueberdosis/tiptap/discussions/5973](https://github.com/ueberdosis/tiptap/discussions/5973)  
23. The Ultimate Guide To Speech Recognition With Python, accessed December 26, 2025, [https://realpython.com/python-speech-recognition/](https://realpython.com/python-speech-recognition/)  
24. Agile Win Hotkey for iFlyVoice \- Custom Win+H for iFlytek, accessed December 26, 2025, [https://chriskyfung.github.io/Agile-Win-Hotkey-for-iFlyVoice/](https://chriskyfung.github.io/Agile-Win-Hotkey-for-iFlyVoice/)  
25. Type & edit with your voice \- Google Docs Editors Help, accessed December 26, 2025, [https://support.google.com/docs/answer/4492226?hl=en](https://support.google.com/docs/answer/4492226?hl=en)  
26. Google Docs Voice Typing Commands.docx, accessed December 26, 2025, [https://www.wssb.wa.gov/sites/default/files/2022-03/Google%20Docs%20Voice%20Typing%20Commands.docx](https://www.wssb.wa.gov/sites/default/files/2022-03/Google%20Docs%20Voice%20Typing%20Commands.docx)  
27. What is the best voice to text software for Windows 11/10 PC? \- Microsoft Community Hub, accessed December 26, 2025, [https://techcommunity.microsoft.com/discussions/windowsinsiderprogram/what-is-the-best-voice-to-text-software-for-windows-1110-pc/4395264/replies/4395268](https://techcommunity.microsoft.com/discussions/windowsinsiderprogram/what-is-the-best-voice-to-text-software-for-windows-1110-pc/4395264/replies/4395268)  
28. Will iFlytek Voice Input's 98% Accuracy Kill the Keyboard? \- Synced Review, accessed December 26, 2025, [https://syncedreview.com/2017/11/16/will-iflytek-voice-inputs-98-accuracy-kill-the-keyboard/](https://syncedreview.com/2017/11/16/will-iflytek-voice-inputs-98-accuracy-kill-the-keyboard/)  
29. iFlyTek AINOTE Air 2 review: E-ink tablet for transcription, translation, reading \- YouTube, accessed December 26, 2025, [https://www.youtube.com/watch?v=SJAj1zBWKto](https://www.youtube.com/watch?v=SJAj1zBWKto)  
30. So does anything compete with the IFlyTek AI Air Note 2 aside from Remarkable due to size? : r/eink \- Reddit, accessed December 26, 2025, [https://www.reddit.com/r/eink/comments/1jm1okm/so\_does\_anything\_compete\_with\_the\_iflytek\_ai\_air/](https://www.reddit.com/r/eink/comments/1jm1okm/so_does_anything_compete_with_the_iflytek_ai_air/)  
31. What's New?, accessed December 26, 2025, [https://www.nuance.com/products/help/dragon/dragon-for-mac/enx/Content/Introduction/WhatsNew.htm](https://www.nuance.com/products/help/dragon/dragon-for-mac/enx/Content/Introduction/WhatsNew.htm)  
32. How do you use the editing commands in Nuance Dragon NaturallySpeaking? \- Quora, accessed December 26, 2025, [https://www.quora.com/How-do-you-use-the-editing-commands-in-Nuance-Dragon-NaturallySpeaking](https://www.quora.com/How-do-you-use-the-editing-commands-in-Nuance-Dragon-NaturallySpeaking)  
33. SuggestCat: AI plugin for ProseMirror, accessed December 26, 2025, [https://discuss.prosemirror.net/t/suggestcat-ai-plugin-for-prosemirror/5623](https://discuss.prosemirror.net/t/suggestcat-ai-plugin-for-prosemirror/5623)  
34. Five Advantages of Audio Learning in Schools | Capstone, accessed December 26, 2025, [https://www.capstonepub.com/blog/five-advantages-audio-learning-schools](https://www.capstonepub.com/blog/five-advantages-audio-learning-schools)