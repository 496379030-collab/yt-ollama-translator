# YouTube Realtime English Video Translator

这是一个专为 YouTube 设计的实时中英双语字幕翻译插件。它通过调用你本地运行的 **Ollama** AI 模型，将英文视频字幕瞬间转化为地道的中文。

## 🌟 核心亮点
- **电影级观感**：纯白字体配合柔和阴影，无背景遮挡，沉浸式体验。
- **强力失效保护**：内置严密的上下文检查机制，防止刷新插件时报错。
- **完全本地运行**：不经过云端 API，无需翻译费用，保护隐私。

## 🛠️ 快速安装指南
1. **安装大脑**：从 [Ollama 官网](https://ollama.com/) 下载并安装，运行 `ollama pull qwen2.5-coder:7b`。
2. **跨域启动**：在终端运行 `OLLAMA_ORIGINS="*" ollama serve`。
3. **加载插件**：在 Chrome 的 `chrome://extensions/` 页面开启“开发者模式”，点击“加载已解压的扩展程序”选择本项目文件夹。

## 📄 许可证
本项目采用 MIT 许可证。
