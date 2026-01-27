import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import sys
import os

# Add server directory to path to handle imports if run directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.umbrella import UmbrellaKMS
from pipeline.stage4_veritas.veritas_observer import VeritasObserver

app = FastAPI(
    title="FoundLab Suite Trust Engine",
    description="Zero-Persistence Auditable Trust Infrastructure API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Services
# Note: In a production app, these might be singletons or dependency injected
veritas = VeritasObserver()
umbrella = UmbrellaKMS()

class AuditLogRequest(BaseModel):
    action: str
    data_hash: str
    metadata: Optional[Dict[str, Any]] = None

class EncryptRequest(BaseModel):
    plaintext: str

@app.get("/")
async def root():
    return {
        "system": "FoundLab Trust Engine",
        "status": "operational",
        "protocol": "Veritas 2.0"
    }

@app.post("/veritas/log")
async def log_audit_event(request: AuditLogRequest):
    """
    Logs an event to the Veritas Observer immutable ledger (Black-Chain).
    """
    try:
        # Commit to Veritas Black-Chain
        # The emit_log method currently returns the lock_hash
        lock_hash = veritas.emit_log(request.action, request.data_hash)
        
        return {
            "status": "committed", 
            "lock_hash": lock_hash,
            "chain_index": veritas._chain_index
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/umbrella/encrypt")
async def encrypt_data(request: EncryptRequest):
    """
    Encrypts sensitive data using Umbrella KMS.
    Ensures plaintext is handled only in-memory and returns ciphertext.
    """
    try:
        result = umbrella.encrypt_payload(request.plaintext)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
