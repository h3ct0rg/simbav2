"""
Cliente mínimo del servidor MCP de PixelLab (JSON-RPC sobre HTTP).
La API key se lee de la variable de entorno PIXELLAB_KEY (nunca se guarda en el repo).

Uso como librería:
    from pixellab_api import call, wait_jobs
    print(call("get_balance"))
"""
import json, os, time, urllib.request

URL = "https://api.pixellab.ai/mcp"


def call(tool, **args):
    key = os.environ.get("PIXELLAB_KEY")
    if not key:
        raise SystemExit("Falta la variable de entorno PIXELLAB_KEY")
    body = json.dumps({"jsonrpc": "2.0", "id": int(time.time() * 1000), "method": "tools/call",
                       "params": {"name": tool, "arguments": args}}).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"})
    with urllib.request.urlopen(req, timeout=600) as r:
        raw = r.read().decode("utf-8", "replace")
    # la respuesta llega como Server-Sent Events: "data: {...}"
    texts = []
    for line in raw.splitlines():
        if line.startswith("data:"):
            msg = json.loads(line[5:].strip())
            if "error" in msg:
                raise RuntimeError(f"{tool}: {msg['error']}")
            for c in msg.get("result", {}).get("content", []):
                if c.get("type") == "text":
                    texts.append(c["text"])
    return "\n".join(texts)


def wait_jobs(max_wait=900):
    """Espera hasta que no quede ningún trabajo pendiente (plan trial: 1 a la vez)."""
    t0 = time.time()
    while time.time() - t0 < max_wait:
        out = call("wait_for_jobs", timeout_seconds=180)
        if "0 still running" in out or "nothing else is running" in out or "No pending" in out:
            return out
    raise TimeoutError("Los trabajos siguen corriendo")
