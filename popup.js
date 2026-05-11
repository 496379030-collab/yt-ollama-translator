// 极简版逻辑:popup.js
// 采用“防弹”设计，彻底消除 null 报错
const initPopup = () => {
  // 自动寻找页面上的复选框，不依赖特定的 ID
  const toggle = document.querySelector('input[type="checkbox"]');

  if (!toggle) {
    console.warn("未找到开关元素，静默等待。");
    return; // 找不到就安静退出，绝不抛出红字报错卡死插件
  }

  // 读取当前开关状态（默认开启）
  chrome.storage.local.get(['isEnabled'], (res) => {
    toggle.checked = res.isEnabled !== false;
  });

  // 监听开关的点击动作
  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ isEnabled: toggle.checked });
  });
};

// 终极保险：确保在整个 HTML 页面完全渲染准备好之后再执行查找逻辑
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}