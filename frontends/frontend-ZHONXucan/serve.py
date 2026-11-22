"""Frontend local et proxy de lecture vers l'API existante. Aucun seed."""

import argparse
import atexit
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import socket
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, Request, build_opener
import webbrowser

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
OPENER = build_opener(ProxyHandler({}))


class FrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, api_url, **kwargs):
        self.api_url = api_url.rstrip("/")
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.forward_api()
        else:
            super().do_GET()

    def forward_api(self):
        """Transmettre uniquement les lectures, avec le statut du backend."""
        try:
            request = Request(self.api_url + self.path, headers={"Accept": "application/json"})
            with OPENER.open(request, timeout=45) as response:
                body = response.read()
                status = response.status
                content_type = response.headers.get("Content-Type", "application/json")
        except HTTPError as error:
            body = error.read()
            status = error.code
            content_type = error.headers.get("Content-Type", "application/json")
        except (URLError, TimeoutError, OSError):
            status = 502
            content_type = "application/json; charset=utf-8"
            body = json.dumps({"detail": "API inaccessible. Démarrez le backend ou relancez le lanceur du portfolio."}).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def api_ready(api_url):
    try:
        with OPENER.open(api_url.rstrip("/") + "/api/health", timeout=2) as response:
            return response.status == 200 and json.load(response).get("status") == "ok"
    except (URLError, TimeoutError, OSError, ValueError):
        return False


def start_backend(api_url):
    """Réutiliser l'API existante ou lancer son code sans le modifier."""
    if api_ready(api_url):
        print("API existante réutilisée : " + api_url, flush=True)
        return None
    parsed = urlsplit(api_url)
    if parsed.scheme != "http" or parsed.hostname not in ("localhost", "127.0.0.1"):
        raise RuntimeError("Le démarrage automatique est réservé à une API locale HTTP.")
    backend = PROJECT / "backend"
    python = backend / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not python.exists():
        raise RuntimeError("Environnement backend absent. Installez ses dépendances, puis relancez.")
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    try:
        env["SSL_CERT_FILE"] = subprocess.check_output(
            [str(python), "-c", "import certifi; print(certifi.where())"],
            text=True, encoding="utf-8", timeout=10,
        ).strip()
    except (subprocess.SubprocessError, OSError):
        print("Certifi indisponible : utilisation du magasin de certificats existant.", flush=True)
    process = subprocess.Popen(
        [str(python), "-m", "uvicorn", "portfolio_api.main:app", "--host", "127.0.0.1", "--port", str(parsed.port or 8000)],
        cwd=str(backend), env=env,
    )

    def stop_owned_backend():
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
    atexit.register(stop_owned_backend)
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Le backend n'a pas démarré. Consultez son message dans le terminal.")
        if api_ready(api_url):
            print("API démarrée : " + api_url, flush=True)
            return process
        time.sleep(0.25)
    stop_owned_backend()
    raise RuntimeError("L'API n'est pas prête après 30 secondes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--with-backend", action="store_true")
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    if args.with_backend:
        start_backend(args.api_url)
    handler = partial(FrontendHandler, api_url=args.api_url)
    server = None
    for port in range(args.port, args.port + 10):
        # Sous Windows, SO_REUSEADDR peut autoriser deux serveurs sur le
        # même port. Vérifier la présence d'un serveur avant le bind.
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.settimeout(0.25)
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                continue
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
            break
        except OSError as error:
            if error.errno not in (48, 98, 10048) and getattr(error, "winerror", None) != 10048:
                raise
    if server is None:
        raise RuntimeError("Aucun port disponible pour le frontend.")
    url = "http://localhost:" + str(server.server_port)
    print("Portfolio : " + url, flush=True)
    print("Proxy API : " + args.api_url, flush=True)
    print("Ctrl+C pour arrêter ce serveur.", flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
