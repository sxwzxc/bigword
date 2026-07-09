# BigWord 项目长期笔记

- **架构**：字符画主页逻辑统一在 `src/lib/bigword.ts`（非页面文件），`src/app/page.tsx` 从此导入。**动效字符页 `/animate` 是独立实现，不 import `bigword.ts`**：核心为 `src/lib/animate-text.ts`（离屏 canvas 采样目标文字得到栅格 mask + `AnimatedBigText` 类用 requestAnimationFrame 逐帧 `ctx.fillText` 渲染小文字并施加 pulse/wave/scroll/blink/rainbow 动画）。两者切勿混用。
- **修改入口（字符画主页）**：要改栅格采样/填充算法，只动 `src/lib/bigword.ts` 的 `rasterizeTarget` / `generateBigWord`。`rasterizeTarget` 需传入 `charAspect`（来自 `measureCellMetrics`），否则行高/对齐会与旧版不一致。动效字符页的渲染在 `src/lib/animate-text.ts`，修改动画/采样逻辑去那里。
- **路由**：主页 `/`、像素画板 `/image`、动效字符 `/animate`，三者 header 互相链接。
- **推送**：`git push origin main` 用代理绕过 GCM 卡 GUI 的命令：
  `GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c credential.helper=store -c http.sslVerify=false -c http.schannelCheckRevoke=false push origin main`
  （github.com 经 WattToolkit 映射到 127.0.0.1）。
- **约定：完成后自动推送**。每次完成实质性工作（新功能、修复、重构）并经 `next build` 验证通过后，立即 `git add -A && git commit` 并自动 push 到 main（用上面的代理命令）。不再单独询问是否需要推送。
