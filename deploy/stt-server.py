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
PORT = int(os.environ.get("STT_PORT", "3002"))

app = Flask(__name__)
_lock = threading.Lock()  # 2-core box — serialise transcriptions

print(f"[stt] loading whisper model '{MODEL_NAME}' (first run downloads it)...", flush=True)
t0 = time.time()
from faster_whisper import WhisperModel

model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8", cpu_threads=2)
print(f"[stt] model loaded in {time.time() - t0:.1f}s", flush=True)


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})


@app.post("/transcribe")
def transcribe():
    audio = request.get_data()
    if not audio:
        return jsonify({"error": "empty body"}), 400
    t = time.time()
    with _lock:
        # vad_filter trims silence, which is also what makes Whisper hallucinate
        # stock captions ("thank you for watching") — so it doubles as a gibberish guard.
        segments, info = model.transcribe(io.BytesIO(audio), beam_size=1, vad_filter=True)
        segs = list(segments)
    text = " ".join(s.text.strip() for s in segs).strip()
    # avg_logprob → rough 0-1 confidence
    conf = math.exp(sum(s.avg_logprob for s in segs) / len(segs)) if segs else 0.0
    print(
        f"[stt] {len(audio)}B -> {len(text)} chars lang={info.language}"
        f" p={info.language_probability:.2f} conf={conf:.2f} in {time.time() - t:.1f}s",
        flush=True,
    )
    return jsonify({"text": text, "language": info.language, "confidence": round(conf, 3)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, threaded=True)
