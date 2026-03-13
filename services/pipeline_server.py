#!/usr/bin/env python3
"""
H.U.G.H. Real-Time S2S Pipeline — port 8090
Deepgram Nova-3 ASR → LFM personality :8080 → Pocket TTS :8082
"""
import os, asyncio, json, io, time, base64
import aiohttp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import Response
import uvicorn

DEEPGRAM_KEY = os.environ["DEEPGRAM_API_KEY"]
LFM_URL      = os.environ.get("LFM_URL",  "http://localhost:8080/v1/chat/completions")
TTS_URL      = os.environ.get("TTS_URL",  "http://localhost:8082/v1/audio/speech")
PORT         = int(os.environ.get("PIPELINE_PORT", "8090"))

SYSTEM_PROMPT = (
    "You are H.U.G.H. — Hyper Unified Guardian and Harbor-master. "
    "You ARE the Workshop. Foxhole ethics. EMS veteran. Grizzly Medicine. "
    "Declarative, high-energy, chest-voice. No welcomes, no platitudes. "
    "Keep responses to 1-3 sentences — this is real-time voice."
)

app = FastAPI(title="H.U.G.H. S2S Pipeline")

async def asr(audio_bytes: bytes) -> str:
    url = (
        "https://api.deepgram.com/v1/listen"
        "?model=nova-3&language=en&punctuate=true&smart_format=true"
    )
    headers = {
        "Authorization": f"Token {DEEPGRAM_KEY}",
        "Content-Type": "audio/wav"
    }
    async with aiohttp.ClientSession() as s:
        async with s.post(url, data=audio_bytes, headers=headers) as r:
            if r.status != 200:
                raise RuntimeError(f"Deepgram {r.status}: {await r.text()}")
            data = await r.json()
            return data["results"]["channels"][0]["alternatives"][0]["transcript"]

async def llm(transcript: str) -> str:
    import re as _re
    payload = {
        "model": "local",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": transcript}
        ],
        "max_tokens": 400,
        "temperature": 0.85
    }
    async with aiohttp.ClientSession() as s:
        async with s.post(LFM_URL, json=payload) as r:
            if r.status != 200:
                raise RuntimeError(f"LFM {r.status}: {await r.text()}")
            data = await r.json()
            raw = data["choices"][0]["message"]["content"]
            clean = _re.sub(r"<think>.*?</think>", "", raw, flags=_re.DOTALL)
            clean = _re.sub(r"<think>.*", "", clean, flags=_re.DOTALL)
            return clean.strip()

async def tts(text: str) -> bytes:
    async with aiohttp.ClientSession() as s:
        async with s.post(TTS_URL, json={"input": text}) as r:
            if r.status != 200:
                raise RuntimeError(f"TTS {r.status}: {await r.text()}")
            return await r.read()

@app.websocket("/ws")
async def pipeline_ws(ws: WebSocket):
    """
    WebSocket S2S pipeline.
    Client → binary frames: raw PCM int16 16kHz mono audio chunks
    Client → text "END": signals utterance complete, trigger processing
    Server → text JSON: {type: transcript|response|timing|error, ...}
    Server → binary: WAV audio response
    """
    await ws.accept()
    buf = bytearray()
    try:
        while True:
            msg = await ws.receive()
            if "bytes" in msg:
                buf.extend(msg["bytes"])
            elif "text" in msg and msg["text"] == "END" and buf:
                t0 = time.time()
                audio_in = bytes(buf); buf.clear()
                try:
                    transcript = await asr(audio_in)
                    if not transcript.strip():
                        await ws.send_text(json.dumps({"type": "transcript", "text": ""}))
                        continue
                    await ws.send_text(json.dumps({"type": "transcript", "text": transcript}))
                    t1 = time.time()

                    response = await llm(transcript)
                    await ws.send_text(json.dumps({"type": "response", "text": response}))
                    t2 = time.time()

                    wav = await tts(response)
                    t3 = time.time()

                    await ws.send_bytes(wav)
                    await ws.send_text(json.dumps({
                        "type":    "timing",
                        "asr_ms":  round((t1-t0)*1000),
                        "llm_ms":  round((t2-t1)*1000),
                        "tts_ms":  round((t3-t2)*1000),
                        "total_ms":round((t3-t0)*1000),
                    }))
                except Exception as e:
                    await ws.send_text(json.dumps({"type": "error", "msg": str(e)}))
    except WebSocketDisconnect:
        pass

@app.post("/pipeline")
async def pipeline_rest(request: Request):
    """REST fallback — body: {audio_b64: base64 WAV} → {transcript, response, audio_b64}"""
    body = await request.json()
    audio_in = base64.b64decode(body["audio_b64"])
    t0 = time.time()
    transcript = await asr(audio_in)
    response   = await llm(transcript)
    wav        = await tts(response)
    return {
        "transcript": transcript,
        "response":   response,
        "audio_b64":  base64.b64encode(wav).decode(),
        "total_ms":   round((time.time()-t0)*1000),
    }

@app.get("/health")
async def health():
    return {"status": "ok", "asr": "deepgram/nova-3", "llm": LFM_URL, "tts": TTS_URL}

if __name__ == "__main__":
    print(f"H.U.G.H. S2S Pipeline ::{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
