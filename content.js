let ui = null, cn = null, en = null;
let currentText = "", translateTimer = null, hideTimer = null;
let lastRequestTime = 0; // 记录上次发送翻译的时间

// 创建无感字幕界面
function createUI() {
  if (document.getElementById('ollama-sub-ui')) return true;
  const player = document.querySelector('.html5-video-player');
  if (!player) return false;

  // 注入样式彻底隐藏原字幕
  const style = document.createElement('style');
  style.textContent = `.caption-window, .ytp-caption-window-container { display: none !important; opacity: 0 !important; visibility: hidden !important; }`;
  document.head.appendChild(style);

  ui = document.createElement('div');
  ui.id = 'ollama-sub-ui';
  // 【UI优化】去除所有背景色、边距，只保留文字定位
  ui.style.cssText = "position:absolute;bottom:8%;left:50%;transform:translateX(-50%);width:90%;text-align:center;z-index:9999;pointer-events:none;";

  cn = document.createElement('div');
  // 【UI优化】缩小中文字号，添加适度黑色阴影，加入底部间距
  cn.style.cssText = "color:#FFFFFF;font-size:26px;font-weight:bold;text-shadow: 0px 0px 4px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.9); font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; margin-bottom: 4px;";
  cn.textContent = ""; 

  en = document.createElement('div');
  // 【UI优化】新增英文字幕：字号更小，使用极简现代系统字体，主次分明
  en.style.cssText = "color:#EAEAEA;font-size:16px;font-weight:normal;text-shadow: 0px 0px 3px rgba(0,0,0,0.8), 1px 1px 3px rgba(0,0,0,0.9); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;";
  en.textContent = "";

  ui.appendChild(cn);
  ui.appendChild(en); // 挂载英文字幕
  player.appendChild(ui);
  return true;
}

// 捕获 YouTube 原生字幕
const observer = new MutationObserver(() => {
  const segments = document.querySelectorAll('.ytp-caption-segment');
  if (segments.length > 0) {
    const text = Array.from(segments).map(s => s.textContent).join(' ').trim();
    if (text && text !== currentText) {
      currentText = text;
      ui.style.display = 'block';
      en.textContent = text; // 实时更新英文字幕

      // 自动隐藏逻辑
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { ui.style.display = 'none'; }, 4000);

      // 【速度优化】核心触发逻辑
      clearTimeout(translateTimer);
      const now = Date.now();
      const isEnd = /[.?!]$/.test(text); // 遇到标点结束符
      
      const doTranslate = () => {
        lastRequestTime = Date.now();
        chrome.runtime.sendMessage({ action: 'translate', text: text }, (res) => {
          if (res && res.translatedText) cn.textContent = res.translatedText;
        });
      };

      // 只要遇到标点，或者人物持续说话距离上次翻译超过了 1.2 秒，强制触发翻译
      if (isEnd || (now - lastRequestTime > 1200)) {
        doTranslate();
      } else {
        // 否则缩短防抖等待时间到 500ms（稍微停顿即翻译）
        translateTimer = setTimeout(doTranslate, 500);
      }
    }
  }
});

setInterval(() => {
  if (createUI()) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}, 2000);