# Local AI model

AgentGate was verified with **Ollama 0.35.1** and **Qwen3 `qwen3:1.7b`** on October 5, 2026. The source distribution does not contain Ollama or model weights. Local inference runs on your computer without an API key or a per-request API bill.

## Fresh clone setup

[Install Ollama from its official download page](https://ollama.com/download), following the instructions for your operating system. Make sure the `ollama` command is available in your terminal. Use Node.js 24 or newer for AgentGate.

Run only one Ollama server on port 11434. If its desktop app or background service is already running, stop that instance before launching the following foreground server. Alternatively, configure that existing service according to the [official environment-variable instructions](https://docs.ollama.com/faq#how-do-i-configure-ollama-server).

### macOS or Linux

In the first terminal:

```sh
OLLAMA_NO_CLOUD=1 OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

Keep that terminal open. In a second terminal, download the small model, then start AgentGate from the source directory containing `package.json`:

```sh
ollama pull qwen3:1.7b
OLLAMA_MODEL=qwen3:1.7b OLLAMA_URL=http://127.0.0.1:11434 npm start
```

### Windows PowerShell

In the first PowerShell window:

```powershell
$env:OLLAMA_NO_CLOUD = "1"
$env:OLLAMA_HOST = "127.0.0.1:11434"
ollama serve
```

In a second PowerShell window, from the source directory:

```powershell
ollama pull qwen3:1.7b
$env:OLLAMA_MODEL = "qwen3:1.7b"
$env:OLLAMA_URL = "http://127.0.0.1:11434"
npm start
```

Open **http://127.0.0.1:8790** and select **AI** after the app reports the model is reachable. If AgentGate was already running, stop its process before restarting it with these settings. Ollama's standard installation stores downloaded weights outside this source repository. No `npm install` step is necessary for AgentGate.

The model download requires an Internet connection. Inference then uses the local model. `OLLAMA_NO_CLOUD=1` disables Ollama's remote model and web-search features; see the [official local-only configuration](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features). The default local API is sufficient; do not bind the model to a public interface for this lab.

## Optional project-local macOS runtime

The included `scripts/model-start.sh` is an alternative for an executable installed specifically at `.local/ollama/ollama`. It will not work on a fresh clone until that runtime is installed. To reproduce the exact macOS release used in verification, run these commands from the project directory:

```sh
mkdir -p .local/ollama .local/models
curl -fL --output .local/ollama/ollama-darwin.tgz https://github.com/ollama/ollama/releases/download/v0.35.1/ollama-darwin.tgz
shasum -a 256 .local/ollama/ollama-darwin.tgz
```

Confirm the reported hash is `3137dbf28948ee844e0fb3e584d9b5de6879d73d9f0cb7eff3ad64930601d307` before extracting:

```sh
tar -xzf .local/ollama/ollama-darwin.tgz -C .local/ollama
codesign --verify --strict .local/ollama/ollama
```

Keep the adjacent libraries together with the executable. This option uses `.local/models/` for weights and `.local/ollama-server.log` for the runtime log. The model itself occupies about 1.36 GB on disk. Ollama also uses its normal identity/config directory under `~/.ollama/`; changing the model path does not relocate that configuration. Keep all local runtime artifacts outside source control.

### Start the optional project-local runtime

From the AgentGate project directory, run:

```sh
bash scripts/model-start.sh
```

Keep that terminal open while using the app. The command binds to `127.0.0.1:11434`, disables cloud features, limits inference to one parallel request and one loaded model, and sets a 4,096-token default context. Start AgentGate in a second terminal with the same `OLLAMA_MODEL` and `OLLAMA_URL` settings shown above.

Launch the service from a normal user terminal. A restricted development sandbox can deny GPU access and cause model-loading errors; do not disable operating-system security checks to work around that. The verified macOS run used the signed executable with normal GPU access.

### Download the model for the optional runtime

With the model server running:

```sh
OLLAMA_HOST=127.0.0.1:11434 ./.local/ollama/ollama pull qwen3:1.7b
```

This uses the model store configured by `model-start.sh`. A model tag can change; compare the manifest digest below when reproducing this build.

## Verified provenance

- Official runtime release: [Ollama v0.35.1](https://github.com/ollama/ollama/releases/tag/v0.35.1).
- Downloaded asset: [ollama-darwin.tgz](https://github.com/ollama/ollama/releases/download/v0.35.1/ollama-darwin.tgz).
- Archive SHA-256: `3137dbf28948ee844e0fb3e584d9b5de6879d73d9f0cb7eff3ad64930601d307`, matching the release asset digest published by GitHub.
- Apple signature verified with `codesign --verify --strict`: Developer ID Application, Infra Technologies, Inc (`3MU9H2V9Y9`).
- Official model listing: [Qwen3 1.7b](https://ollama.com/library/qwen3:1.7b).
- Downloaded model manifest digest: `8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7`.
- Quantization: `Q4_K_M`; downloaded size reported by `/api/tags`: `1359293444` bytes.

## Verified inference

A real `POST /api/chat` request used `model: qwen3:1.7b`, `think: false`, `stream: false`, `temperature: 0`, `num_ctx: 4096`, and a 60-token generation limit. Given the synthetic fact "Customer River Labs has a trial subscription", the model returned:

> River Labs has a trial subscription.

The response reported `done: true`, 8 output tokens, and approximately 0.89 seconds total duration for this one request. This is a smoke check, not a general performance benchmark or an access-control guarantee. AgentGate's server must enforce data access before creating the model context and validate the returned evidence separately.

The localhost model cannot serve a public Cloudflare deployment directly. Hosting an interactive public version with real inference requires a separately reachable inference service or a different deployment design. Do not publish a demo that silently substitutes fixed responses for this live local model.
