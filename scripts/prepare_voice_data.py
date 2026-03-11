#!/usr/bin/env python3
"""
H.U.G.H. Voice Training Data Preparation Pipeline
===================================================
Prepares audio data for fine-tuning LFM2.5-Audio-1.5B via leap-finetune.

Takes a directory of WAV files (e.g., interview recordings), splits them
into 6-15 second segments at natural silence breaks, and generates a
manifest in the SFT messages format expected by leap-finetune.

Usage:
    python prepare_voice_data.py /path/to/wav/dir --output ./training_data
    python prepare_voice_data.py /path/to/wav/dir --output ./training_data --transcribe

Requirements:
    pip install pydub soundfile numpy tqdm
    # For auto-transcription (optional):
    pip install whisper-openai   # or: pip install faster-whisper
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("voice_prep")

# ---------------------------------------------------------------------------
# Audio segmentation
# ---------------------------------------------------------------------------

def detect_silence_breaks(audio, min_silence_ms=400, silence_thresh_db=-40):
    """Find silence regions suitable for splitting."""
    from pydub.silence import detect_silence as _detect_silence
    silences = _detect_silence(audio, min_silence_len=min_silence_ms, silence_thresh=silence_thresh_db)
    # Return midpoints of each silence region
    return [(start + end) // 2 for start, end in silences]


def split_audio(audio, min_len_ms=6000, max_len_ms=15000, min_silence_ms=400, silence_thresh_db=-40):
    """
    Split an AudioSegment into chunks of 6-15 seconds at natural silence breaks.
    Falls back to fixed-length splitting if no good silence breaks exist.
    """
    total_ms = len(audio)
    if total_ms <= max_len_ms:
        if total_ms >= min_len_ms:
            return [audio]
        else:
            log.warning(f"Audio too short ({total_ms}ms < {min_len_ms}ms min), skipping")
            return []

    breaks = detect_silence_breaks(audio, min_silence_ms, silence_thresh_db)
    segments = []
    cursor = 0

    while cursor < total_ms:
        remaining = total_ms - cursor
        if remaining <= max_len_ms:
            if remaining >= min_len_ms:
                segments.append(audio[cursor:])
            break

        # Find best break point between min_len and max_len from cursor
        window_start = cursor + min_len_ms
        window_end = min(cursor + max_len_ms, total_ms)

        candidates = [b for b in breaks if window_start <= b <= window_end]

        if candidates:
            # Prefer the break closest to 10 seconds (sweet spot)
            ideal = cursor + 10000
            best = min(candidates, key=lambda b: abs(b - ideal))
            segments.append(audio[cursor:best])
            cursor = best
        else:
            # No silence break found — hard cut at max_len
            cut = min(cursor + max_len_ms, total_ms)
            seg = audio[cursor:cut]
            if len(seg) >= min_len_ms:
                segments.append(seg)
            cursor = cut

    return segments


# ---------------------------------------------------------------------------
# Audio normalization
# ---------------------------------------------------------------------------

def normalize_audio(audio, target_dbfs=-20.0):
    """Normalize loudness to a consistent level."""
    change = target_dbfs - audio.dBFS
    return audio.apply_gain(change)


def ensure_mono_24k(audio):
    """Convert to mono and resample to 24kHz (LFM2.5-Audio target rate)."""
    if audio.channels > 1:
        audio = audio.set_channels(1)
    if audio.frame_rate != 24000:
        audio = audio.set_frame_rate(24000)
    return audio


# ---------------------------------------------------------------------------
# Transcription (optional, requires whisper)
# ---------------------------------------------------------------------------

def transcribe_segments(segment_paths, model_size="base"):
    """
    Auto-transcribe segments using OpenAI Whisper.
    Returns dict of {filename: transcript}.
    """
    try:
        import whisper
        log.info(f"Loading Whisper model ({model_size})...")
        model = whisper.load_model(model_size)
        transcripts = {}
        for path in segment_paths:
            result = model.transcribe(str(path), language="en")
            transcripts[path.name] = result["text"].strip()
        return transcripts
    except ImportError:
        log.error("whisper not installed. Run: pip install openai-whisper")
        return {}


# ---------------------------------------------------------------------------
# Manifest generation
# ---------------------------------------------------------------------------

def generate_sft_manifest(segments_info, output_path):
    """
    Generate a JSONL manifest in leap-finetune SFT format.

    Each line is a conversation with the model producing audio output.
    The audio content is referenced by file path in the messages.

    Format per line:
    {
        "messages": [
            {"role": "system", "content": "You are H.U.G.H., speak with a deep gruff voice."},
            {"role": "user", "content": "<text prompt>"},
            {"role": "assistant", "content": "<transcript of what the voice says>"}
        ],
        "audio_filepath": "<path to wav>",
        "duration": <float seconds>
    }
    """
    manifest_path = output_path / "manifest.jsonl"
    system_prompt = (
        "You are H.U.G.H. (Hyper Unified Guardian and Harbor-master). "
        "Speak with a deep, gruff, authoritative voice with Irish/Scottish undertones. "
        "Your tone is warm underneath the gruffness, like a seasoned EMS veteran."
    )

    with open(manifest_path, "w") as f:
        for info in segments_info:
            entry = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": info.get("prompt", "Speak the following text.")},
                    {"role": "assistant", "content": info.get("transcript", "[audio]")},
                ],
                "audio_filepath": str(info["audio_path"]),
                "duration": info["duration_s"],
            }
            f.write(json.dumps(entry) + "\n")

    log.info(f"Manifest written: {manifest_path} ({len(segments_info)} entries)")
    return manifest_path


def generate_metadata_csv(segments_info, output_path):
    """
    Generate a simple metadata.csv for compatibility with other TTS pipelines.
    Format: filename|transcript|duration
    """
    csv_path = output_path / "metadata.csv"
    with open(csv_path, "w") as f:
        f.write("filename|transcript|duration_s\n")
        for info in segments_info:
            fname = Path(info["audio_path"]).name
            transcript = info.get("transcript", "").replace("|", " ")
            f.write(f"{fname}|{transcript}|{info['duration_s']:.2f}\n")
    log.info(f"Metadata CSV written: {csv_path}")
    return csv_path


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def process_directory(input_dir, output_dir, transcribe=False, whisper_model="base",
                      min_len=6, max_len=15, silence_ms=400, silence_db=-40):
    from pydub import AudioSegment
    from tqdm import tqdm

    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    wavs_dir = output_dir / "wavs"
    wavs_dir.mkdir(parents=True, exist_ok=True)

    wav_files = sorted(input_dir.glob("*.wav"))
    if not wav_files:
        # Also check for common formats to convert
        for ext in ["*.mp3", "*.m4a", "*.flac", "*.ogg"]:
            wav_files.extend(input_dir.glob(ext))
        if wav_files:
            log.info(f"Found {len(wav_files)} non-WAV files — will convert to WAV")
        else:
            log.error(f"No audio files found in {input_dir}")
            sys.exit(1)

    segments_info = []
    segment_paths = []
    seg_idx = 0

    for wav_file in tqdm(wav_files, desc="Processing audio files"):
        try:
            audio = AudioSegment.from_file(str(wav_file))
        except Exception as e:
            log.warning(f"Failed to load {wav_file.name}: {e}")
            continue

        audio = ensure_mono_24k(audio)
        audio = normalize_audio(audio)

        min_ms = min_len * 1000
        max_ms = max_len * 1000
        chunks = split_audio(audio, min_ms, max_ms, silence_ms, silence_db)

        for chunk in chunks:
            seg_name = f"seg_{seg_idx:05d}.wav"
            seg_path = wavs_dir / seg_name
            chunk.export(str(seg_path), format="wav", parameters=["-ac", "1", "-ar", "24000"])

            duration_s = len(chunk) / 1000.0
            segments_info.append({
                "audio_path": str(seg_path),
                "duration_s": round(duration_s, 2),
                "source_file": wav_file.name,
                "transcript": "",  # Placeholder until transcription
                "prompt": "Speak the following text.",
            })
            segment_paths.append(seg_path)
            seg_idx += 1

    log.info(f"Generated {len(segments_info)} segments from {len(wav_files)} source files")

    # Transcription pass
    if transcribe and segments_info:
        log.info("Running Whisper transcription...")
        transcripts = transcribe_segments(segment_paths, model_size=whisper_model)
        for info in segments_info:
            fname = Path(info["audio_path"]).name
            if fname in transcripts:
                info["transcript"] = transcripts[fname]
                info["prompt"] = f"Say: {transcripts[fname]}"
        transcribed = sum(1 for i in segments_info if i["transcript"])
        log.info(f"Transcribed {transcribed}/{len(segments_info)} segments")

    # Generate manifests
    generate_sft_manifest(segments_info, output_dir)
    generate_metadata_csv(segments_info, output_dir)

    # Summary stats
    total_duration = sum(s["duration_s"] for s in segments_info)
    avg_duration = total_duration / len(segments_info) if segments_info else 0
    log.info(f"Total audio: {total_duration:.1f}s ({total_duration/60:.1f} min)")
    log.info(f"Average segment: {avg_duration:.1f}s")
    log.info(f"Output directory: {output_dir}")

    return segments_info


def main():
    parser = argparse.ArgumentParser(
        description="H.U.G.H. Voice Training Data Preparation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic: split WAV files into training segments
  python prepare_voice_data.py ./raw_audio --output ./training_data

  # With auto-transcription (requires openai-whisper)
  python prepare_voice_data.py ./raw_audio --output ./training_data --transcribe

  # Custom segment lengths and silence detection
  python prepare_voice_data.py ./raw_audio --output ./training_data \\
      --min-len 8 --max-len 12 --silence-thresh -35
        """,
    )
    parser.add_argument("input_dir", help="Directory containing source audio files (WAV, MP3, M4A, FLAC)")
    parser.add_argument("--output", "-o", default="./voice_training_data", help="Output directory")
    parser.add_argument("--transcribe", action="store_true", help="Auto-transcribe with Whisper")
    parser.add_argument("--whisper-model", default="base", choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: base)")
    parser.add_argument("--min-len", type=int, default=6, help="Min segment length in seconds (default: 6)")
    parser.add_argument("--max-len", type=int, default=15, help="Max segment length in seconds (default: 15)")
    parser.add_argument("--silence-ms", type=int, default=400, help="Min silence duration for break detection (ms)")
    parser.add_argument("--silence-thresh", type=int, default=-40, help="Silence threshold in dBFS (default: -40)")

    args = parser.parse_args()
    process_directory(
        args.input_dir, args.output, args.transcribe, args.whisper_model,
        args.min_len, args.max_len, args.silence_ms, args.silence_thresh,
    )


if __name__ == "__main__":
    main()
