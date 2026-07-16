#!/usr/bin/env python3
"""Local speech-to-text service — self-hosted Whisper (faster-whisper).

HF's serverless Whisper goes through hours-long stretches of 504s, which made
voice notes randomly fail. This runs openai/whisper `small` (multilingual:
en/zh/ms/ta/hi/...) locally on CPU so STT no longer depends on HF availability.
The Node backend calls this first and only falls back to HF if this is down.

  POST /transcribe   raw audio bytes (ogg/opus/mp3/wav — any ffmpeg format)
                     → {"text": ..., "language": ..., "confidence": ...}
  GET  /health       → {"status": "ok", "model": ...}

Run under pm2 (see ecosystem/pm2 start):
  /opt/pulse-stt/venv/bin/python deploy/stt-server.py
"""
import io
import math
import os
import threading
import time

from flask import Flask, jsonify, request

MODEL_NAME = os.environ.get("STT_MODEL", "small")
# Second-tier model, rerun only when the fast model looks unsure. large-v3-turbo fixed
# every fast-model failure seen live (Singaporean-accented English detected as Malay,
# 公积金 transcribed as the homophone 攻击金) at ~26s per note on this 2-core box —
# too slow to run always, fine as the doubt path.
ACCURATE_MODEL_NAME = os.environ.get("STT_ACCURATE_MODEL", "large-v3-turbo")
# Fast-model result is accepted only when BOTH its language ID and its transcription
# look confident. Live calibration: good notes score p>=0.93/conf>=0.8; the misdetected
# Malay one scored p=0.86/conf=0.49.
LANG_PROB_MIN = float(os.environ.get("STT_LANG_PROB_MIN", "0.90"))
CONF_MIN = float(os.environ.get("STT_CONF_MIN", "0.60"))
PORT = int(os.environ.get("STT_PORT", "3002"))

app = Flask(__name__)
_lock = threading.Lock()  # 2-core box — serialise transcriptions

print(f"[stt] loading whisper models '{MODEL_NAME}' + '{ACCURATE_MODEL_NAME}' (first run downloads them)...", flush=True)
t0 = time.time()
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=2)
accurate_model = (
    WhisperModel(ACCURATE_MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=2)
    if ACCURATE_MODEL_NAME
    else None
)
print(f"[stt] models loaded in {time.time() - t0:.1f}s", flush=True)


def _run(m, wav):
    segments, info = m.transcribe(wav, beam_size=1, vad_filter=True)
    segs = list(segments)
    text = " ".join(s.text.strip() for s in segs).strip()
    # avg_logprob → rough 0-1 confidence
    conf = math.exp(sum(s.avg_logprob for s in segs) / len(segs)) if segs else 0.0
    speech_sec = getattr(info, "duration_after_vad", None)
    return text, info.language, info.language_probability, conf, speech_sec


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME, "accurate_model": ACCURATE_MODEL_NAME})


@app.post("/transcribe")
def transcribe():
    audio = request.get_data()
    if not audio:
        return jsonify({"error": "empty body"}), 400
    t = time.time()
    with _lock:
        wav = decode_audio(io.BytesIO(audio))
        # vad_filter trims silence, which is also what makes Whisper hallucinate
        # stock captions ("thank you for watching") — so it doubles as a gibberish guard.
        text, lang, lang_prob, conf, speech_sec = _run(model, wav)
        used = MODEL_NAME
        # Doubt path: unsure language, unsure words, or nothing decoded → the accurate
        # model decides. Skipped when VAD found no actual speech (true silence) — no
        # point spending ~26s of turbo on an empty recording.
        no_speech = speech_sec is not None and speech_sec < 0.5
        if accurate_model is not None and not no_speech and (lang_prob < LANG_PROB_MIN or conf < CONF_MIN or not text):
            print(
                f"[stt] fast pass unsure (lang={lang} p={lang_prob:.2f} conf={conf:.2f}"
                f" chars={len(text)}) -> rerunning with {ACCURATE_MODEL_NAME}",
                flush=True,
            )
            text, lang, lang_prob, conf, speech_sec = _run(accurate_model, wav)
            used = ACCURATE_MODEL_NAME
    print(
        f"[stt] {len(audio)}B -> {len(text)} chars model={used} lang={lang}"
        f" p={lang_prob:.2f} conf={conf:.2f} in {time.time() - t:.1f}s",
        flush=True,
    )
    return jsonify({"text": text, "language": lang, "confidence": round(conf, 3), "model": used})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, threaded=True)
