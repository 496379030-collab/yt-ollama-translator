// background.js 运行在后台，不认识 document，只负责 fetch 翻译
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.text, sendResponse);
    return true; // 保持通道以支持异步 fetch
  }
});

async function handleTranslation(englishText, sendResponse) {
  try {
    // 1. 获取用户设置
    const data = await chrome.storage.local.get(['isEnabled', 'modelName']);
    const isEnabled = data.isEnabled !== false;
    
    // 核心修复：强制去除模型名称前后的空格，如果为空则使用默认全名
    let modelName = (data.modelName || '').trim();
    if (!modelName) {
      modelName = 'qwen2.5-coder:7b';
    }

    if (!isEnabled) {
      sendResponse({ translatedText: "" });
      return;
    }

    // 2. 调用本地 Ollama API
    // 【优化】重写了 System Prompt，要求模型作为影视字幕专家，进行地道、意译的转换
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: `作为资深影视字幕翻译专家，请将输入的英文字幕翻译成自然、地道、符合中国人表达习惯的中文。要求：\n1. 意译为主，摒弃生硬的机翻感，符合中文语境和表达逻辑。\n2. 根据上下文调整语序，遇到俚语转换为恰当的中文词汇。\n3. 绝对只输出最终的翻译结果，不要带任何标点符号、解释或原英文。\n\n英文: ${englishText}\n中文:`,
        stream: false
      })
    });

    // 3. 处理模型名称无效导致的 400 错误
    if (response.status === 400) {
      const err = await response.json().catch(() => ({}));
      if (err.error && err.error.includes("model")) {
        sendResponse({ translatedText: `[模型名 "${modelName}" 无效，请打开插件设置重新输入]` });
        return;
      }
    }

    // 4. 处理模型未找到导致的 404 错误
    if (response.status === 404) {
      sendResponse({ translatedText: `[错误: 模型 "${modelName}" 未找到，请确保已下载该模型]` });
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      sendResponse({ translatedText: `[Ollama 错误: ${errorData.error || response.statusText}]` });
      return;
    }

    const result = await response.json();
    sendResponse({ translatedText: result.response.trim() });
  } catch (error) {
    console.error("Fetch Error:", error);
    sendResponse({ translatedText: "[本地模型连接失败，请确保终端正在运行 OLLAMA_ORIGINS=\"*\" ollama serve]" });
  }
}