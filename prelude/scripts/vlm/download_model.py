"""Download the Qwen3-VL-2B Q4 GGUF weights plus the vision projector.

A 2B model at Q4 is chosen for this machine specifically: 5.8 GB of RAM, no GPU.
BF16/Q8 weights would not leave headroom for the OS, and the vision projector is
a separate file that has to be loaded alongside them.
"""

import os
import sys
import urllib.request

REPO = "bartowski/Qwen_Qwen3-VL-2B-Instruct-GGUF"
FILES = [
    "Qwen_Qwen3-VL-2B-Instruct-Q4_K_M.gguf",
    "mmproj-Qwen_Qwen3-VL-2B-Instruct-f16.gguf",
]
DEST = os.path.join(os.environ.get("TEMP", "."), "qwen3vl")


def human(n: int) -> str:
    return f"{n / 1e6:.0f} MB"


def download(name: str) -> str:
    os.makedirs(DEST, exist_ok=True)
    target = os.path.join(DEST, name)
    expected = 0
    try:
        req = urllib.request.Request(
            f"https://huggingface.co/api/models/{REPO}/tree/main/{name}"
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            import json

            expected = int(json.loads(r.read()).get("size", 0))
    except Exception:
        pass

    if os.path.exists(target) and expected and os.path.getsize(target) == expected:
        print(f"cached  {name} ({human(expected)})")
        return target

    url = f"https://huggingface.co/{REPO}/resolve/main/{name}?download=true"
    print(f"fetch   {name}" + (f" ({human(expected)})" if expected else ""))
    tmp = target + ".part"
    got = 0
    with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            got += len(chunk)
            if expected:
                pct = 100 * got / expected
                sys.stdout.write(f"\r        {human(got)} / {human(expected)}  {pct:5.1f}%")
                sys.stdout.flush()
    print()
    os.replace(tmp, target)
    print(f"saved   {target} ({human(os.path.getsize(target))})")
    return target


for name in FILES:
    download(name)

print("\nmodel dir:", DEST)
for f in sorted(os.listdir(DEST)):
    if f.endswith(".gguf"):
        print(f"  {f}  {human(os.path.getsize(os.path.join(DEST, f)))}")
