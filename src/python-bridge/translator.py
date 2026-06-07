"""
translator.py — SeamlessM4T (translate) + fastText (detect) + edge-tts (TTS)
Runs on :5002 inside the translator container.
MMS-300m lives in py-bridge (:5001) alongside Whisper.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import os, base64

app = FastAPI()

# ── SeamlessM4T v2 (text translation) ────────────────────────────────────────
from transformers import AutoProcessor, SeamlessM4Tv2Model

SEAMLESS_MODEL_ID = os.getenv("SEAMLESS_MODEL", "facebook/seamless-m4t-v2-large")
seamless_processor = AutoProcessor.from_pretrained(SEAMLESS_MODEL_ID)
seamless_model = SeamlessM4Tv2Model.from_pretrained(SEAMLESS_MODEL_ID)
seamless_model.eval()

# SeamlessM4T language code mapping
LANG_MAP: dict[str, str] = {
    "en": "eng", "zh": "cmn", "yue": "yue", "ms": "zsm",
    "ta": "tam", "hi": "hin", "ml": "mal", "pa": "pun",
}

# ── fastText (language identification) ───────────────────────────────────────
import fasttext

FASTTEXT_MODEL_PATH = os.getenv("FASTTEXT_MODEL_PATH", "/app/models/lid.176.bin")
ft_model = fasttext.load_model(FASTTEXT_MODEL_PATH) if os.path.exists(FASTTEXT_MODEL_PATH) else None

# ── edge-tts (neural TTS) ─────────────────────────────────────────────────────
import edge_tts

TTS_VOICE_MAP: dict[str, str] = {
    "en": "en-SG-WayneNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ms": "ms-MY-YasminNeural",
    "ta": "ta-SG-VenbaNeural",
    "hi": "hi-IN-SwaraNeural",
    "ml": "ml-IN-SobhanaNeural",
    "pa": "pa-IN-Ojaswineural",
}


class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


class DetectRequest(BaseModel):
    text: str


class TTSRequest(BaseModel):
    text: str
    language: str = "en"
    speech_rate: float = 1.0


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/translate")
def translate(req: TranslateRequest) -> dict:
    src = LANG_MAP.get(req.source_lang, req.source_lang)
    tgt = LANG_MAP.get(req.target_lang, req.target_lang)
    inputs = seamless_processor(text=req.text, src_lang=src, return_tensors="pt")
    with torch.no_grad():
        output_tokens = seamless_model.generate(**inputs, tgt_lang=tgt, generate_speech=False)
    translated = seamless_processor.decode(output_tokens[0].tolist()[0], skip_special_tokens=True)
    return {"translated_text": translated, "source_lang": req.source_lang, "target_lang": req.target_lang}


@app.post("/detect")
def detect_language(req: DetectRequest) -> dict:
    if ft_model is None:
        raise HTTPException(status_code=503, detail="fastText model not loaded")
    predictions = ft_model.predict(req.text.replace("\n", " "), k=1)
    label: str = predictions[0][0].replace("__label__", "")
    confidence: float = float(predictions[1][0])
    reverse_map = {"eng": "en", "cmn": "zh", "zsm": "ms", "tam": "ta"}
    lang = reverse_map.get(label, label)
    return {"language": lang, "confidence": confidence}


@app.post("/tts")
async def text_to_speech(req: TTSRequest) -> dict:
    voice = TTS_VOICE_MAP.get(req.language, "en-SG-WayneNeural")
    rate_pct = int((req.speech_rate - 1.0) * 100)
    rate_str = f"{rate_pct:+d}%"
    communicate = edge_tts.Communicate(req.text, voice, rate=rate_str)
    audio_chunks: list[bytes] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
    return {
        "audioBase64": base64.b64encode(b"".join(audio_chunks)).decode(),
        "mimeType": "audio/mpeg",
    }
