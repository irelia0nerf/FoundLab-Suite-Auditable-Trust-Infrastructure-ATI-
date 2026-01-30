from dataclasses import dataclass
import hashlib
import datetime
import json

@dataclass
class BlackChainLink:
    """
    Representa um bloco na Tabela de Auditoria Sequencial-Black-Chain.
    Cada link contém o hash do link anterior, garantindo imutabilidade.
    """
    index: int
    timestamp: str
    actor_hash: str
    action_type: str
    artifact_signature: str
    previous_hash: str
    lock_hash: str  # Hash deste bloco (Current Hash)

class VeritasObserver:
    """
    Observer que garante que nenhuma ação passe sem registro.
    Implementa Hash-Chaining para auditoria absoluta.
    Ref: Umbrella/Pilares Centrais/Protocolo Veritas
    """
    
    # Simulação de Estado da Cadeia (Em produção, viria do BigQuery/Ledger)
    _chain_tip_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    _chain_index = 0
    _chain_history = []

    def get_chain(self):
        return VeritasObserver._chain_history

    def emit_log(self, action: str, data_hash: str) -> str:
        # 1. Calcular Timestamp
        ts = datetime.datetime.now().isoformat()
        
        # 2. Recuperar Hash Anterior (Previous Block Hash)
        prev_hash = VeritasObserver._chain_tip_hash
        
        # 3. Construir Payload para Hashing (LockHash)
        # LockHash = SHA256(Index + Timestamp + Actor + Action + Artifact + PrevHash)
        payload_to_hash = f"{VeritasObserver._chain_index}{ts}SYSTEM_OCR_WORKER{action}{data_hash}{prev_hash}"
        lock_hash = hashlib.sha256(payload_to_hash.encode()).hexdigest()
        
        # 4. Criar o Link
        link = BlackChainLink(
            index=VeritasObserver._chain_index,
            timestamp=ts,
            actor_hash="SYSTEM_OCR_WORKER",
            action_type=action,
            artifact_signature=data_hash,
            previous_hash=prev_hash,
            lock_hash=lock_hash
        )
        
        # 5. Atualizar Estado da Cadeia (Simulado)
        VeritasObserver._chain_tip_hash = lock_hash
        VeritasObserver._chain_index += 1
        VeritasObserver._chain_history.append(link.__dict__)
        
        # 6. Emitir Log Estruturado
        print(f"[VERITAS BLACK-CHAIN]: {json.dumps(link.__dict__)}")
        
        # Retorna o LockHash como Trace ID
        return lock_hash
