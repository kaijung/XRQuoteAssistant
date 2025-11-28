# Gemini Codebase Analysis: XR Quote Assistant

## 1. Project Summary

The project, 'XR Quote Assistant', is a sophisticated, real-time, voice-based conversational AI application. It is built using React, TypeScript, and Vite. Its primary purpose is to act as an AI-powered consultant ('Nova') for a fictional XR studio. The AI's goal is to engage potential clients in a spoken conversation to gather requirements for their projects (e.g., VR/AR type, platform, budget) in order to prepare a price quote.

The core of the application is the `useLiveAPI` custom hook, which masterfully handles a real-time, bidirectional audio stream with the Google Gemini Live API (`gemini-2.5-flash-native-audio-preview-09-2025` model). It captures microphone audio, sends it to the API, receives audio and transcription in return, and plays the AI's voice back to the user. The application's front-end displays the conversation in a chat format and provides a dynamic visualization of the AI's voice.

The AI's persona and objectives are clearly defined in a system prompt located in `constants.ts`. The project is well-structured, separating concerns effectively between UI components, core logic (hooks), and utilities.

Potential enhancements include displaying interim transcriptions for better UX, visualizing the user's audio input, providing more granular error messages, and adding a feature to summarize the conversation for an exportable quote.

## 2. Codebase Exploration Trace

The analysis process involved the following steps:
1.  Read `README.md` to get a high-level overview of the project as an AI Studio app using the Gemini API.
2.  Read `package.json` to identify the technology stack: React, TypeScript, Vite, and `@google/genai`.
3.  Read `App.tsx` to understand the main application structure, state management, and the central role of the `useLiveAPI` hook.
4.  Read `hooks/useLiveAPI.ts` to perform a deep dive into the core logic, including the connection to the Gemini Live API, audio context management for input and output, and the handling of transcription and audio playback.
5.  Read `utils/audioUtils.ts` to understand the helper functions responsible for converting audio data between the browser's Web Audio API format and the base64-encoded PCM format required by the Gemini API.
6.  Read `components/AudioVisualizer.tsx` to see how the AI's audio output is visualized on an HTML canvas.
7.  Read `components/TranscriptItem.tsx` to understand how individual conversation messages are rendered.
8.  Read `types.ts` to understand the data structures used, such as `Transcript` and `SpeakerType`.
9.  Read `constants.ts` to find the specific Gemini model name and, most importantly, the detailed system prompt that defines the AI's persona and objectives.

## 3. Key Files and Code Locations

### 3.1. `hooks/useLiveAPI.ts`
*   **Reasoning**: This is the most critical file, containing the entire business logic of the application. It manages the real-time, bidirectional stream with the Gemini Live API, handles microphone input, processes incoming audio from the AI, manages transcription events, and controls the application's connection state. Any significant change to the app's core functionality would happen here.
*   **Key Symbols**: `useLiveAPI`, `connect`, `disconnect`, `ai.live.connect`

### 3.2. `App.tsx`
*   **Reasoning**: This is the main React component that assembles the UI and manages the application's state (the list of transcripts). It orchestrates the interaction between the UI components and the `useLiveAPI` hook.
*   **Key Symbols**: `App`, `useLiveAPI`, `handleTranscriptUpdate`

### 3.3. `constants.ts`
*   **Reasoning**: This file defines the personality, goal, and behavior of the AI assistant. Modifying the `SYSTEM_INSTRUCTION` prompt is the primary way to change what the AI does and how it interacts with the user. The `MODEL_NAME` is also critical for API functionality.
*   **Key Symbols**: `SYSTEM_INSTRUCTION`, `MODEL_NAME`

### 3.4. `utils/audioUtils.ts`
*   **Reasoning**: This file contains essential utility functions for converting audio data between the format used by the browser's Web Audio API and the format required by the Gemini API. These functions are crucial for the audio streaming to work correctly.
*   **Key Symbols**: `createBlob`, `decodeAudioData`

### 3.5. `components/AudioVisualizer.tsx`
*   **Reasoning**: This component is responsible for the visual feedback of the AI's voice. It demonstrates how to use an `AnalyserNode` from the Web Audio API to create data-driven animations on a canvas.
*   **Key Symbols**: `AudioVisualizer`

### 3.6. `components/TranscriptItem.tsx`
*   **Reasoning**: This component is responsible for rendering each entry in the conversation log, styling it based on whether the speaker is the user or the AI.
*   **Key Symbols**: `TranscriptItem`

---
# Gemini 程式碼庫分析：XR 報價助理

## 1. 專案摘要

「XR 報價助理」專案是一款精密的即時語音對話式 AI 應用程式。它使用 React、TypeScript 和 Vite 技術棧建構。其主要目的是為一家虛構的 XR 工作室扮演名為「Nova」的 AI 顧問。此 AI 的目標是透過與潛在客戶進行語音對話，收集他們專案的需求（例如：VR/AR 類型、平台、預算），以便準備報價。

此應用的核心是 `useLiveAPI` 自定義鉤子 (custom hook)，它巧妙地處理了與 Google Gemini Live API (`gemini-2.5-flash-native-audio-preview-09-2025` 模型) 的即時雙向音訊串流。它能擷取麥克風音訊，將其傳送至 API，接收回傳的音訊和逐字稿，並向使用者播放 AI 的語音。應用的前端以聊天格式顯示對話內容，並提供 AI 語音的動態視覺化效果。

AI 的角色和目標在 `constants.ts` 檔案中的一個系統提示 (system prompt) 有清晰的定義。專案結構良好，有效地將 UI 元件、核心邏輯 (hooks) 和工具程式之間的關注點分離。

潛在的增強功能包括：顯示即時逐字稿以改善使用者體驗、將使用者的音訊輸入視覺化、提供更詳細的錯誤訊息，以及增加一個總結對話內容以便匯出報價的功能。

## 2. 程式碼庫探索軌跡

分析過程包括以下步驟：
1.  閱讀 `README.md` 以獲得對專案作為一個使用 Gemini API 的 AI 工作室應用程式的宏觀理解。
2.  閱讀 `package.json` 以識別技術棧：React、TypeScript、Vite 和 `@google/genai`。
3.  閱讀 `App.tsx` 以了解主要的應用程式結構、狀態管理以及 `useLiveAPI` 鉤子的核心角色。
4.  閱讀 `hooks/useLiveAPI.ts` 以深入探究核心邏輯，包括與 Gemini Live API 的連接、用於輸入和輸出的音訊上下文管理，以及對逐字稿和音訊播放的處理。
5.  閱讀 `utils/audioUtils.ts` 以了解在瀏覽器的 Web Audio API 格式和 Gemini API 所需的 base64 編碼 PCM 格式之間轉換音訊資料的輔助函式。
6.  閱讀 `components/AudioVisualizer.tsx` 以了解 AI 的音訊輸出如何在 HTML 畫布上視覺化。
7.  閱讀 `components/TranscriptItem.tsx` 以了解單個對話訊息的呈現方式。
8.  閱讀 `types.ts` 以了解所使用的資料結構，如 `Transcript` 和 `SpeakerType`。
9.  閱讀 `constants.ts` 以找到具體的 Gemini 模型名稱，以及最重要的、定義 AI 角色和目標的詳細系統提示。

## 3. 關鍵檔案與程式碼位置

### 3.1. `hooks/useLiveAPI.ts`
*   **原因**：這是最關鍵的檔案，包含了應用的全部業務邏輯。它管理與 Gemini Live API 的即時雙向串流，處理麥克風輸入，處理來自 AI 的傳入音訊，管理逐字稿事件，並控制應用的連接狀態。任何對應用核心功能的重大變更都會在這裡進行。
*   **關鍵符號**：`useLiveAPI`, `connect`, `disconnect`, `ai.live.connect`

### 3.2. `App.tsx`
*   **原因**：這是主要的 React 元件，負責組裝 UI 並管理應用的狀態（逐字稿列表）。它協調 UI 元件和 `useLiveAPI` 鉤子之間的互動。
*   **關鍵符號**：`App`, `useLiveAPI`, `handleTranscriptUpdate`

### 3.3. `constants.ts`
*   **原因**：此檔案定義了 AI 助理的個性、目標和行為。修改 `SYSTEM_INSTRUCTION` 提示是改變 AI 行為以及它如何與使用者互動的主要方式。`MODEL_NAME` 對於 API 功能也至關重要。
*   **關鍵符號**：`SYSTEM_INSTRUCTION`, `MODEL_NAME`

### 3.4. `utils/audioUtils.ts`
*   **原因**：此檔案包含在瀏覽器的 Web Audio API 使用的格式和 Gemini API 要求的格式之間轉換音訊資料的基本工具函式。這些函式對於音訊串流的正常運作至關重要。
*   **關鍵符號**：`createBlob`, `decodeAudioData`

### 3.5. `components/AudioVisualizer.tsx`
*   **原因**：此元件負責 AI 語音的視覺回饋。它展示了如何使用 Web Audio API 中的 `AnalyserNode` 在畫布上創建由資料驅動的動畫。
*   **關鍵符號**：`AudioVisualizer`

### 3.6. `components/TranscriptItem.tsx`
*   **原因**：此元件負責呈現對話日誌中的每個條目，並根據說話者是使用者還是 AI 來設定其樣式。
*   **關鍵符號**：`TranscriptItem`
