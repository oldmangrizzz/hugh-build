# H.U.G.H. Voice Training Pipeline

## Overview

Fine-tune LFM2.5-Audio-1.5B to give H.U.G.H. a deep, gruff, authoritative voice
with Irish/Scottish undertones — inspired by Brendan Gleeson's vocal characteristics
(particularly his Hamish from Braveheart: commanding, warm underneath the gruffness).

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

## Public Reference Sources — Brendan Gleeson

These are **public appearances** (interviews, talk shows, podcasts) where
Brendan Gleeson's natural speaking voice is clearly captured. The operator
should download/extract audio from these for training data.

### Primary Sources (Best Audio Quality)

1. **The Late Late Show (RTÉ) — Feb 23, 2024**
   - URL: https://www.youtube.com/watch?v=yDzkYAA0VN0
   - Extended interview discussing Hughes's pub documentary
   - Clean studio audio, solo speaking segments, relaxed natural tone
   - Est. usable audio: 10-15 min

2. **Gold Derby Interview — Banshees of Inisherin (2023)**
   - URL: https://www.goldderby.com/video/brendan-gleeson-interview-the-banshees-of-inisherin/
   - Long-form career discussion, Oscar nomination
   - Professional recording, excellent audio quality
   - Est. usable audio: 15-20 min

3. **RTÉ Arena Public Interview (2023)**
   - URL: https://www.rte.ie/radio/dramaonone/plays/2023/0228/1359307-in-the-wings-arena-public-interview-brendan-gleeson/
   - Podcast: https://podtail.com/en/podcast/rte-drama-on-one-podcast/arena-public-interview-brendan-gleeson-speaking-to/
   - Deep career retrospective with Seán Rocks
   - Radio-quality audio, extended solo segments
   - Est. usable audio: 20-30 min

4. **Collider — Joker: Folie à Deux Interview (2024)**
   - URL: https://www.youtube.com/watch?v=qXIuWzNqPNs
   - Discusses working with Joaquin Phoenix, Todd Phillips
   - Studio interview, clear audio
   - Est. usable audio: 8-12 min

5. **Career Retrospective: From In Bruges to 28 Days Later**
   - URL: https://www.youtube.com/watch?v=XPrnxs3wK90
   - Comprehensive career discussion
   - Est. usable audio: 10-15 min

### Secondary Sources (Good Quality)

6. **Colin Farrell & Brendan Gleeson — In Bruges Interview**
   - URL: https://www.youtube.com/watch?v=Vry1corExlw
   - Two-person interview, isolate Gleeson's segments
   - Est. usable audio: 5-8 min

7. **In Bruges Retrospective — Colin Farrell & Gleeson**
   - URL: https://www.youtube.com/watch?v=elCvFptN1yc
   - Looking back at the film years later
   - Est. usable audio: 5-8 min

8. **Late Late Show with James Corden (2023)**
   - Multi-guest format with Colin Farrell
   - Search: "Brendan Gleeson Colin Farrell Late Late Show Corden"
   - Est. usable audio: 5-8 min

9. **Second Captains Podcast (RTÉ) — Braveheart Story**
   - URL: https://www.rte.ie/entertainment/2024/0720/1460958-brendan-gleeson-says-he-nearly-lost-braveheart-role/
   - Discusses nearly losing the Hamish role
   - Radio podcast quality
   - Est. usable audio: 10-15 min

10. **Newstalk — St. Francis Hospice Patron**
    - URL: https://www.newstalk.com/podcasts/highlights-from-the-pat-kenny-show/brendan-gleeson-from-st-francis-hospice
    - Personal, reflective tone — captures the warmth
    - Radio quality audio
    - Est. usable audio: 8-12 min

### Estimated Total Usable Audio: 90-150 minutes

This exceeds the recommended 1-2 hours for LoRA voice fine-tuning.

### Target Voice Characteristics to Capture

- **Pitch**: Baritone, sits low in the register
- **Texture**: Gruff, slightly gravelly, lived-in
- **Cadence**: Measured, deliberate — doesn't rush
- **Warmth**: Dry humor breaks through, genuine care underneath
- **Authority**: Commands attention without raising volume
- **Heritage**: Natural Dublin Irish accent (not exaggerated)

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
