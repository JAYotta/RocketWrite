# 系统架构

## 架构图

```mermaid
graph TB
    subgraph "前端应用"
        UI[React UI]
        Editor[Tiptap编辑器]
        VoiceHook[语音识别Hook]
        NLUHook[指令解析Hook]
    end

    subgraph "语音识别层"
        ASR[ASR引擎]
        ASR_Local[RealtimeSTT<br/>Python服务]
        ASR_Cloud[云端API<br/>备选]
    end

    subgraph "指令理解层"
        LLM[轻量级LLM<br/>Qwen-1.8B]
        IntentParser[意图解析器]
        Guard[生成防护]
    end

    subgraph "编辑器核心"
        ProseMirror[ProseMirror文档模型]
        Transaction[事务管理]
        DiffView[Diff预览视图]
    end

    UI --> Editor
    UI --> VoiceHook
    VoiceHook --> ASR
    ASR --> ASR_Local
    ASR --> ASR_Cloud

    UI --> NLUHook
    NLUHook --> LLM
    LLM --> IntentParser
    IntentParser --> Guard
    Guard --> Transaction
    Transaction --> Editor

    Editor --> ProseMirror
    Editor --> DiffView

    style Guard fill:#ffcccc
    style ASR_Local fill:#ccffcc
    style LLM fill:#ccccff
```
