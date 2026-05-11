// background.js
let contextHistory = []; // 核心：用于保存过去几句的字幕，提供上下文语境

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.text, sendResponse);
    return true; 
  } else if (request.action === 'clear_context') {
    // 切换视频或遇到广告时清空记忆
    contextHistory = [];
    sendResponse({ status: 'cleared' });
  }
});

async function handleTranslation(englishText, sendResponse) {
  try {
    const data = await chrome.storage.local.get(['isEnabled', 'modelName']);
    if (data.isEnabled === false) {
      sendResponse({ translatedText: "" });
      return;
    }
    
    let modelName = (data.modelName || '').trim() || 'qwen2.5-coder:7b';

    // 组装历史语境（最多保留最近的 2 条记录，防止记忆过载串扰）
    const historyText = contextHistory.length > 0 
      ? contextHistory.join(" ") 
      : "无";

    // 🌟 终极版 Prompt：专治机翻、串扰、断句稀碎
    const systemPrompt = `你是一个专业的顶级影视字幕翻译官。请将下方【当前台词】实时翻译成地道、自然的中文。

【翻译原则】（严格遵守）：
1. 结合语境：参考【前情提要】，准确意译。如果遇到俚语、缩写或专业术语，请转化为符合中国人习惯的表达。
2. 修复碎句：当前的台词可能是被截断的半句话，请结合语境顺滑补全逻辑，不要硬翻。
3. 过滤噪音：如果台词中混入了明显的无关广告词、乱码或重复词汇，请自动忽略，只翻译主干内容。
4. 绝对极简：只输出最终的中文翻译结果！绝不输出原英文，不要加任何解释，不要带引号。

【前情提要】：${historyText}
【当前台词】：${englishText}
【中文翻译】：`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: systemPrompt,
        stream: false
      })
    });

    if (response.status === 400 || response.status === 404) {
      sendResponse({ translatedText: `[模型配置有误，请检查]` });
      return;
    }

    if (!response.ok) throw new Error("Ollama API Error");

    const result = await response.json();
    let finalTranslation = result.response.trim();

    // 翻译成功后，将当前的有效英文句子加入记忆库，供下一句参考
    if (englishText.length > 10) {
      contextHistory.push(englishText);
      if (contextHistory.length > 2) contextHistory.shift(); // 永远只记最近2句
    }

    sendResponse({ translatedText: finalTranslation });
  } catch (error) {
    console.error("Fetch Error:", error);
    sendResponse({ translatedText: "[本地 AI 连接失败]" });
  }
}