// --- 修改前 (可能会导致报错的代码) ---
// document.getElementById('sceneModal').addEventListener('click', ...

// --- 修改后 (安全的写法) ---

// 1. 绑定图片模态窗
const imageModal = document.getElementById('imageModal');
if (imageModal) {
    imageModal.addEventListener('click', function(e) {
        if (e.target === this) { closeImageModal(); }
    });
}

// 2. 绑定场景模态窗 (这就是你报错的那一行)
const sceneModal = document.getElementById('sceneModal');
if (sceneModal) {
    sceneModal.addEventListener('click', function(e) {
        if (e.target === this) { closeSceneModal(); }
    });
}

// 3. 绑定键盘 ESC 键
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const sModal = document.getElementById('sceneModal');
        // 增加判断：只有当元素存在时才操作样式
        if (sModal && sModal.style.display !== 'none') {
            closeSceneModal();
        }
    }
});