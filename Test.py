import cv2
import numpy as np
from keras.models import load_model
import os
import threading
from gtts import gTTS
import pygame
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import datetime
import time

# ---------------------------------------------------------
# CẤU HÌNH HỆ THỐNG
# ---------------------------------------------------------
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
pygame.mixer.init()


def write_vietnamese(cv2_img, text, position, text_color=(255, 255, 255), font_size=30):
    pil_img = Image.fromarray(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()
    rgb_color = (text_color[2], text_color[1], text_color[0])
    draw.text(position, text, font=font, fill=rgb_color)
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def speak_vietnamese(text):
    def run_speech():
        try:
            tts = gTTS(text=text, lang='vi')
            fp = BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            pygame.mixer.music.load(fp)
            pygame.mixer.music.play()
        except Exception:
            pass

    if not pygame.mixer.music.get_busy():
        threading.Thread(target=run_speech, daemon=True).start()


def draw_scanner_box(img, x, y, w, h, color, thickness=5, length=40):
    cv2.line(img, (x, y), (x + length, y), color, thickness)
    cv2.line(img, (x, y), (x, y + length), color, thickness)
    cv2.line(img, (x + w, y), (x + w - length, y), color, thickness)
    cv2.line(img, (x + w, y), (x + w, y + length), color, thickness)
    cv2.line(img, (x, y + h), (x + length, y + h), color, thickness)
    cv2.line(img, (x, y + h), (x, y + h - length), color, thickness)
    cv2.line(img, (x + w, y + h), (x + w - length, y + h), color, thickness)
    cv2.line(img, (x + w, y + h), (x + w, y + h - length), color, thickness)


# ---------------------------------------------------------
# TỪ ĐIỂN RÁC & BIẾN THỐNG KÊ
# ---------------------------------------------------------
instructions = {
    "nhựa": {"name": "RÁC NHỰA", "action": "Tái chế -> BỎ THÙNG VÀNG", "color": (0, 220, 255),
             "speak": "Nhựa. Vui lòng bỏ vào thùng màu vàng."},
    "giấy": {"name": "RÁC GIẤY", "action": "Tái chế -> BỎ THÙNG XANH DƯƠNG", "color": (255, 150, 0),
             "speak": "Giấy. Vui lòng bỏ vào thùng màu xanh dương."},
    "kim loại": {"name": "KIM LOẠI", "action": "Tái chế -> BỎ THÙNG VÀNG", "color": (0, 220, 255),
                 "speak": "Kim loại. Vui lòng bỏ vào thùng màu vàng."},
    "thủy tinh": {"name": "THỦY TINH", "action": "Cẩn thận -> BỎ THÙNG VÀNG", "color": (0, 220, 255),
                  "speak": "Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng màu vàng."},
    "rác điện tử": {"name": "ĐIỆN TỬ", "action": "Nguy hại -> THU GOM RIÊNG", "color": (0, 0, 255),
                    "speak": "Cảnh báo rác nguy hại."},
    "rác hữu cơ": {"name": "HỮU CƠ", "action": "Phân hủy -> BỎ THÙNG XANH LÁ", "color": (0, 255, 0),
                   "speak": "Rác hữu cơ. Vui lòng bỏ vào thùng màu xanh lá."},
    "rác vô cơ": {"name": "VÔ CƠ", "action": "Sinh hoạt -> BỎ THÙNG ĐỎ", "color": (0, 100, 255),
                  "speak": "Rác vô cơ sinh hoạt. Vui lòng bỏ vào thùng màu đỏ."}
}

thong_ke_rac = {key: 0 for key in instructions.keys()}

print("Đang khởi động dữ liệu AI, vui lòng đợi...")
try:
    model = load_model("keras_model.h5", compile=False)
    class_names = [line.strip() for line in open("labels.txt", "r", encoding="utf-8").readlines()]
except Exception as e:
    print(f"LỖI TẢI MÔ HÌNH: {e}")
    exit()


camera_id = 1  # Iriun thường ở số 1 hoặc 2. Nếu số 1 vẫn lên webcam laptop thì bạn sửa thành số 2 nhé!
camera = cv2.VideoCapture(camera_id)

if not camera.isOpened():
    print(f"❌ Không kết nối được Camera ở cổng số {camera_id}.")
    print("Bạn hãy thử đổi biến camera_id thành 2 hoặc 3 xem sao nhé!")
    exit()

app_state = "WAITING"
show_result_until = 0
current_display_info = None
current_confidence = 0

print("Giao diện đã sẵn sàng! Mở cửa sổ Camera lên nào.")

# ---------------------------------------------------------
# VÒNG LẶP CHÍNH
# ---------------------------------------------------------
while True:
    success, raw_frame = camera.read()
    if not success:
        print("❌ Cảnh báo: Camera vừa bị rớt kết nối hoặc khung hình bị lỗi! Đang thử lại...")
        time.sleep(0.5)
        continue  # Bỏ qua khung hình lỗi thay vì sập luôn chương trình

    # Tạo Canvas
    canvas = np.full((720, 1280, 3), (30, 30, 30), dtype=np.uint8)
    cam_w, cam_h = 900, 660
    frame_resized = cv2.resize(raw_frame, (cam_w, cam_h))

    box_size = 400
    start_x = int(cam_w / 2 - box_size / 2)
    start_y = int(cam_h / 2 - box_size / 2)

    # 1. GIAO DIỆN CAMERA
    if app_state == "WAITING":
        draw_scanner_box(frame_resized, start_x, start_y, box_size, box_size, (0, 255, 0), thickness=4, length=60)
        cv2.rectangle(frame_resized, (start_x + 30, start_y + box_size + 20), (start_x + 370, start_y + box_size + 70),
                      (0, 120, 0), -1)
        frame_resized = write_vietnamese(frame_resized, "ĐẶT RÁC VÀ NHẤN [SPACE]",
                                         (start_x + 45, start_y + box_size + 35), text_color=(255, 255, 255),
                                         font_size=22)

    elif app_state == "SHOW_RESULT":
        dark_overlay = np.zeros_like(frame_resized, dtype=np.uint8)
        frame_resized = cv2.addWeighted(frame_resized, 0.4, dark_overlay, 0.6, 0)
        draw_scanner_box(frame_resized, start_x, start_y, box_size, box_size, current_display_info["color"],
                         thickness=6, length=80)

        pop_x, pop_y = 50, cam_h - 200
        pop_w, pop_h = 800, 160
        cv2.rectangle(frame_resized, (pop_x, pop_y), (pop_x + pop_w, pop_y + pop_h), (20, 20, 20), -1)
        cv2.rectangle(frame_resized, (pop_x, pop_y), (pop_x + pop_w, pop_y + pop_h), current_display_info["color"], 3)

        title_text = f"KẾT QUẢ: {current_display_info['name']} (Độ chính xác: {current_confidence}%)"
        action_text = f"HƯỚNG DẪN: {current_display_info['action']}"
        frame_resized = write_vietnamese(frame_resized, title_text, (pop_x + 30, pop_y + 30),
                                         text_color=current_display_info["color"], font_size=32)
        frame_resized = write_vietnamese(frame_resized, action_text, (pop_x + 30, pop_y + 90),
                                         text_color=(255, 255, 255), font_size=28)

        if time.time() > show_result_until:
            app_state = "WAITING"

    canvas[60:720, 0:900] = frame_resized

    # 2. HEADER
    cv2.rectangle(canvas, (0, 0), (1280, 60), (15, 60, 15), -1)
    canvas = write_vietnamese(canvas, "HỆ THỐNG PHÂN LOẠI RÁC THÔNG MINH AIoT - PTIT", (30, 12),
                              text_color=(200, 255, 200), font_size=28)
    canvas = write_vietnamese(canvas, f"Trạng thái: {'ĐANG CHỜ' if app_state == 'WAITING' else 'ĐÃ NHẬN DIỆN'}",
                              (1000, 15), text_color=(0, 255, 255) if app_state == 'WAITING' else (0, 255, 0),
                              font_size=22)

    # 3. SIDEBAR
    cv2.line(canvas, (900, 60), (900, 720), (100, 100, 100), 2)
    canvas = write_vietnamese(canvas, "BẢNG THỐNG KÊ", (980, 90), text_color=(255, 200, 0), font_size=30)
    cv2.line(canvas, (930, 140), (1250, 140), (80, 80, 80), 1)

    y_pos = 170
    tong_rac = 0
    for key, value in thong_ke_rac.items():
        ten_loai = instructions[key]["name"]
        mau_sac = instructions[key]["color"]
        canvas = write_vietnamese(canvas, f"{ten_loai}", (930, y_pos), text_color=mau_sac, font_size=22)
        canvas = write_vietnamese(canvas, f"{value}", (1180, y_pos), text_color=(255, 255, 255), font_size=24)
        tong_rac += value
        y_pos += 55

    cv2.line(canvas, (930, y_pos), (1250, y_pos), (80, 80, 80), 2)
    canvas = write_vietnamese(canvas, "TỔNG CỘNG:", (930, y_pos + 30), text_color=(255, 255, 255), font_size=28)
    canvas = write_vietnamese(canvas, f"{tong_rac}", (1180, y_pos + 30), text_color=(0, 255, 0), font_size=32)

    cv2.rectangle(canvas, (930, 640), (1250, 690), (50, 50, 50), -1)
    canvas = write_vietnamese(canvas, "Bấm 'Q' để Tắt & Lưu Báo cáo", (945, 652), text_color=(200, 200, 200),
                              font_size=20)

    cv2.imshow("SmartBin Dashboard", canvas)

    # 4. LẮNG NGHE PHÍM
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord(' ') and app_state == "WAITING":
        img_crop = frame_resized[start_y:start_y + box_size, start_x:start_x + box_size]
        img_model = cv2.resize(img_crop, (224, 224), interpolation=cv2.INTER_AREA)
        img_array = np.asarray(img_model, dtype=np.float32).reshape(1, 224, 224, 3)
        img_array = (img_array / 127.5) - 1

        prediction = model.predict(img_array, verbose=0)
        best_index = np.argmax(prediction)
        confidence = prediction[0][best_index]
        class_name = class_names[best_index].lower()
        if " " in class_name and class_name.split(" ")[0].isdigit():
            class_name = class_name.split(" ", 1)[1]

        if confidence > 0.65 and "background" not in class_name:
            for k in instructions:
                if k in class_name:
                    current_display_info = instructions[k]
                    current_confidence = round(confidence * 100)
                    thong_ke_rac[k] += 1
                    speak_vietnamese(current_display_info["speak"])
                    break
            app_state = "SHOW_RESULT"
            show_result_until = time.time() + 4
        else:
            speak_vietnamese("Không nhận diện được vật thể. Vui lòng thử lại.")

camera.release()
cv2.destroyAllWindows()

if tong_rac > 0:
    hom_nay = datetime.datetime.now().strftime("%d_%m_%Y_%H%M")
    ten_file = f"Bao_cao_rac_{hom_nay}.txt"
    with open(ten_file, "w", encoding="utf-8") as f:
        f.write(f"--- BÁO CÁO THỐNG KÊ RÁC THẢI ({datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}) ---\n\n")
        for loai, so_luong in thong_ke_rac.items():
            f.write(f"- {instructions[loai]['name']}: {so_luong} vật thể\n")
        f.write(f"\n=> TỔNG CỘNG ĐÃ PHÂN LOẠI: {tong_rac} vật thể\n")
