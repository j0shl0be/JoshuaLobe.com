from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
import argparse


class QuietHandler(SimpleHTTPRequestHandler):
    # Suppress noisy errors from clients closing connections early (Firefox, etc.)
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_error(self, format, *args):
        msg = format % args if args else format
        if "BrokenPipeError" in msg or "ConnectionResetError" in msg:
            return
        super().log_error(format, *args)


def main():
    parser = argparse.ArgumentParser(description="Quiet local static file server")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--dir", "-d", default=os.getcwd(), help="Directory to serve")
    parser.add_argument("--host", default="localhost", help="Host to bind (e.g., 127.0.0.1)")
    args = parser.parse_args()

    os.chdir(args.dir)
    server = ThreadingHTTPServer((args.host, args.port), QuietHandler)
    print(f"Serving {os.getcwd()} at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

