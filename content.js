// content.js
let ui = null, cn = null, en = null;
let currentText = "", translateTimer = null, hideTimer = null;
let isPluginDead = false; 
let isEnabled = true; 
let currentVideoUrl = location.href; // 记录当前视频URL

chrome.storage.local.get(['isEnabled'], (res) => {
  if (res.isEnabled !== undefined) isEnabled = res.isEnabled;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isEnabled) {
    isEnabled = changes.isEnabled.newValue;
    updateNativeSubtitlesVisibility();
    if (!isEnabled && ui) ui.style.display = 'none';
  }
});

function updateNativeSubtitlesVisibility() {
  const styleEl = document.getElementById('ollama-sub-style');
  if (styleEl) {
    styleEl.textContent = isEnabled 
      ? `.caption-window, .ytp-caption-window-container { opacity: 0 !important; pointer-events: none !important; }` 
      : ``;
  }
}

function isContextValid() {
  if (isPluginDead) return false;
  try { return !!(chrome.runtime && chrome.runtime.id); } 
  catch (e) { isPluginDead = true; return false; }
}

// 视频切换检测：清理 AI 的历史记忆
setInterval(() => {
  if (location.href !== currentVideoUrl) {
    currentVideoUrl = location.href;
    if (isContextValid()) chrome.runtime.sendMessage({ action: 'clear_context' });
  }
}, 2000);

function createUI() {
  if (document.getElementById('ollama-sub-ui')) return true;
  const player = document.querySelector('.html5-video-player');
  if (!player) return false;

  const style = document.createElement('style');
  style.id = 'ollama-sub-style';
  document.head.appendChild(style);
  updateNativeSubtitlesVisibility(); 

  ui = document.createElement('div');
  ui.id = 'ollama-sub-ui';
  // 限制最大宽度和文字换行，防止挤在一起
  ui.style.cssText = "position:absolute;bottom:8%;left:50%;transform:translateX(-50%);width:85%;max-width:1000px;text-align:center;z-index:9999;pointer-events:none;word-break:keep-all;";

  cn = document.createElement('div');
  cn.style.cssText = "color:#FFFFFF;font-size:28px;font-weight:bold;text-shadow: 0px 0px 4px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.9); font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; margin-bottom: 6px; line-height: 1.3;";
  
  en = document.createElement('div');
  en.style.cssText = "color:#DCDCDC;font-size:16px;font-weight:normal;text-shadow: 0px 0px 3px rgba(0,0,0,0.8); font-family: -apple-system, sans-serif; line-height: 1.2;";

  ui.appendChild(cn);
  ui.appendChild(en); 
  player.appendChild(ui);
  return true;
}

const observer = new MutationObserver(() => {
  if (!isContextValid() || !isEnabled) return;

  try {
    // 核心优化：只抓取当前处于显示状态的字幕块，防止广告和其他视频片段的串扰
    const activeWindow = document.querySelector('.caption-window:not([style*="display: none"])');
    if (!activeWindow) return;

    const segments = activeWindow.querySelectorAll('.ytp-caption-segment');
    if (segments.length === 0) return;

    // 清洗抓取到的文字：去除多余空格和隐形换行
    const text = Array.from(segments)
      .map(s => s.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text && text !== currentText) {
      currentText = text;
      if(ui) ui.style.display = 'block';
      if(en) en.textContent = text; 

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { if(ui && isContextValid()) ui.style.display = 'none'; }, 4000);

      // 🌟 进阶版动态防抖 (Dynamic Debounce)：根据标点符号和说话节奏智能等待
      clearTimeout(translateTimer);
      
      // 1. 强语气结束（句号、问号、感叹号）：大概率是一句话说完了，迅速翻译
      const isSentenceEnd = /[.?!。？！]$/.test(text);
      // 2. 弱语气停顿（逗号、顿号）：一句话说到一半喘口气，稍微等一下
      const isPause = /[,，、]$/.test(text);
      
      let delay = 1500; // 默认：博主说话不流畅/没标点时，给足 1.5 秒的时间让他把单字吐完
      if (isSentenceEnd) delay = 200; // 说完了，200毫秒立刻翻
      else if (isPause) delay = 800;  // 逗号停顿，等800毫秒
      else if (text.length > 80) delay = 1000; // 句子太长了还没标点，强制在 1 秒后翻译防卡死

      translateTimer = setTimeout(() => {
        if (!isContextValid()) return;
        try {
          chrome.runtime.sendMessage({ action: 'translate', text: text }, (res) => {
            if (chrome.runtime.lastError) return;
            if (res && res.translatedText && cn) cn.textContent = res.translatedText;
          });
        } catch (e) { isPluginDead = true; observer.disconnect(); }
      }, delay);
    }
  } catch (err) {
    isPluginDead = true;
    observer.disconnect();
  }
});

const initInterval = setInterval(() => {
  if (!isContextValid()) { clearInterval(initInterval); return; }
  if (createUI()) observer.observe(document.body, { childList: true, subtree: true });
}, 2000);