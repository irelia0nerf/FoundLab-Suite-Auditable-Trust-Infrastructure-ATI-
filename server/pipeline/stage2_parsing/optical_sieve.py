from abc import ABC, abstractmethod
import numpy as np
import cv2
import pytesseract
import sys
import os
from pathlib import Path
from ...core.umbrella import UmbrellaKMS
from ...pipeline.stage4_veritas.veritas_observer import VeritasObserver
import gc

class IOpticalEngine(ABC):
    """Interface para Engines de OCR (Tesseract, NVIDIA NIM, Google Vision)."""
    @abstractmethod
    def extract_text(self, image: np.ndarray) -> str:
        pass

class TesseractEngine(IOpticalEngine):
    def __init__(self):
        self.tessdata_path = self._get_tessdata_directory_path()
    
    def _get_tessdata_directory_path(self):
        env_root = Path(sys.executable).parent.parent
        share_dir = os.path.join(env_root, "share", "tessdata")
        if not os.path.exists(share_dir): return None
        return str(share_dir)

    def extract_text(self, image: np.ndarray) -> str:
        tess_config = rf'--tessdata-dir "{self.tessdata_path}"' if self.tessdata_path else ''
        return pytesseract.image_to_string(image, config=tess_config)

class OpticalSieve:
    """
    Processa dados visuais em ambientes de memória isolada (Zero-Persistence).
    Usa Strategy Pattern para trocar a engine de OCR.
    """
    def __init__(self, engine: IOpticalEngine = None):
        self.veritas = VeritasObserver()
        self.umbrella = UmbrellaKMS()
        self.engine = engine if engine else TesseractEngine()

    def _deskew(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bitwise_not(gray)
        coords = np.column_stack(np.where(gray > 0))
        angle = cv2.minAreaRect(coords)[-1]
        angle = -(90 + angle) if angle < -45 else -angle
        center = (image.shape[1] // 2, image.shape[0] // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(image, M, (image.shape[1], image.shape[0]), flags=cv2.INTER_CUBIC)

    def process_securely(self, pages) -> str:
        raw_plaintext = None
        full_text = []
        
        try:
            for p, page in enumerate(pages):
                if p >= 3: break
                
                img_array = np.array(page)
                deskewed = self._deskew(img_array)
                
                # Usa a Engine injetada
                text = self.engine.extract_text(deskewed)
                full_text.append(text)
                
                del img_array
                del deskewed
            
            raw_plaintext = " ".join(full_text)
            
            encrypted_package = self.umbrella.encrypt_payload(raw_plaintext)
            
            import hashlib
            audit_hash = hashlib.sha256(encrypted_package['ciphertext'].encode()).hexdigest()
            trace_id = self.veritas.emit_log("DOCUMENT_DIGITIZATION", audit_hash)

            import json
            import datetime
            result = json.dumps({
                "trace_id": trace_id,
                "umbrella_ref": encrypted_package,
                "status": "SECURE_ARCHIVED",
                "timestamp": datetime.datetime.now().isoformat()
            })

            return result

        except Exception as e:
            self.veritas.emit_log("SECURITY_EXCEPTION", str(e))
            raise e
        finally:
            if raw_plaintext is not None: del raw_plaintext
            if 'full_text' in locals(): del full_text
            gc.collect()
