"""Serveur local du frontend et proxy de l'API d'équipe (Python standard)."""

import argparse
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent


class PortfolioHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_api()
        elif any(part.startswith(".") for part in urlsplit(self.path).path.split("/") if part):
            self.send_error(404)
        else:
            super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def proxy_api(self):
        try:
            request = Request(self.server.api_base + self.path, headers={"Accept": "application/json"})
            with urlopen(request, timeout=18) as response:
                body = response.read()
                self.send_response(response.status)
                self.send_header("Content-Type", response.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except HTTPError as error:
            # Les erreurs de validation et les 404 restent identiques à celles de FastAPI.
            # Ne pas transmettre de trace serveur au navigateur en cas d'erreur interne.
            body = error.read() if error.code < 500 else b'{"detail":"Service indisponible"}'
            self.send_response(error.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (URLError, TimeoutError, OSError):
            body = b'{"detail":"Service temporairement indisponible"}'
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5173)
    parser.add_argument("--api", default=os.environ.get("API_BASE_URL", "http://127.0.0.1:8000"))
    args = parser.parse_args()
    upstream = urlsplit(args.api)
    if upstream.scheme not in {"http", "https"} or not upstream.hostname or upstream.path not in {"", "/"}:
        parser.error("--api doit être l'origine HTTP(S) du backend, sans chemin /api")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(PortfolioHandler, directory=str(ROOT)))
    server.api_base = args.api.rstrip("/")
    print(f"Portfolio : http://127.0.0.1:{args.port}", flush=True)
    print(f"API cible : {server.api_base}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
