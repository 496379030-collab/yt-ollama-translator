// content.js
// 包含功能：UI渲染、防叠字、智能语速自适应、柔和防饿死兜底、自动记忆清理
let ui = null, cn = null, en = null;
let currentText = "", translateTimer = null, hideTimer = null;
let isPluginDead = false; 
let isEnabled = true; 
let currentVideoUrl = location.href; 
let lastTranslateTime = Date.now(); // 🌟 记录上一次翻译的时间

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
    const activeWindow = document.querySelector('.caption-window:not([style*="display: none"])');
    if (!activeWindow) return;

    const segments = activeWindow.querySelectorAll('.ytp-caption-segment');
    if (segments.length === 0) return;

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

      clearTimeout(translateTimer);
      
      const isSentenceEnd = /[.?!。？！]$/.test(text);
      const isPause = /[,，、]$/.test(text);
      const now = Date.now();
      
      // 🌟 1. 基础分层：给正常语速博主充足的缓冲时间
      let delay = 1500; 
      if (isSentenceEnd) delay = 200; 
      else if (isPause) delay = 800;  
      
      // 🌟 2. 语速自适应机制（核心）：
      // 如果没有标点，但累积的字符数已超过 65 个（说明博主语速极快）
      // 那么大幅缩短等待时间，只要捕捉到极其微小的换气停顿（400ms）就立刻翻译
      if (text.length > 65) {
        delay = Math.min(delay, 400); 
      }

      // 🌟 3. 柔和版防饿死兜底：
      // 放宽到 3.5 秒。既能兜住极端情况下的死循环，又不会误伤正常博主的慢节奏
      if (now - lastTranslateTime > 3500) {
        delay = 50; 
      }

      translateTimer = setTimeout(() => {
        if (!isContextValid()) return;
        lastTranslateTime = Date.now(); 
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