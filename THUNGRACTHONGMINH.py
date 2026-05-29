import cv2
import numpy as np
from keras.models import load_model
import os
import threading
from gtts import gTTS
import pygame
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------
# CẤU HÌNH HỆ THỐNG
# ---------------------------------------------------------
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Khởi tạo loa để đọc Tiếng Việt
pygame.mixer.init()


# ---------------------------------------------------------
# HÀM HỖ TRỢ HIỂN THỊ TIẾNG VIỆT
# ---------------------------------------------------------
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


# ---------------------------------------------------------
# HÀM HỖ TRỢ GIỌNG NÓI AI
# ---------------------------------------------------------
def speak_vietnamese(text):
    def run_speech():
        try:
            tts = gTTS(text=text, lang='vi')
            fp = BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            pygame.mixer.music.load(fp)
            pygame.mixer.music.play()
        except Exception as e:
            pass

    if not pygame.mixer.music.get_busy():
        threading.Thread(target=run_speech, daemon=True).start()


# ---------------------------------------------------------
# KHỞI TẠO NÃO BỘ AI
# ---------------------------------------------------------
print("Đang khởi động não bộ AI, vui lòng đợi vài giây...")

try:
    model = load_model("keras_model.h5", compile=False)
    class_names = [line.strip() for line in open("labels.txt", "r", encoding="utf-8").readlines()]
    print("Tải mô hình thành công!")
except Exception as e:
    # Đoạn này sẽ báo rõ lỗi nếu file bị hỏng hoặc sai định dạng
    print(f"LỖI TẢI MÔ HÌNH: {e}")
    print("Khả năng cao file keras_model.h5 tải từ Git bị hỏng. Hãy lấy file gốc từ file .zip dán đè vào nhé!")
    exit()

# Cài đặt Camera
camera_id = 1
camera = cv2.VideoCapture(camera_id)

if not camera.isOpened():
    print(f"Không thể kết nối với Camera số {camera_id}. Hãy thử đổi số thành 0 hoặc 2.")
    exit()

# ---------------------------------------------------------
# TỪ ĐIỂN RÁC
# ---------------------------------------------------------
instructions = {
    "nhựa": {"name": "NHỰA", "action": "TÁI CHẾ - Bỏ vào thùng VÀNG", "color": (0, 255, 255),
             "speak": "Nhựa. Vui lòng ép bẹp và bỏ vào thùng màu vàng."},
    "giấy": {"name": "GIẤY", "action": "TÁI CHẾ - Bỏ vào thùng XANH", "color": (255, 100, 0),
             "speak": "Giấy. Vui lòng bỏ vào thùng màu xanh dương."},
    "kim loại": {"name": "KIM LOẠI", "action": "TÁI CHẾ - Bỏ vào thùng VÀNG", "color": (0, 255, 255),
                 "speak": "Kim loại. Vui lòng bỏ vào thùng màu vàng."},
    "thủy tinh": {"name": "THỦY TINH", "action": "TÁI CHẾ - Bỏ vào thùng VÀNG", "color": (0, 255, 255),
                  "speak": "Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng màu vàng."},
    "rác điện tử": {"name": "ĐIỆN TỬ", "action": "NGUY HẠI - Thu gom riêng", "color": (0, 0, 255),
                    "speak": "Cảnh báo rác nguy hại. Vui lòng đưa đến điểm thu gom đồ điện tử."},
    "rác hữu cơ": {"name": "HỮU CƠ", "action": "PHÂN HỦY - Bỏ thùng XANH LÁ", "color": (0, 255, 0),
                   "speak": "Rác hữu cơ. Vui lòng bỏ vào thùng màu xanh lá."},
    "rác vô cơ": {"name": "VÔ CƠ", "action": "SINH HOẠT - Bỏ thùng ĐỎ", "color": (0, 165, 255),
                  "speak": "Rác vô cơ sinh hoạt. Vui lòng bỏ vào thùng màu đỏ."}
}

last_spoken_class = ""

print("Hệ thống phân loại rác thông minh AIoT đã sẵn sàng!")

# ---------------------------------------------------------
# VÒNG LẶP CHÍNH
# ---------------------------------------------------------
while True:
    success, frame = camera.read()
    if not success:
        break

    height, width = frame.shape[:2]

    # Khung lấy nét ở giữa
    box_size = 400
    start_y = max(0, int(height / 2 - box_size / 2))
    start_x = max(0, int(width / 2 - box_size / 2))

    img_crop = frame[start_y:start_y + box_size, start_x:start_x + box_size]
    img_resized = cv2.resize(img_crop, (224, 224), interpolation=cv2.INTER_AREA)
    img_array = np.asarray(img_resized, dtype=np.float32).reshape(1, 224, 224, 3)
    img_array = (img_array / 127.5) - 1

    cv2.rectangle(frame, (start_x, start_y), (start_x + box_size, start_y + box_size), (255, 255, 255), 2)

    prediction = model.predict(img_array, verbose=0)
    best_index = np.argmax(prediction)
    confidence_score = prediction[0][best_index]

    class_name = class_names[best_index].lower()
    if " " in class_name and class_name.split(" ")[0].isdigit():
        class_name = class_name.split(" ", 1)[1]

    if confidence_score > 0.85 and "background" not in class_name:
        display_info = {"name": "KHÔNG XÁC ĐỊNH", "action": "Chưa có thông tin", "color": (255, 255, 255), "speak": ""}
        for key in instructions:
            if key in class_name:
                display_info = instructions[key]
                break

        cv2.rectangle(frame, (start_x, start_y), (start_x + box_size, start_y + box_size), display_info["color"], 4)
        cv2.rectangle(frame, (0, 0), (width, 90), (0, 0, 0), -1)

        text_name = f"Vật thể: {display_info['name']} ({round(confidence_score * 100)}%)"
        text_action = f"Xử lý: {display_info['action']}"

        frame = write_vietnamese(frame, text_name, (20, 15), text_color=display_info["color"], font_size=32)
        frame = write_vietnamese(frame, text_action, (20, 55), text_color=(255, 255, 255), font_size=24)

        if class_name != last_spoken_class:
            speak_vietnamese(display_info["speak"])
            last_spoken_class = class_name

    else:
        last_spoken_class = "background"
        frame = write_vietnamese(frame, "Đang quét môi trường...", (20, 20), text_color=(200, 200, 200), font_size=28)

    cv2.imshow("SmartBin AIoT - PTIT Pro", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

camera.release()
cv2.destroyAllWindows()