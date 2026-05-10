document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enableToggle');
    const modelInput = document.getElementById('modelName');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // 1. 初始化：从 storage 加载配置
    chrome.storage.local.get(['isEnabled', 'modelName'], (result) => {
        // 设置默认值
        toggle.checked = result.isEnabled !== undefined ? result.isEnabled : true;
        modelInput.value = result.modelName || 'qwen2.5-coder';
    });

    // 2. 保存配置
    saveBtn.addEventListener('click', () => {
        const isEnabled = toggle.checked;
        const modelName = modelInput.value.trim() || 'qwen2.5-coder';

        chrome.storage.local.set({
            isEnabled: isEnabled,
            modelName: modelName
        }, () => {
            // 视觉提示
            statusDiv.style.opacity = '1';
            statusDiv.innerText = '设置已保存！';
            setTimeout(() => {
                statusDiv.style.opacity = '0';
            }, 2000);
        });
    });
});