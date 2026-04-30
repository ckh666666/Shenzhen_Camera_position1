// 1. 优先尝试 GitHub Actions 注入的占位符（用于 GitHub Pages）
let token = 'YOUR_MAPBOX_TOKEN_PLACEHOLDER';

// 2. 如果占位符没被替换（比如在 Vercel 或本地），尝试读取系统环境变量
// 注意：纯前端 JS 无法直接访问 process.env，除非经过构建工具
if (token.includes('PLACEHOLDER')) {
    // 这里的逻辑可以留空，或者指向你其他的全局变量
    token = window.MAPBOX_TOKEN || ''; 
}

window.MAPBOX_ACCESS_TOKEN = token.trim();
window.MAPBOX_TOKEN = window.MAPBOX_ACCESS_TOKEN;