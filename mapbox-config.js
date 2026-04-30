/**
 * Mapbox 配置管理
 * 兼容 GitHub Actions (sed 替换) 与 Vercel 部署环境
 */

// 1. 定义占位符。在构建过程中，sed 命令会将此处的字符串替换为真实 Token。
// 注意：请务必保持这一行原样提交到 GitHub，不要手动填入真实 Token。
const secretToken = 'YOUR_MAPBOX_TOKEN_PLACEHOLDER';

/**
 * 获取有效的 Token
 * 逻辑：如果占位符被成功替换（不再包含 "PLACEHOLDER"），则使用替换后的值。
 * 如果没被替换，则尝试从全局变量获取（作为备选）。
 */
function getMapboxToken() {
    // 检查占位符是否已被替换
    if (secretToken && !secretToken.includes('PLACEHOLDER') && secretToken !== '') {
        return secretToken.trim();
    }
    
    // 如果占位符未被替换，尝试读取可能由其他脚本定义的全局变量
    // 如果依然没有，则返回空，界面会提示未检测到 Token
    return (window.MAPBOX_TOKEN || '').trim();
}

// 统一挂载到 window 对象，供 app.js 等其他文件调用
const finalToken = getMapboxToken();
window.MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiY2ZleWEiLCJhIjoiY21pMXBlNTdkMDN4aTJscXZjNWt3MnYzZSJ9.cg7gLIuJ065KDxdrOeSC_Q';
window.MAPBOX_TOKEN = window.MAPBOX_ACCESS_TOKEN;

