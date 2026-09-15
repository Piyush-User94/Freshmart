#!/usr/bin/env python3
"""Hardened static preview server for local security testing.

The Supermarket Management app is a pure static site and needs no server to
run — opening ``index.html`` in a browser is enough. This optional server
exists only so that a *local* security scan sees the same response headers the
production hosts send (see ../SECURITY.md), instead of the bare
``python -m http.server`` defaults that the scan flagged (missing CSP, missing
X-Frame-Options, disclosed ``Server: SimpleHTTP/0.6 Python/3.13.7`` …).

Usage:
    python tools/devserver.py                       # http://127.0.0.1:8123
    python tools/devserver.py --port 9000
    python tools/devserver.py --tls \\
        --certfile cert.pem --keyfile key.pem        # https://127.0.0.1:8123

Generate a local self-signed certificate for --tls mode:
    openssl req -x509 -newkey rsa:2048 -nodes -days 365 \\
        -keyout key.pem -out cert.pem -subj "/CN=localhost"

This server is for local testing only. In production, serve the static files
behind a real web server / CDN using the provided .htaccess, _headers,
vercel.json, deploy/nginx.conf or deploy/web.config.
"""

import argparse
import os
import ssl
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# The site root is the parent of this tools/ directory.
SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; "
    "media-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'self'; "
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)

PERMISSIONS_POLICY = (
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), "
    "display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), "
    "gyroscope=(), idle-detection=(), magnetometer=(), microphone=(), midi=(), "
    "payment=(), picture-in-picture=(), publickey-credentials-get=(), "
    "screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=()"
)


class HardenedHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that adds the production security headers and
    hides its own software version."""

    # Replaces the flagged "SimpleHTTP/0.6 Python/3.13.7" Server header.
    server_version = "webserver"
    sys_version = ""

    def version_string(self):  # value used for the Server header
        return "webserver"

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", PERMISSIONS_POLICY)
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        # HSTS is only valid over TLS; never assert it on plaintext HTTP.
        if isinstance(getattr(self.server, "socket", None), ssl.SSLSocket):
            self.send_header(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        # HTML is always revalidated so a new release is picked up immediately.
        path = self.path.split("?", 1)[0]
        if path.endswith("/") or path.endswith(".html") or path in ("/VERSION", "/version.json"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description="Hardened static preview server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8123)
    parser.add_argument("--tls", action="store_true", help="Serve over HTTPS.")
    parser.add_argument("--certfile", help="TLS certificate (PEM). Required with --tls.")
    parser.add_argument("--keyfile", help="TLS private key (PEM). Required with --tls.")
    args = parser.parse_args()

    handler = partial(HardenedHandler, directory=SITE_ROOT)
    httpd = ThreadingHTTPServer((args.host, args.port), handler)

    scheme = "http"
    if args.tls:
        if not args.certfile or not args.keyfile:
            parser.error("--tls requires --certfile and --keyfile")
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(args.certfile, args.keyfile)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        scheme = "https"

    print("Serving %s" % SITE_ROOT)
    print("  %s://%s:%d/   (Ctrl+C to stop)" % (scheme, args.host, args.port))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    sys.exit(main())
