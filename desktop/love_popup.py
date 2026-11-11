"""
——————————————————————————————————————————
PyQt5 爱心弹窗 & 弹窗雨动画 工具模块
——————————————————————————————————————————
功能：
    - LoveHeartPopups：在屏幕中间绘制爱心形状弹窗动画，依次弹出（顺时针/定制数量/内容），再依次关闭。
    - RandomRainPopups：模拟全屏或中心90%区域“弹窗雨”动画，窗口均匀（或随机）分布，随机弹出、随机消除，支持玩法切换。
    - 支持覆盖全网格特大弹窗：可显示自定义全屏文本、图片或视频，三者任选，并在弹窗雨弹出后一段时间出现。
主要用法：
    - 直接执行本模块（main）可体验默认示范动画。
    - 想体验哪类动画，在 main 或自己的脚本中选择相应类及参数即可。

主要类参数与用法：
    LoveHeartPopups(
        app, words_pool, win_w, win_h, n, delay, close_delay, hold_time
    )
        - 爱心弹窗动画，参数全部可调。调用 start() 启动。
    RandomRainPopups(
        app, words_pool, win_w, win_h, n=None, delay=120, close_delay=120,
        hold_time=10000, cover_ratio=0.9, screen_mode='grid'/'random', overlay_type=None, overlay_content=None
    )
        - "screen_mode='grid'"：90%屏幕网格严格铺满，推荐。'random'为经典全屏随机分布。
        - 覆盖大弹窗用 overlay_type ['text','image','video']/overlay_content（文本、图片路径或视频路径），留空则为纯弹窗雨无大覆盖。
    - 使用 main() 内注释区即可全自动体验不同动画和参数效果。

常见问题：
    1. 大弹窗视频支持普遍格式(如mp4、avi)，要求本地文件路径。
    2. 调整窗口尺寸、动画节奏、弹窗内容依靠参数区块，均有注释。
    3. 样式/动画可以轻松拓展。
——————————————————————————————————————————
"""
import sys
import random
import math
from PyQt5.QtWidgets import QApplication, QLabel, QWidget, QDialog, QVBoxLayout
from PyQt5.QtCore import Qt, QTimer, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QPalette, QPixmap
from PyQt5.QtMultimedia import QMediaPlayer, QMediaContent
from PyQt5.QtMultimediaWidgets import QVideoWidget
from PyQt5.QtCore import QUrl

# 关心短句池，30条，可自定义
LOVE_WORDS_POOL = [
    "天气转凉，记得添衣裳。",
    "多喝热水，身体棒棒的。",
    "每天开心，忘掉烦恼哦。",
    "早点睡觉，健康最重要。",
    "吃饭别挑食，均衡营养美。",
    "压力大时要学会放松。",
    "无论何时，我都支持你。",
    "想你的每一天都很甜。",
    "偶尔运动，活力又一天。",
    "别熬夜了，对自己好点。",
    "开心每一天，幸福不离分。",
    "记得按时喝水哦！",
    "世界很美，请善待自己。",
    "累了就歇歇，别太拼啦。",
    "你是特别的，千万别怀疑。",
    "要相信自己很棒，很优秀。",
    "温柔以待生活，笑对人生。",
    "无论晴天雨天，都要快乐。",
    "永远做自己的小太阳。",
    "愿好运常伴你左右。",
    "世界因你而更美好。",
    "微笑面对每一天。",
    "往前走，别回头。",
    "不开心就来找我聊。",
    "你的善良值得被温柔相待。",
    "相信未来更美好。",
    "感恩生活所赐一切。",
    "记得享受当下时光。",
    "偶尔也要宠爱自己。",
    "人生路上，有我陪伴你。"
]
# 自动补全等长，便于窗口内容完美对齐显示
max_len = max(len(s) for s in LOVE_WORDS_POOL)
def pad_to_equal_length(s):
    # 用中文全角空格补到等长
    return s + '　' * (max_len - len(s))
LOVE_WORDS_POOL = [pad_to_equal_length(s) for s in LOVE_WORDS_POOL]

class LovePopup(QWidget):
    """基础弹窗"""
    def __init__(self, text, pos, color, win_w, win_h):
        super().__init__()
        self.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint)
        self.resize(win_w, win_h)
        self.move(pos[0], pos[1])
        pal = self.palette()
        pal.setColor(QPalette.Window, color)
        self.setPalette(pal)
        self.setAutoFillBackground(True)
        font_size = max(12, win_h // 4)
        label = QLabel(text, self)
        label.setFont(QFont("微软雅黑", font_size, QFont.Bold))
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("color: white;")

class LoveHeartPopups:
    """
    爱心弹窗动画类
    参数：
        app: QApplication
        words_pool: 句子池
        win_w: 弹窗宽度
        win_h: 弹窗高度
        n: 弹窗数量
        delay: 弹出间隔ms
        close_delay: 每个消除间隔ms
        hold_time: 全部弹出后停留ms
    """
    def __init__(self, app, words_pool, win_w, win_h, n, delay, close_delay, hold_time):
        self.app = app
        self.words_pool = words_pool
        self.win_w = win_w
        self.win_h = win_h
        self.n = n
        self.delay = delay
        self.close_delay = close_delay
        self.hold_time = hold_time
        # 屏幕中心+爱心尺寸
        from PyQt5.QtGui import QGuiApplication
        screen = QGuiApplication.primaryScreen().geometry()
        self.sW, self.sH = screen.width(), screen.height()
        self.center = (self.sW // 2, self.sH // 2)
        self.heart_size = int(min(self.sW, self.sH)//2 * 0.88 / 17)
        # 初始化心形点位顺序
        self.positions = self.heart_positions()
        self.popups = []
        self.idx = 0
    def heart_xy(self, t):
        x = self.heart_size * 16 * math.sin(t) ** 3
        y = -self.heart_size * (13 * math.cos(t) - 5 * math.cos(2 * t)
                    - 2 * math.cos(3 * t) - math.cos(4 * t))
        return int(self.center[0]+x-self.win_w//2), int(self.center[1]+y-self.win_h//2)
    def heart_positions(self):
        ts = [i * 2 * math.pi / self.n for i in range(self.n)]
        return [self.heart_xy(t) for t in ts]
    def random_color(self):
        base = random.randint(130, 255)
        r = random.randint(base-80, base)
        g = random.randint(base-80, base)
        b = random.randint(base-80, base)
        return QColor(r, g, b)
    def show_next(self):
        if self.idx < self.n:
            pos = self.positions[self.idx]
            text = self.words_pool[self.idx % len(self.words_pool)]
            color = self.random_color()
            popup = LovePopup(text, pos, color, self.win_w, self.win_h)
            popup.show()
            self.popups.append(popup)
            self.idx += 1
        else:
            self.timer.stop()
            QTimer.singleShot(self.hold_time, lambda: self.close_popups(0))
    def close_popups(self, close_idx):
        if close_idx < len(self.popups):
            self.popups[close_idx].close()
            QTimer.singleShot(self.close_delay, lambda: self.close_popups(close_idx+1))
        else:
            QTimer.singleShot(400, self.app.quit)
    def start(self):
        self.idx = 0
        self.popups = []
        self.timer = QTimer()
        self.timer.timeout.connect(self.show_next)
        self.timer.start(self.delay)
        self.show_next()
        self.app.exec_()

# 通用全屏覆盖大弹窗
class BigOverlayWindow(QDialog):
    closed = pyqtSignal()
    def __init__(self, overlay_type, overlay_content, cover_geom=None, parent=None):
        super().__init__(parent)
        from PyQt5.QtWidgets import QLabel, QVBoxLayout
        from PyQt5.QtGui import QPixmap
        from PyQt5.QtCore import Qt, QTimer
        import os
        self.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint)
        self.setModal(False)
        # 默认覆盖范围70%（可被自定义覆盖区域替代）
        if cover_geom:
            self.setGeometry(*cover_geom)
            width, height = cover_geom[2], cover_geom[3]
        else:
            desktop = QApplication.primaryScreen().geometry()
            scr_w, scr_h = desktop.width(), desktop.height()
            w = int(scr_w * 0.7)
            h = int(scr_h * 0.7)
            x = (scr_w - w)//2
            y = (scr_h - h)//2
            self.setGeometry(x, y, w, h)
            width, height = w, h
        layout = QVBoxLayout()
        self.setLayout(layout)
        self.overlay_type = overlay_type
        self._vlc_timer = None
        if overlay_type == "text":
            label = QLabel(overlay_content)
            label.setAlignment(Qt.AlignCenter)
            label.setStyleSheet('color:white; background:rgba(0,0,0,0.85);')
            font = QFont("微软雅黑", max(26, height//14), QFont.Bold)
            label.setFont(font)
            layout.addWidget(label)
        elif overlay_type == "image":
            label = QLabel()
            label.setAlignment(Qt.AlignCenter)
            pixmap = QPixmap(overlay_content).scaled(width, height, Qt.KeepAspectRatioByExpanding)
            label.setPixmap(pixmap)
            layout.addWidget(label)
        elif overlay_type == "video":
            video_path = overlay_content
            if not os.path.isabs(video_path):
                video_path = os.path.abspath(video_path)
            self._try_qt_video(layout, video_path)
        self.installEventFilter(self)
        self.setFocusPolicy(Qt.StrongFocus)
    def _try_qt_video(self, layout, video_path):
        try:
            from PyQt5.QtMultimedia import QMediaPlayer, QMediaContent
            from PyQt5.QtMultimediaWidgets import QVideoWidget
            from PyQt5.QtCore import QUrl
            self.player = QMediaPlayer(self)
            self.videoWidget = QVideoWidget(self)
            layout.addWidget(self.videoWidget)
            media = QMediaContent(QUrl.fromLocalFile(video_path))
            self.player.setMedia(media)
            self.player.setVideoOutput(self.videoWidget)
            self.player.mediaStatusChanged.connect(self._on_qt_media_status)
            self.player.error.connect(lambda: self._fallback_to_vlc(layout, video_path))
            print('[VideoPlay] 播放地址:', video_path)
            self.player.play()
        except Exception as e:
            print('[QtVideoInitError]', str(e))
            self._fallback_to_vlc(layout, video_path)
    def _on_qt_media_status(self, status):
        from PyQt5.QtMultimedia import QMediaPlayer
        print('[VideoStatus]', status)
        if status == QMediaPlayer.EndOfMedia:
            print('[Video] 播放结束 Auto Close')
            self.closed.emit()
            self.close()
        elif status == QMediaPlayer.InvalidMedia:
            # 兜底容错：无效媒体尝试 VLC
            self._fallback_to_vlc(self.layout(), None)
    def _fallback_to_vlc(self, layout, video_path):
        # 如果已经在VLC播放或没有视频路径，避免重复
        if getattr(self, '_using_vlc', False):
            return
        if video_path is None:
            return
        try:
            import vlc
            self._using_vlc = True
            self.vlc_instance = vlc.Instance()
            self.vlc_player = self.vlc_instance.media_player_new()
            # 使用一个承载widget来获得句柄
            from PyQt5.QtWidgets import QWidget
            self.vlc_host = QWidget(self)
            self.layout().addWidget(self.vlc_host)
            win_id = int(self.vlc_host.winId())
            # 绑定到窗口
            if sys.platform.startswith('win'):
                self.vlc_player.set_hwnd(win_id)
            elif sys.platform == 'darwin':
                self.vlc_player.set_nsobject(win_id)
            else:
                self.vlc_player.set_xwindow(win_id)
            self.vlc_media = self.vlc_instance.media_new_path(video_path)
            self.vlc_player.set_media(self.vlc_media)
            self.vlc_player.play()
            # 轮询播放状态直到结束
            from PyQt5.QtCore import QTimer
            self._vlc_timer = QTimer(self)
            self._vlc_timer.setInterval(300)
            self._vlc_timer.timeout.connect(self._poll_vlc_state)
            self._vlc_timer.start()
            print('[VLC] fallback 播放中')
        except Exception as e:
            print('[VLCInitError]', str(e))
    def _poll_vlc_state(self):
        try:
            import vlc
            state = self.vlc_player.get_state()
            # 结束/错误/空状态都关闭
            if state in (vlc.State.Ended, vlc.State.Stopped, vlc.State.Error):
                if self._vlc_timer:
                    self._vlc_timer.stop()
                self.closed.emit()
                self.close()
        except Exception:
            if self._vlc_timer:
                self._vlc_timer.stop()
            self.closed.emit()
            self.close()
    def eventFilter(self, source, event):
        from PyQt5.QtCore import QEvent
        if event.type() == QEvent.KeyPress and event.key() == 16777216:  # Esc
            self.close()
            return True
        if event.type() == QEvent.MouseButtonPress and self.overlay_type != 'video':
            self.close()
            return True
        return super().eventFilter(source, event)
    def on_media_status(self, status):
        # 保留兼容旧路径（已由 _on_qt_media_status 处理）
        pass
    def closeEvent(self, event):
        try:
            if getattr(self, '_vlc_timer', None):
                self._vlc_timer.stop()
            if getattr(self, 'vlc_player', None):
                self.vlc_player.stop()
        except Exception:
            pass
        self.closed.emit()
        event.accept()

class RandomRainPopups:
    """
    弹窗雨动画类：两种分布模式可选
    添加全屏overlay能力(仅grid模式) 可全屏显示文字/图片/视频，内容由overlay_content/overlay_type决定
    """
    def __init__(self, app, words_pool, win_w, win_h, n=None, delay=120, close_delay=120, hold_time=10000, cover_ratio=0.9, screen_mode='grid', overlay_type=None, overlay_content=None, overlay_geom=None):
        self.app = app
        self.words_pool = words_pool
        self.win_w = win_w
        self.win_h = win_h
        from PyQt5.QtGui import QGuiApplication
        screen = QGuiApplication.primaryScreen().geometry()
        self.sW, self.sH = screen.width(), screen.height()
        self.cover_ratio = cover_ratio
        self.screen_mode = screen_mode
        self.delay = delay
        self.close_delay = close_delay
        self.hold_time = hold_time
        self.overlay_type = overlay_type
        self.overlay_content = overlay_content
        self.overlay_geom = overlay_geom
        if self.screen_mode == 'grid':
            self.cover_w = int(self.sW * self.cover_ratio)
            self.cover_h = int(self.sH * self.cover_ratio)
            self.offset_x = (self.sW - self.cover_w) // 2
            self.offset_y = (self.sH - self.cover_h) // 2
            self.n_col = max(1, self.cover_w // self.win_w)
            self.n_row = max(1, self.cover_h // self.win_h)
            self.n = self.n_col * self.n_row
            self.positions = self.grid_positions()
        else:
            if n is None:
                self.n = max(48, min(int(self.sW * 0.07), 200))
                self.n = max(self.n, 30)
            else:
                self.n = n
            self.positions = self.random_positions()
        self.popups = []
        self.idx = 0
        self.random_open_idx = []
        self.random_close_idx = []
    def grid_positions(self):
        positions = []
        for r in range(self.n_row):
            for c in range(self.n_col):
                x = self.offset_x + c * self.win_w
                y = self.offset_y + r * self.win_h
                positions.append((x, y))
        return positions
    def random_positions(self):
        positions = []
        tried = set()
        attempts = 0
        max_count = int((self.sW // self.win_w) * (self.sH // self.win_h) * 2)
        while len(positions) < self.n and attempts < max_count*10:
            x = random.randint(0, self.sW - self.win_w)
            y = random.randint(0, self.sH - self.win_h)
            grid = (x // (self.win_w//2), y // (self.win_h//2))
            if grid not in tried:
                tried.add(grid)
                positions.append((x, y))
            attempts += 1
        if len(positions) < self.n:
            for _ in range(self.n - len(positions)):
                x = random.randint(0, self.sW - self.win_w)
                y = random.randint(0, self.sH - self.win_h)
                positions.append((x, y))
        return positions[:self.n]
    def random_color(self):
        base = random.randint(130, 255)
        r = random.randint(base-80, base)
        g = random.randint(base-80, base)
        b = random.randint(base-80, base)
        return QColor(r, g, b)
    def show_next(self):
        if self.idx < self.n:
            arr_idx = self.random_open_idx[self.idx]
            pos = self.positions[arr_idx]
            text = self.words_pool[self.idx % len(self.words_pool)]
            color = self.random_color()
            popup = LovePopup(text, pos, color, self.win_w, self.win_h)
            popup.show()
            self.popups.append(popup)
            self.idx += 1
        else:
            self.timer.stop()
            # 网格模式弹窗全部弹出后启动overlay(等待hold_time毫秒后)
            if self.screen_mode == 'grid' and self.overlay_type and self.overlay_content:
                QTimer.singleShot(self.hold_time, self.show_overlay)
            else:
                QTimer.singleShot(self.hold_time, lambda: self.close_popups(0))
    def show_overlay(self):
        # 优先用用户自定义区域，否则默认覆盖弹窗雨区
        if self.overlay_geom:
            geom = self.overlay_geom
        else:
            geom = (self.offset_x, self.offset_y, self.cover_w, self.cover_h)
        self.overlay = BigOverlayWindow(self.overlay_type, self.overlay_content, cover_geom=geom)
        self.overlay.closed.connect(lambda: self.close_popups(0))
        self.overlay.show()
    def close_popups(self, step):
        if step < len(self.popups):
            self.popups[step].close()
            QTimer.singleShot(self.close_delay, lambda: self.close_popups(step+1))
        else:
            QTimer.singleShot(400, self.app.quit)
    def start(self):
        self.idx = 0
        self.popups = []
        self.random_open_idx = list(range(self.n))
        random.shuffle(self.random_open_idx)
        self.random_close_idx = []
        self.timer = QTimer()
        self.timer.timeout.connect(self.show_next)
        self.timer.start(self.delay)
        self.show_next()
        self.app.exec_()

# =========== 入口主流程举例，可选爱心/弹窗雨 ===================
def main():
    WIN_W_SCALE = 0.4
    WIN_H_SCALE = 0.8
    app = QApplication(sys.argv)
    from PyQt5.QtGui import QGuiApplication
    screen = QGuiApplication.primaryScreen().geometry()
    sW, sH = screen.width(), screen.height()
    n = max(48, min(int(sW * 0.07), 200))
    n = max(n, 30)
    WIN_W = int(WIN_W_SCALE * max(360, int(sW * 0.026 * max_len)))
    WIN_H = int(WIN_H_SCALE * max(56, int(sH * 0.065)))
    delay = 80
    close_delay = 40
    hold_time = 3000
    cover_ratio = 0.9


    # 0. 爱心弹窗动画（顺时针弹出→等待→顺时针消除）
    heart = LoveHeartPopups(
        app,               # QApplication
        LOVE_WORDS_POOL,   # 句子池（会循环使用）
        WIN_W, WIN_H,      # 弹窗宽高
        n,                 # 爱心点数量，越大越密
        delay,             # 弹出间隔(ms)
        close_delay,       # 关闭间隔(ms)
        hold_time          # 全部弹出后等待(ms)
    )
    heart.start()


    # ========== 90%严格网格弹窗雨 多场景案例及用法演示 ===========

    # 1. 普通90%严格网格弹窗雨
    # rain_grid = RandomRainPopups(app, LOVE_WORDS_POOL, WIN_W, WIN_H, delay=delay, close_delay=close_delay, hold_time=hold_time, cover_ratio=cover_ratio, screen_mode='grid')
    # rain_grid.start()

    # 2. 90%网格弹窗雨+全屏大文字弹窗
    # overlay_type = 'text'
    # overlay_content = '一生很短，唯愿有你！\n❤要开心❤'
    # rain_grid_text = RandomRainPopups(app, LOVE_WORDS_POOL, WIN_W, WIN_H, delay=delay, close_delay=close_delay, hold_time=hold_time, cover_ratio=cover_ratio, screen_mode='grid', overlay_type=overlay_type, overlay_content=overlay_content)
    # rain_grid_text.start()

    # 3. 90%网格弹窗雨+全屏大图片弹窗
    # overlay_type = 'image'
    # overlay_content = r'C:/Users/fuqing/Desktop/love.png'   # 请替换为你的本地图片路径
    # rain_grid_img = RandomRainPopups(app, LOVE_WORDS_POOL, WIN_W, WIN_H, delay=delay, close_delay=close_delay, hold_time=hold_time, cover_ratio=cover_ratio, screen_mode='grid', overlay_type=overlay_type, overlay_content=overlay_content)
    # rain_grid_img.start()

    # 4. 90%网格弹窗雨+视频（自动播放到结束；若Qt失败，自动回退VLC）
    # overlay_type = 'video'
    # overlay_content = r'C:/path/to/video.mp4'    # 本地视频路径；建议h264/aac编码
    # rain_grid_video = RandomRainPopups(app, LOVE_WORDS_POOL, WIN_W, WIN_H, delay=delay, close_delay=close_delay, hold_time=hold_time, cover_ratio=cover_ratio, screen_mode='grid', overlay_type=overlay_type, overlay_content=overlay_content)
    # rain_grid_video.start()

    # 5. 90%网格弹窗 + 自定义大窗口覆盖区域（比如仅覆盖5/6大小，居中）
    # custom_w = int(cover_ratio * sW * 5 // 6)
    # custom_h = int(cover_ratio * sH * 5 // 6)
    # custom_x = (sW - custom_w)//2
    # custom_y = (sH - custom_h)//2
    # overlay_geom = (custom_x, custom_y, custom_w, custom_h)
    # overlay_type = 'text'
    # overlay_content = '❤️仅覆盖部分区域❤️'
    # rain_grid_custom = RandomRainPopups(app, LOVE_WORDS_POOL, WIN_W, WIN_H, delay=delay, close_delay=close_delay, hold_time=hold_time, cover_ratio=cover_ratio, screen_mode='grid', overlay_type=overlay_type, overlay_content=overlay_content, overlay_geom=overlay_geom)
    # rain_grid_custom.start()

    # ========== 你只需选择上面任意一组，取消注释即可体验多效果 ==========

    # --- 默认演示：普通90%网格弹窗雨（无overlay） ---
    # rain_grid = RandomRainPopups(
    #     app, LOVE_WORDS_POOL, WIN_W, WIN_H,
    #     delay=delay, close_delay=close_delay, hold_time=hold_time,
    #     cover_ratio=cover_ratio, screen_mode='grid',
    #     overlay_type=None, overlay_content=None
    # )
    # rain_grid.start()

    # ------- 全屏随机分布弹窗雨（不支持overlay） -------
    # rain_random = RandomRainPopups(app, LOVE_WORDS_POOL, WIN_W, WIN_H, n=n, delay=delay, close_delay=close_delay, hold_time=hold_time, screen_mode='random')
    # rain_random.start()

if __name__ == '__main__':
    main()
