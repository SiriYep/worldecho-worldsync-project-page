#!/usr/bin/env python3
"""Serve the built project page locally, including seekable video byte ranges."""

import argparse
import functools
import os
from pathlib import Path
import re
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, urlunsplit


DEFAULT_ROOT = Path(__file__).resolve().parent.parent / "dist" / "client"


def parse_byte_range(value, size):
    """Return an inclusive single byte range, or reject it with ValueError."""
    match = re.fullmatch(r"bytes=([0-9]*)-([0-9]*)", value.strip())
    if not match or size <= 0:
        raise ValueError("A single satisfiable bytes range is required.")
    first, last = match.groups()
    if not first:
        suffix = int(last) if last else 0
        if suffix <= 0:
            raise ValueError("The suffix must contain at least one byte.")
        return max(0, size - suffix), size - 1
    start = int(first)
    end = int(last) if last else size - 1
    if start >= size or end < start:
        raise ValueError("The range is outside the file.")
    return start, min(end, size - 1)


class RangeRequestHandler(SimpleHTTPRequestHandler):
    """Static files with one bytes range per GET/HEAD and bounded file copying."""

    def end_headers(self):
        # Rebuilds replace dist files in place; do not reuse stale video ranges.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        self._range_remaining = None
        translated = self.translate_path(self.path)
        root = Path(self.directory).resolve()
        path = Path(translated)
        try:
            path.resolve().relative_to(root)
        except (ValueError, OSError, RuntimeError):
            self.send_error(HTTPStatus.FORBIDDEN, "Path is outside the preview directory")
            return None

        if path.is_dir():
            parts = urlsplit(self.path)
            if not parts.path.endswith(("/", "%2f", "%2F")):
                self.send_response(HTTPStatus.MOVED_PERMANENTLY)
                self.send_header("Location", urlunsplit((parts.scheme, parts.netloc, parts.path + "/", parts.query, parts.fragment)))
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            for name in ("index.html", "index.htm"):
                candidate = path / name
                if candidate.is_file():
                    path = candidate
                    break
            else:
                return self.list_directory(str(path))
        elif translated.endswith("/"):
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None

        # Check again after resolving a directory's index, including symlinks.
        try:
            path.resolve().relative_to(root)
            if not path.is_file():
                raise FileNotFoundError
            source = path.open("rb")
        except (ValueError, RuntimeError):
            self.send_error(HTTPStatus.FORBIDDEN, "Path is outside the preview directory")
            return None
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None

        try:
            info = os.fstat(source.fileno())
            size = info.st_size
            modified = self.date_time_string(info.st_mtime)
            ranges = self.headers.get_all("Range", [])
            requested_range = ranges[0] if ranges else None
            # No entity tags are published. A stale/unknown If-Range validator
            # gets the complete current file instead of a potentially stale slice.
            if self.headers.get("If-Range") not in (None, modified):
                requested_range = None
            byte_range = None
            if requested_range is not None:
                try:
                    if len(ranges) != 1:
                        raise ValueError("Multiple ranges are unsupported.")
                    byte_range = parse_byte_range(requested_range, size)
                except ValueError:
                    source.close()
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return None

            self.send_response(HTTPStatus.PARTIAL_CONTENT if byte_range else HTTPStatus.OK)
            self.send_header("Content-Type", self.guess_type(str(path)))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Last-Modified", modified)
            if byte_range:
                start, end = byte_range
                self._range_remaining = end - start + 1
                source.seek(start)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                self.send_header("Content-Length", str(self._range_remaining))
            else:
                self.send_header("Content-Length", str(size))
            self.end_headers()
            return source
        except Exception:
            source.close()
            raise

    def copyfile(self, source, outputfile):
        if self._range_remaining is None:
            return super().copyfile(source, outputfile)
        remaining = self._range_remaining
        while remaining:
            block = source.read(min(64 * 1024, remaining))
            if not block:
                break
            outputfile.write(block)
            remaining -= len(block)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4190)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", type=Path, default=DEFAULT_ROOT)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    root = args.directory.resolve()
    if not root.is_dir():
        parser.error(f"Preview directory does not exist: {root}. Run npm run build first.")
    handler = functools.partial(RangeRequestHandler, directory=str(root))
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"Preview: http://{args.bind}:{args.port}/ (serving {root})", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
