from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from PIL import Image
import imagehash
import pytesseract
import cv2
import numpy as np
import io
import os
import traceback  # Thêm thư viện này để in lỗi nếu sau này có sự cố

app = FastAPI()

# Cấu hình đường dẫn Tesseract OCR cho Windows
tesseract_path = os.getenv('TESSERACT_PATH', '').strip()
default_tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if tesseract_path and os.path.isfile(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path
elif os.path.isfile(default_tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = default_tesseract_path

@app.post("/api/analyze-proof")
async def analyze_proof(
    proof_image: UploadFile = File(...),
    mssv: str = Form(""),
    student_name: str = Form(""),
    event_name: str = Form("")
):
    try:
        # Đọc dữ liệu ảnh từ request
        contents = await proof_image.read()
        
        # ==========================================
        # 1. TÍNH TOÁN MÃ BĂM ẢNH (pHash)
        # ==========================================
        pil_img = Image.open(io.BytesIO(contents))
        # Tạo mã băm 16-bit (tương đương với Node.js)
        calculated_hash = str(imagehash.phash(pil_img, hash_size=16))
        
        # ==========================================
        # 2. TIỀN XỬ LÝ ẢNH BẰNG OPENCV ĐỂ TĂNG ĐỘ NÉT CHO OCR
        # ==========================================
        # Chuyển bytes sang mảng numpy cho OpenCV (Dùng bytearray để nhân bản vùng nhớ an toàn)
        nparr = np.frombuffer(bytearray(contents), np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if cv_img is None:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Định dạng ảnh không hợp lệ hoặc OpenCV không đọc được."})
        
        # Chuyển ảnh sang ảnh xám (Grayscale)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        # Tăng độ tương phản (Thresholding) giúp OCR đọc chữ đen nền trắng cực chuẩn
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
        
        # ==========================================
        # 3. TRÍCH XUẤT CHỮ BẰNG TESSERACT OCR
        # ==========================================
        # Quét chữ với thư viện ngôn ngữ Tiếng Việt + Tiếng Anh
        extracted_text = pytesseract.image_to_string(thresh, lang='vie+eng').lower()
        
        # ==========================================
        # 4. CHẤM ĐIỂM ĐỘ KHỚP (MATCHING SCORE)
        # ==========================================
        match_score = 0
        max_score = 3
        missing_fields = []
        
        # Tiêu chí 1: Tìm MSSV
        if mssv and mssv.lower() in extracted_text:
            match_score += 1
        else:
            missing_fields.append("MSSV")
            
        # Tiêu chí 2: Tìm Tên sinh viên (Tìm chữ cuối cùng của tên)
        if student_name:
            name_parts = student_name.lower().split()
            if name_parts:
                last_name = name_parts[-1]
                if last_name in extracted_text:
                    match_score += 1
                else:
                    missing_fields.append("Tên")
            else:
                missing_fields.append("Tên")
                    
        # Tiêu chí 3: Tìm Tên Sự Kiện (Lấy các từ khóa dài hơn 4 ký tự)
        if event_name:
            keywords = [w for w in event_name.lower().split() if len(w) > 4]
            if keywords and any(kw in extracted_text for kw in keywords):
                match_score += 1
            else:
                missing_fields.append("Tên Sự Kiện")
                
        # Tính phần trăm độ khớp văn bản
        ocr_match_percent = round((match_score / max_score) * 100) if max_score > 0 else 0
        
        # ==========================================
        # 5. TÍCH HỢP: TỰ ĐỘNG PHÂN LOẠI THÔNG MINH CHO SETTINGS / PROOFAPPROVAL
        # ==========================================
        if ocr_match_percent >= 66:
            ai_note = "Hợp lệ: Khớp thông tin cá nhân"
        elif ocr_match_percent > 0:
            ai_note = f"Khớp một phần (Không tìm thấy chữ: {', '.join(missing_fields)})"
        else:
            # Giải pháp cho việc chụp bối cảnh hội trường, chụp máy tính, không ép lỗi trượt oan sinh viên
            ai_note = "Minh chứng dạng ảnh chụp bối cảnh / màn hình (Cần đối soát mắt)"
        
        return JSONResponse(content={
            "status": "success",
            "image_hash": calculated_hash,
            "ocr_match_percent": ocr_match_percent,
            "ai_note": ai_note
        })
        
    except Exception as e:
        # In lỗi chi tiết ra màn hình terminal của Python (nếu có crash ngầm xảy ra)
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": f"Lỗi nội bộ AI: {str(e)}"})