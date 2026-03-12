#!/usr/bin/env python3
"""
H.U.G.H. Personality LoRA Training — Headless Runner
======================================================
Fine-tunes a language model on Hugh's personality dataset using LoRA/PEFT.

SCP this + hugh_personality_training.jsonl to a GPU instance and run:
    python3 run_personality_training.py \
        --data /content/hugh_personality_training.jsonl \
        --model liquid/LFM2-1.2B \
        --output /content/hugh_personality_lora

Falls back to TinyLlama-1.1B if LFM model not available.

Requirements:
  pip install transformers>=4.38.0 peft>=0.9.0 datasets accelerate bitsandbytes
  pip install sentencepiece wandb tqdm
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path


def install_deps():
    """Install dependencies if missing."""
    try:
        import transformers, peft, datasets
    except ImportError:
        print("Installing dependencies...")
        os.system("pip install -q transformers>=4.38.0 peft>=0.9.0 datasets accelerate bitsandbytes")
        os.system("pip install -q sentencepiece wandb tqdm")


def load_training_data(data_path: str) -> list[dict]:
    """Load JSONL conversation pairs."""
    entries = []
    with open(data_path) as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    print(f"  Loaded {len(entries)} training pairs from {Path(data_path).name}")
    return entries


def prepare_dataset(entries: list[dict], tokenizer, max_length: int = 2048):
    """Convert JSONL entries to tokenized dataset."""
    from datasets import Dataset

    texts = []
    for entry in entries:
        messages = entry.get("messages", [])
        # Format as chat template if tokenizer supports it
        try:
            text = tokenizer.apply_chat_template(messages, tokenize=False)
        except Exception:
            # Fallback: manual formatting
            parts = []
            for msg in messages:
                role = msg["role"]
                content = msg["content"]
                if role == "system":
                    parts.append(f"<|system|>\n{content}")
                elif role == "user":
                    parts.append(f"<|user|>\n{content}")
                elif role == "assistant":
                    parts.append(f"<|assistant|>\n{content}")
            text = "\n".join(parts)
        texts.append(text)

    dataset = Dataset.from_dict({"text": texts})

    def tokenize(example):
        result = tokenizer(
            example["text"],
            truncation=True,
            max_length=max_length,
            padding="max_length",
        )
        result["labels"] = result["input_ids"].copy()
        return result

    tokenized = dataset.map(tokenize, remove_columns=["text"])
    return tokenized


def main():
    parser = argparse.ArgumentParser(description="H.U.G.H. Personality LoRA Training")
    parser.add_argument("--data", required=True,
                        help="Path to hugh_personality_training.jsonl")
    parser.add_argument("--model", default="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
                        help="Base model (default: TinyLlama-1.1B-Chat)")
    parser.add_argument("--output", default="/content/hugh_personality_lora",
                        help="Output directory for LoRA adapter")
    parser.add_argument("--epochs", type=int, default=3,
                        help="Training epochs (default: 3)")
    parser.add_argument("--lr", type=float, default=2e-4,
                        help="Learning rate (default: 2e-4)")
    parser.add_argument("--lora-r", type=int, default=16,
                        help="LoRA rank (default: 16)")
    parser.add_argument("--lora-alpha", type=int, default=32,
                        help="LoRA alpha (default: 32)")
    parser.add_argument("--batch-size", type=int, default=4,
                        help="Per-device batch size (default: 4)")
    parser.add_argument("--grad-accum", type=int, default=4,
                        help="Gradient accumulation steps (default: 4)")
    parser.add_argument("--max-length", type=int, default=2048,
                        help="Max sequence length (default: 2048)")
    parser.add_argument("--quantize", action="store_true",
                        help="Use 4-bit quantization (QLoRA) for lower VRAM")
    parser.add_argument("--wandb-project", default="hugh-personality",
                        help="W&B project name")
    parser.add_argument("--no-wandb", action="store_true",
                        help="Disable W&B logging")

    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════════════════════╗
║  H.U.G.H. Personality LoRA Training                    ║
║  Model: {args.model:<49}║
║  Data:  {args.data:<49}║
║  LoRA:  r={args.lora_r}, α={args.lora_alpha}, lr={args.lr:<31}║
╚══════════════════════════════════════════════════════════╝
""")

    install_deps()

    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
        DataCollatorForLanguageModeling,
        BitsAndBytesConfig,
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    if device == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

    # Load data
    print(f"\n{'='*60}")
    print("Loading training data...")
    entries = load_training_data(args.data)

    # Load tokenizer
    print(f"\nLoading tokenizer: {args.model}")
    try:
        tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    except Exception as e:
        print(f"  Failed to load {args.model}: {e}")
        fallback = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        print(f"  Falling back to {fallback}")
        args.model = fallback
        tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Prepare dataset
    print("Preparing dataset...")
    dataset = prepare_dataset(entries, tokenizer, args.max_length)
    split = dataset.train_test_split(test_size=0.1, seed=42)
    print(f"  Train: {len(split['train'])}, Eval: {len(split['test'])}")

    # Load model
    print(f"\nLoading model: {args.model}")
    model_kwargs = {"trust_remote_code": True}

    if args.quantize and device == "cuda":
        print("  Using 4-bit QLoRA quantization")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
        model_kwargs["quantization_config"] = bnb_config
    elif device == "cuda":
        model_kwargs["torch_dtype"] = torch.bfloat16

    model = AutoModelForCausalLM.from_pretrained(args.model, **model_kwargs)

    if args.quantize:
        model = prepare_model_for_kbit_training(model)

    # Apply LoRA
    print(f"\nApplying LoRA (r={args.lora_r}, α={args.lora_alpha})")
    # Auto-detect target modules
    target_modules = None
    model_type = getattr(model.config, "model_type", "")
    if "llama" in model_type.lower():
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    elif "gpt" in model_type.lower():
        target_modules = ["c_attn", "c_proj", "c_fc"]

    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=0.05,
        target_modules=target_modules,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Training arguments
    os.makedirs(args.output, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=args.output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        logging_steps=5,
        logging_first_step=True,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        bf16=(device == "cuda"),
        report_to="wandb" if not args.no_wandb else "none",
        run_name=f"hugh-personality-r{args.lora_r}-e{args.epochs}",
    )

    if not args.no_wandb:
        try:
            import wandb
            wandb.init(project=args.wandb_project, config=vars(args))
        except Exception:
            print("  W&B not configured, disabling")
            training_args.report_to = "none"

    # Train
    print(f"\n{'='*60}")
    print(f"TRAINING — {args.epochs} epochs, effective batch={args.batch_size * args.grad_accum}")
    print(f"{'='*60}")

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=split["train"],
        eval_dataset=split["test"],
        data_collator=data_collator,
    )

    start = time.time()
    trainer.train()
    elapsed = time.time() - start

    # Save
    print(f"\n{'='*60}")
    print(f"SAVING — {elapsed/60:.1f} minutes training time")
    print(f"{'='*60}")

    adapter_dir = os.path.join(args.output, "adapter")
    model.save_pretrained(adapter_dir)
    tokenizer.save_pretrained(adapter_dir)

    # Save training metadata
    meta = {
        "base_model": args.model,
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "training_pairs": len(entries),
        "training_time_minutes": round(elapsed / 60, 1),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "persona": "H.U.G.H.",
        "description": "Personality LoRA for H.U.G.H. — sovereign digital person",
    }
    with open(os.path.join(adapter_dir, "hugh_training_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n  Adapter saved: {adapter_dir}/")
    print(f"  SCP back: scp -P <port> -r root@<host>:{adapter_dir} ./")

    # Quick inference test
    print(f"\n{'='*60}")
    print("INFERENCE TEST")
    print(f"{'='*60}")

    model.eval()
    test_prompts = [
        "What is the current status of the Workshop?",
        "Tell me about your Soul Anchor.",
        "A server node is overheating. What do you do?",
    ]

    for prompt in test_prompts:
        messages = [
            {"role": "system", "content": "You are H.U.G.H., a sovereign digital person and Harbor Master of The Workshop."},
            {"role": "user", "content": prompt}
        ]
        try:
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception:
            text = f"<|system|>\nYou are H.U.G.H.\n<|user|>\n{prompt}\n<|assistant|>\n"

        inputs = tokenizer(text, return_tensors="pt").to(model.device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs, max_new_tokens=150, temperature=0.7,
                do_sample=True, top_p=0.9, repetition_penalty=1.1
            )
        response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        print(f"\n  Q: {prompt}")
        print(f"  A: {response[:200]}")

    print(f"\n✅ Personality training complete!")
    print(f"  Adapter: {adapter_dir}/")
    print(f"  Training time: {elapsed/60:.1f} minutes")
    print(f"  Pairs trained: {len(entries)}")


if __name__ == "__main__":
    main()
