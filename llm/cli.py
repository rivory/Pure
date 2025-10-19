import argparse
import sys
from typing import Optional

from .service import (
    list_local_models,
    list_remote_models_best_effort,
    pull_model,
    generate,
    chat,
)
from .models import ChatMessage, GenerateOptions

def _print_json(obj):
    import json
    print(json.dumps(obj, indent=2, ensure_ascii=False))

def cmd_list_local(_args):
    resp = list_local_models()
    _print_json(resp.model_dump())

def cmd_list_remote(_args):
    models = list_remote_models_best_effort()
    _print_json([m.model_dump() for m in models])

def cmd_pull(args):
    for evt in pull_model(args.model):
        _print_json(evt)

def cmd_generate(args):
    opts = GenerateOptions(
        temperature=args.temperature,
        top_p=args.top_p,
        top_k=args.top_k,
        num_ctx=args.num_ctx,
        repeat_penalty=args.repeat_penalty,
        seed=args.seed,
    )
    if args.stream:
        for chunk in generate(args.model, args.prompt, opts, stream=True):
            sys.stdout.write(chunk)
            sys.stdout.flush()
        print()
    else:
        out = generate(args.model, args.prompt, opts, stream=False)
        print(out)

def cmd_chat(args):
    opts = GenerateOptions(temperature=args.temperature)
    msgs = [ChatMessage(role="user", content=args.message)]
    if args.system:
        msgs.insert(0, ChatMessage(role="system", content=args.system))
    if args.stream:
        for delta in chat(args.model, [m for m in msgs], opts, stream=True):
            sys.stdout.write(delta)
            sys.stdout.flush()
        print()
    else:
        out = chat(args.model, [m for m in msgs], opts, stream=False)
        print(out)

def main():
    p = argparse.ArgumentParser(prog="llm")
    sub = p.add_subparsers(required=True)

    s1 = sub.add_parser("list-local", help="List installed (local) models")
    s1.set_defaults(func=cmd_list_local)

    s2 = sub.add_parser("list-remote", help="Best-effort list of remote models")
    s2.set_defaults(func=cmd_list_remote)

    s3 = sub.add_parser("pull", help="Download a model")
    s3.add_argument("model", help="e.g., llama3.2:3b")
    s3.set_defaults(func=cmd_pull)

    s4 = sub.add_parser("generate", help="One-shot text generation")
    s4.add_argument("model", help="e.g., llama3.2:3b")
    s4.add_argument("prompt", help="Prompt text")
    s4.add_argument("--stream", action="store_true")
    s4.add_argument("--temperature", type=float)
    s4.add_argument("--top-p", dest="top_p", type=float)
    s4.add_argument("--top-k", dest="top_k", type=int)
    s4.add_argument("--num-ctx", dest="num_ctx", type=int)
    s4.add_argument("--repeat-penalty", dest="repeat_penalty", type=float)
    s4.add_argument("--seed", type=int)
    s4.set_defaults(func=cmd_generate)

    s5 = sub.add_parser("chat", help="Single-turn chat")
    s5.add_argument("model", help="e.gdeepseek-coder:1.3b")
    s5.add_argument("message", help="User message")
    s5.add_argument("--system", help="Optional system prompt")
    s5.add_argument("--stream", action="store_true")
    s5.add_argument("--temperature", type=float)
    s5.set_defaults(func=cmd_chat)

    args = p.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
