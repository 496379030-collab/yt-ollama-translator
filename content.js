let ui = null, cn = null, en = null;
let currentText = "", translateTimer = null, hideTimer = null;
let lastRequestTime = 0; 

// 检查插件上下文是否有效
function isContextValid() {
  return chrome.runtime && !!chrome.runtime.getManifest();
}

// 创建无感字幕界面
function createUI() {
  if (document.getElementById('ollama-sub-ui')) return true;
  const player = document.querySelector('.html5-video-player');
  if (!player) return false;

  const style = document.createElement('style');
  style.textContent = `.caption-window, .ytp-caption-window-container { display: none !important; opacity: 0 !important; visibility: hidden !important; }`;
  document.head.appendChild(style);

  ui = document.createElement('div');
  ui.id = 'ollama-sub-ui';
  ui.style.cssText = "position:absolute;bottom:8%;left:50%;transform:translateX(-50%);width:90%;text-align:center;z-index:9999;pointer-events:none;";

  cn = document.createElement('div');
  cn.style.cssText = "color:#FFFFFF;font-size:26px;font-weight:bold;text-shadow: 0px 0px 4px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.9); font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; margin-bottom: 4px;";
  cn.textContent = ""; 

  en = document.createElement('div');
  en.style.cssText = "color:#EAEAEA;font-size:16px;font-weight:normal;text-shadow: 0px 0px 3px rgba(0,0,0,0.8), 1px 1px 3px rgba(0,0,0,0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;";
  en.textContent = "";

  ui.appendChild(cn);
  ui.appendChild(en); 
  player.appendChild(ui);
  return true;
}

// 捕获 YouTube 原生字幕
const observer = new MutationObserver(() => {
  // 如果插件环境已失效（比如你刚刚点了刷新插件），直接停止观察
  if (!isContextValid()) {
    observer.disconnect();
    return;
  }

  const segments = document.querySelectorAll('.ytp-caption-segment');
  if (segments.length > 0) {
    const text = Array.from(segments).map(s => s.textContent).join(' ').trim();
    if (text && text !== currentText) {
      currentText = text;
      if(ui) ui.style.display = 'block';
      if(en) en.textContent = text; 

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { if(ui) ui.style.display = 'none'; }, 4000);

      clearTimeout(translateTimer);
      const now = Date.now();
      const isEnd = /[.?!]$/.test(text); 
      
      const doTranslate = () => {
        // 二次检查，防止在异步回调中报错
        if (!isContextValid()) return;
        
        lastRequestTime = Date.now();
        chrome.runtime.sendMessage({ action: 'translate', text: text }, (res) => {
          // 处理可能的运行时错误
          if (chrome.runtime.lastError) return;
          if (res && res.translatedText && cn) cn.textContent = res.translatedText;
        });
      };

      if (isEnd || (now - lastRequestTime > 1200)) {
        doTranslate();
      } else {
        translateTimer = setTimeout(doTranslate, 500);
      }
    }
  }
});

// 定时启动
const initInterval = setInterval(() => {
  if (!isContextValid()) {
    clearInterval(initInterval);
    return;
  }
  if (createUI()) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}, 2000);