"""
transcriber.py — Whisper large-v3 (standard STT) + MMS-300m (low-resource dialect STT)
Runs on :5001 inside the py-bridge container.
"""
from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel
import torch
import torchaudio
import tempfile, os

app = FastAPI()

# ── Whisper large-v3 (standard languages) ────────────────────────────────────
from transformers import pipeline as hf_pipeline

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "openai/whisper-large-v3")
whisper_pipe = hf_pipeline(
    "automatic-speech-recognition",
    model=WHISPER_MODEL,
    chunk_length_s=30,
    device=0 if torch.cuda.is_available() else -1,
)

# ── MMS-300m (low-resource dialects: hokkien/teochew/hakka/hainanese/javanese) ─
from transformers import Wav2Vec2ForCTC, AutoTokenizer

MMS_MODEL = os.getenv("MMS_MODEL", "facebook/mms-300m")
mms_tokenizer = AutoTokenizer.from_pretrained(MMS_MODEL)
mms_model = Wav2Vec2ForCTC.from_pretrained(MMS_MODEL)
mms_model.eval()

# MMS language codes for each dialect
MMS_LANG_MAP: dict[str, str] = {
    "zh-hok": "nan",   # Southern Min (Hokkien/Teochew)
    "zh-teo": "nan",
    "zh-hak": "hak",   # Hakka
    "zh-hai": "nan",   # Hainanese (closest: Southern Min)
    "ms-jav": "jav",   # Javanese
}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)) -> dict:
    """Whisper large-v3: handles English, Mandarin, Malay, Tamil and other standard languages."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        result = whisper_pipe(tmp_path, return_timestamps=False)
        text: str = result["text"] if isinstance(result, dict) else str(result)
    finally:
        os.unlink(tmp_path)

    return {"text": text.strip(), "language": "auto", "confidence": 0.95}


@app.post("/transcribe-dialect")
async def transcribe_dialect(
    audio: UploadFile = File(...),
    dialect: str = Form(default="zh-hok"),
) -> dict:
    """MMS-300m: handles low-resource dialects Whisper cannot cover reliably."""
    mms_lang = MMS_LANG_MAP.get(dialect, "nan")
    mms_tokenizer.set_target_lang(mms_lang)
    mms_model.load_adapter(mms_lang)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        waveform, sample_rate = torchaudio.load(tmp_path)
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)
        waveform = waveform.squeeze()
        inputs = mms_tokenizer(waveform, sampling_rate=16000, return_tensors="pt")
        with torch.no_grad():
            logits = mms_model(**inputs).logits
        predicted_ids = torch.argmax(logits, dim=-1)
        text = mms_tokenizer.batch_decode(predicted_ids)[0]
    finally:
        os.unlink(tmp_path)

    return {"text": text.strip(), "language": dialect, "confidence": 0.85}
