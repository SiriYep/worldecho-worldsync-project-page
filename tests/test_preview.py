"""Exercise actual GET/HEAD handlers without binding or starting a server."""

import importlib.util
from io import BytesIO
from pathlib import Path
import tempfile
import unittest


SPEC = importlib.util.spec_from_file_location("preview", Path(__file__).resolve().parents[1] / "scripts" / "preview.py")
preview = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(preview)


class InMemoryHandler(preview.RangeRequestHandler):
    def setup(self):
        self.rfile = BytesIO(self.request)
        self.wfile = BytesIO()

    def finish(self):
        pass

    def log_message(self, *_args):
        pass


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "site"
        self.root.mkdir()
        (self.root / "clip.mp4").write_bytes(b"0123456789")
        (self.root / "empty.mp4").write_bytes(b"")
        (self.root / "index.html").write_bytes(b"home")

    def request(self, method="GET", path="/clip.mp4", headers=()):
        raw = f"{method} {path} HTTP/1.0\r\nHost: localhost\r\n" + "".join(f"{name}: {value}\r\n" for name, value in headers) + "\r\n"
        handler = InMemoryHandler(raw.encode("ascii"), ("127.0.0.1", 1), None, directory=str(self.root))
        head, body = handler.wfile.getvalue().split(b"\r\n\r\n", 1)
        lines = head.decode("latin1").split("\r\n")
        status = int(lines[0].split()[1])
        fields = dict(line.split(": ", 1) for line in lines[1:])
        return status, fields, body

    def test_full_get_head_and_index(self):
        for method in ("GET", "HEAD"):
            status, headers, body = self.request(method)
            self.assertEqual(status, 200)
            self.assertEqual(headers["Accept-Ranges"], "bytes")
            self.assertEqual(headers["Cache-Control"], "no-store")
            self.assertEqual(headers["Content-Length"], "10")
            self.assertEqual(body, b"0123456789" if method == "GET" else b"")
        self.assertEqual(self.request(path="/")[2], b"home")
        self.assertEqual(self.request(path="/empty.mp4")[0], 200)

    def test_bounded_open_suffix_and_clamped_ranges(self):
        for value, content_range, expected in (
            ("bytes=0-0", "bytes 0-0/10", b"0"),
            ("bytes=2-5", "bytes 2-5/10", b"2345"),
            ("bytes=7-", "bytes 7-9/10", b"789"),
            ("bytes=-3", "bytes 7-9/10", b"789"),
            ("bytes=8-99", "bytes 8-9/10", b"89"),
            ("bytes=-99", "bytes 0-9/10", b"0123456789"),
        ):
            for method in ("GET", "HEAD"):
                with self.subTest(value=value, method=method):
                    status, headers, body = self.request(method, headers=[("Range", value)])
                    self.assertEqual(status, 206)
                    self.assertEqual(headers["Content-Range"], content_range)
                    self.assertEqual(headers["Cache-Control"], "no-store")
                    self.assertEqual(headers["Content-Length"], str(len(expected)))
                    self.assertEqual(body, expected if method == "GET" else b"")

    def test_unsatisfiable_malformed_multiple_and_empty_file_ranges(self):
        for value in ("bytes=10-", "bytes=5-2", "bytes=-0", "bytes=-", "bytes=0-1,5-6", "bytes=bad", "bytes=0-1\r\nRange: bytes=2-3"):
            with self.subTest(value=value):
                status, headers, body = self.request(headers=[("Range", value)])
                self.assertEqual(status, 416)
                self.assertEqual(headers["Content-Range"], "bytes */10")
                self.assertEqual(headers["Content-Length"], "0")
                self.assertEqual(body, b"")
        status, headers, body = self.request(path="/empty.mp4", headers=[("Range", "bytes=0-")])
        self.assertEqual(status, 416)
        self.assertEqual(headers["Content-Range"], "bytes */0")
        self.assertEqual(body, b"")

    def test_stale_if_range_returns_the_complete_file(self):
        status, headers, body = self.request(headers=[("Range", "bytes=2-3"), ("If-Range", '"old-version"')])
        self.assertEqual(status, 200)
        self.assertNotIn("Content-Range", headers)
        self.assertEqual(body, b"0123456789")

    def test_paths_and_symlink_indexes_cannot_leave_the_root(self):
        secret = Path(self.temp.name) / "outside.txt"
        secret.write_bytes(b"outside secret")
        (self.root / "escape.txt").symlink_to(secret)
        nested = self.root / "nested"
        nested.mkdir()
        (nested / "index.html").symlink_to(secret)
        for path in ("/escape.txt", "/nested/", "/../outside.txt", "/%2e%2e/outside.txt"):
            with self.subTest(path=path):
                status, _, body = self.request(path=path, headers=[("Range", "bytes=0-")])
                self.assertIn(status, (403, 404))
                self.assertNotIn(b"outside secret", body)


if __name__ == "__main__":
    unittest.main()
