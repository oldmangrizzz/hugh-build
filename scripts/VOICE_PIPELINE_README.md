# H.U.G.H. Voice Training Pipeline

## Overview

Fine-tune LFM2.5-Audio-1.5B to give H.U.G.H. a natural, authoritative voice
with Scottish heritage undertones — NOT cloning any single actor, but defining
the *emotional space* Hugh's voice lives in.

### Three-Reference Voice Profile

Hugh has two registers, one person:

| Mode | Reference Actor | Description |
|------|----------------|-------------|
| **Day Mode** | Ewan McGregor (interviews, not characters) | Warm, genuinely friendly, quick wit, easy laugh. Natural Scottish cadence — not performed. The colleague you'd trust with your coffee and your life. |
| **Storm Mode** | Liam Neeson (*Taken* register) | Temperature drops. Every word surgical. Not angry — *certain*. "I will find you" energy. EMS veteran who's seen the worst and knows exactly what to do. |
| **Depth/Authority** | Stellan Skarsgård (Cerdic in *King Arthur*) | Tectonic plates shifting. Deep, deliberate, Scandinavian edge. Commands without raising volume. The harbor master who IS the room. |

**Critical**: These are all *real Scottish/Irish/Scandinavian men being themselves*.
This is lineage (Clan Munro — Scottish/Irish/German/Scandinavian), not a costume.
We are NOT building a parody accent. We're defining emotional range.

---

## Pipeline Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Raw Audio       │────▶│ prepare_voice_   │────▶│ Training Data   │
│  (interviews,    │     │ data.py          │     │ manifest.jsonl  │
│   public talks)  │     │ - mono 24kHz     │     │ + wavs/         │
│                  │     │ - normalize      │     │                 │
│                  │     │ - split 6-15s    │     │                 │
│                  │     │ - transcribe     │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────┐
                                               │ leap-finetune    │
                                               │ + LoRA config    │
                                               │ (voice_training_ │
                                               │  config.yaml)    │
                                               └────────┬─────────┘
                                                        │
                                                        ▼
                                               ┌──────────────────┐
                                               │ Fine-tuned       │
                                               │ LoRA adapter     │
                                               │ (~50-100MB)      │
                                               └────────┬─────────┘
                                                        │
                                                        ▼
                                               ┌──────────────────┐
                                               │ H.U.G.H. Runtime │
                                               │ LFM2.5-Audio +   │
                                               │ LoRA merged      │
                                               └──────────────────┘
```

---

## Quick Start

### Step 1: Collect Audio

Place raw audio files in a directory. Supported formats: WAV, MP3, M4A, FLAC, OGG.

```bash
mkdir -p raw_audio
# Place your audio files here
```

### Step 2: Prepare Training Data

```bash
# Install dependencies
pip install pydub soundfile numpy tqdm openai-whisper

# Run the preparation pipeline
python scripts/prepare_voice_data.py ./raw_audio \
    --output ./voice_training_data \
    --transcribe \
    --whisper-model base
```

This will:
- Convert to mono 24kHz WAV (LFM2.5 native rate)
- Normalize loudness to -20 dBFS
- Split at natural silence breaks into 6-15 second segments
- Auto-transcribe with Whisper
- Generate `manifest.jsonl` (leap-finetune SFT format) and `metadata.csv`

### Step 3: Verify Transcripts

**CRITICAL**: Manually review `voice_training_data/manifest.jsonl`.
Fix any transcription errors — bad alignment = bad voice output.

### Step 4: Set Up leap-finetune

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone leap-finetune
git clone https://github.com/Liquid4All/leap-finetune.git
cd leap-finetune
uv sync
```

### Step 5: Train

```bash
uv run leap-finetune /path/to/hugh-build/scripts/voice_training_config.yaml
```

### Step 6: Deploy

```bash
# Bundle checkpoint for LEAP
uv run leap-bundle outputs/sft/hugh-voice-gleeson-lora/

# Test with Gradio demo
pip install liquid-audio[demo]
liquid-audio-demo  # Load checkpoint in the demo UI
```

---

## Data Requirements

| Metric | Minimum Viable | Recommended | Ideal |
|--------|---------------|-------------|-------|
| Total audio | 15-20 min | 1-2 hours | 3-5 hours |
| Segments | 100-150 | 500-800 | 1000-2000 |
| Segment length | 6-15 sec | 8-12 sec | 8-12 sec |
| Sample rate | 24kHz | 24kHz | 24kHz |
| Format | WAV mono 16-bit | WAV mono 16-bit | WAV mono 16-bit |
| Noise floor | < -30 dB | < -40 dB | < -50 dB |
| Transcription accuracy | 90%+ | 98%+ | 99%+ |

### Audio Quality Checklist

- [ ] Single speaker only (no overlapping voices)
- [ ] Minimal background noise (no music, traffic, HVAC)
- [ ] Consistent recording quality (same mic/environment preferred)
- [ ] Diverse phonetic content (not just one topic/tone)
- [ ] Natural speech (not read from a script, if possible)
- [ ] Include emotional range (serious, warm, commanding, reflective)

---

## Compute Requirements

| Hardware | VRAM | Batch Size | Est. Time (1hr data) | Cost |
|----------|------|------------|---------------------|------|
| 1x H100 80GB | 80GB | 2-4 | 30-60 min | ~$2-3 |
| 1x A100 80GB | 80GB | 2 | 45-90 min | ~$2-3 |
| 1x A100 40GB | 40GB | 1 | 60-120 min | ~$1.50 |
| 1x A6000 48GB | 48GB | 1-2 | 60-120 min | ~$1-2 |

**Minimum**: 1x GPU with 40GB+ VRAM (LoRA makes this possible).

**LoRA advantage**: Full fine-tuning needs 2-4x more VRAM. LoRA trains only ~2-5%
of parameters, producing a ~50-100MB adapter file instead of a 6GB full checkpoint.

### Compute Providers

| Provider | GPU | Price/hr | Notes |
|----------|-----|----------|-------|
| HuggingFace Spaces Pro | A100 | ~$2 | Easy setup, integrated |
| RunPod | H100 spot | ~$2 | Best price/performance |
| Lambda Labs | H100 | ~$2.50 | Reliable, fast spin-up |
| Google Colab Pro+ | A100 | ~$0.50 | Cheapest, less reliable |
| Vast.ai | A100/H100 | ~$1-2 | Community GPUs, variable |

---

## Public Reference Sources

These are **public appearances** (interviews, talk shows, podcasts) where
reference actors' natural speaking voices are clearly captured. The operator
downloads/extracts audio, then runs prepare_voice_data.py.

### Day Mode — Ewan McGregor (Interviews)

Natural Scottish warmth, friendly energy, unhurried cadence.

1. **Graham Norton Show appearances** (multiple years)
   - Search: "Ewan McGregor Graham Norton" on YouTube
   - Clean studio audio, relaxed conversational tone
   - Est. usable audio: 15-25 min across appearances

2. **Hot Ones Interview (2023)**
   - Search: "Ewan McGregor Hot Ones"
   - Long-form, diverse emotional range (laughing through pain)
   - Est. usable audio: 15-20 min

3. **Actors on Actors (Variety) — with various co-stars**
   - Professional recording, extended conversation
   - Est. usable audio: 10-15 min

### Storm Mode — Liam Neeson (Interviews)

When the warmth goes quiet and the focus goes to a razor's edge.

4. **Inside the Actors Studio — Liam Neeson**
   - Deep career retrospective, shifts between warm and intense
   - Est. usable audio: 20-30 min

5. **Graham Norton appearances** (multiple years)
   - Clean audio, shows natural register shifts
   - Est. usable audio: 15-20 min

6. **60 Minutes / CBS Interviews**
   - Professional broadcast audio, reflective tone
   - Est. usable audio: 10-15 min

### Depth/Authority — Stellan Skarsgård (Interviews)

Tectonic depth, Scandinavian precision, unhurried authority.

7. **Dune press tour interviews (2021-2024)**
   - Search: "Stellan Skarsgård Dune interview"
   - Studio quality, measured delivery
   - Est. usable audio: 15-20 min

8. **Podcast appearances** (various)
   - Search: "Stellan Skarsgård podcast"
   - Long-form, natural speech patterns
   - Est. usable audio: 10-20 min

9. **The Late Late Show / European talk shows**
   - Est. usable audio: 10-15 min

### Estimated Total Usable Audio: 120-200 minutes

This exceeds the recommended 1-2 hours for LoRA voice fine-tuning.
Use all three actors to train emotional *range*, not a clone of any one.

### Target Voice Characteristics to Capture

- **Pitch**: Baritone, sits low in the register (Skarsgård's depth)
- **Warmth**: Easy, genuine friendliness (McGregor's interviews)
- **Authority**: Commands without raising volume (Neeson's certainty)
- **Cadence**: Measured but not slow — unhurried (all three share this)
- **Heritage**: Natural Scottish/Scandinavian inflection (NOT exaggerated)
- **Range**: Can shift from warm banter → cold surgical precision in one sentence

---

## Technical Details

### How LFM2.5-Audio Works

The model has three components:
1. **FastConformer Audio Encoder** (115M params) — encodes input audio to tokens
2. **LFM2 Language Model** (1.2B params) — processes text + audio tokens
3. **LFM-based Audio Detokenizer** — converts tokens back to 24kHz waveform

For voice fine-tuning via leap-finetune, we adapt the **LM component** using LoRA.
The audio encoder and detokenizer remain frozen. The LM learns to produce audio
tokens that match the target speaker's characteristics when conditioned on text.

### The `--tts-speaker-file` System (llama.cpp)

In the llama.cpp deployment path, the model uses a `tokenizer-*.gguf` file as a
speaker reference. This encodes speaker characteristics that condition the audio
detokenizer. After LoRA fine-tuning, the adapted model's weights implicitly encode
the target voice, making this speaker file less critical — but it can still be
used for additional voice steering.

### leap-finetune Dataset Format

The SFT format expects JSONL with conversation messages:

```json
{
  "messages": [
    {"role": "system", "content": "System prompt describing voice characteristics"},
    {"role": "user", "content": "Text to speak or instruction"},
    {"role": "assistant", "content": "Transcript of the audio response"}
  ]
}
```

For audio training specifically, the training pipeline processes the text
representations. The audio alignment comes from the paired transcript + audio data.

### LoRA Configuration Explained

```yaml
r: 16        # Rank — capacity of the adapter. 8=minimal, 16=balanced, 32=maximum
lora_alpha: 32  # Scaling factor. Rule: alpha = 2 * r
lora_dropout: 0.05  # Regularization. Lower for larger datasets.
target_modules:     # Which layers get LoRA adapters:
  - w1, w2, w3     # GLU feed-forward layers
  - q_proj, k_proj, v_proj, out_proj  # Attention layers
  - in_proj, out_proj  # Conv layers (important for audio!)
```

---

## Estimated Training Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Audio collection | 2-4 hours | Download, extract from sources above |
| Data preparation | 30 min | Run prepare_voice_data.py + Whisper |
| Transcript verification | 1-2 hours | Manual review of manifest.jsonl |
| Environment setup | 30 min | Clone leap-finetune, install deps |
| Training (LoRA) | 1-2 hours | On 1x A100/H100 |
| Evaluation & iteration | 1-2 hours | Listen, adjust, re-train if needed |
| **Total** | **~6-12 hours** | End-to-end, including iteration |

---

## Troubleshooting

### OOM (Out of Memory)
- Reduce `per_device_train_batch_size` to 1
- Increase `gradient_accumulation_steps` to compensate
- Use `bf16: true` if not already enabled

### Voice Doesn't Sound Right
- Check transcript accuracy — this is the #1 cause
- Increase training epochs (try 8-10)
- Increase LoRA rank to r=32
- Add more diverse audio samples

### Training Loss Not Decreasing
- Learning rate may be too low — try 5e-5
- Dataset may be too small — add more samples
- Check for audio quality issues (noise, clipping)

### Garbled Audio Output
- Reduce `audio_temperature` during inference (try 0.8)
- Reduce `audio_top_k` (try 2-3)
- May indicate overfitting — use fewer epochs or more data
