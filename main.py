# main.py
import cv2
import time
import os
import config
from utils import speak_vietnamese, export_report
from ai_core import SmartBinAI
from ui_manager import UIManager

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

def main():
    ai = SmartBinAI()
    ui = UIManager()
    
    thong_ke_rac = {key: 0 for key in config.INSTRUCTIONS.keys()}
    tong_rac = 0
    
    camera_id = 1 
    camera = cv2.VideoCapture(camera_id)

    app_state = "WAITING" 
    show_result_until = 0
    current_display_info = None
    current_confidence = 0
    current_bbox = None

    while True:
        success, raw_frame = camera.read()
        if not success:
            time.sleep(0.5)
            continue

        # Cập nhật Giao diện
        canvas = ui.draw_main_screen(
            raw_frame, app_state, current_display_info, 
            current_confidence, current_bbox, thong_ke_rac, tong_rac
        )
        
        cv2.imshow("Modern SmartBin UI - YOLOv8", canvas)

        if app_state == "SHOW_RESULT" and time.time() > show_result_until:
            app_state = "WAITING"

        # Lắng nghe phím bấm
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
            
        elif key == ord(' ') and app_state == "WAITING":
            # Đồng bộ khung hình Camera với thuật toán YOLO
            cam_w, cam_h = 840, 600
            frame_resized = cv2.resize(raw_frame, (cam_w, cam_h))
            
            # Đưa ảnh cho AI YOLO xử lý
            trash_type, conf, bbox = ai.predict_trash(frame_resized)

            if trash_type:
                current_display_info = config.INSTRUCTIONS[trash_type]
                current_confidence = conf
                current_bbox = bbox
                
                thong_ke_rac[trash_type] += 1
                tong_rac += 1
                
                speak_vietnamese(current_display_info["speak"])
                app_state = "SHOW_RESULT"
                show_result_until = time.time() + 4
            else:
                speak_vietnamese("Không nhận diện được rác. Vui lòng thử lại.")

    camera.release()
    cv2.destroyAllWindows()
    export_report(thong_ke_rac, tong_rac, config.INSTRUCTIONS)

if __name__ == "__main__":
    main()
