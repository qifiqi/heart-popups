# 桌面版（PyQt5）

`heart-popups` 的桌面实现：爱心弹窗，以及网格/随机两种弹窗雨；网格模式可叠加文本、图片或视频覆盖层。

## 运行

需要 Windows（视频覆盖在 Windows 下走 DirectShow/VLC）与 Python 3.9+：

```powershell
cd desktop
python -m pip install -r requirements.txt
python love_popup.py
```

默认运行 90% 屏幕的居中网格弹窗雨，不带覆盖层。

## 切换效果

编辑 `love_popup.py` 的 `main()`，取消对应示例的注释：

- 爱心弹窗：`LoveHeartPopups(...).start()`
- 网格弹窗雨：`RandomRainPopups(..., screen_mode='grid').start()`
- 全屏随机弹窗雨：`RandomRainPopups(..., screen_mode='random').start()`
- 覆盖层：`overlay_type` 设为 `text` / `image` / `video`，`overlay_content` 填文本或本地路径

图片/视频路径示例是占位路径，使用前替换成本机文件。

## 依赖说明

- `PyQt5`：主界面与弹窗动画
- `python-vlc`：视频覆盖在 Qt 播放失败时的回退方案，需要同时安装 VLC 桌面播放器
- Windows 下建议安装 K-Lite Codec Pack，减少 QMediaPlayer 解码失败

## 来源

2026-11-11 从仓库 `qifiqi/aa` 迁入；原仓库中的 `bookmark_parser.py`、`niceGUI-t.py` 等实验代码未迁移。
