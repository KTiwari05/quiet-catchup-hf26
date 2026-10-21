import copy
import io
import json
import threading
import unittest
from http.client import HTTPConnection
from unittest.mock import patch

import app

THREAD = "Ana: The lunch is at noon.\nBo: I'll bring cups.\nAna: Who can bring food?"
VALID = {"summary": [{"text": "Lunch is at noon.", "lines": [1]},
                      {"text": "Bo will bring cups.", "lines": [2]}],
         "decisions": [], "followups": [{"text": "Who can bring food?", "lines": [3]}]}


class DigestTests(unittest.TestCase):
    def test_blank_short_and_oversize_inputs_rejected(self):
        for text in (None, "", "tiny", "a" * 12001):
            with self.subTest(text_type=type(text)), self.assertRaises(ValueError):
                app.prepare(text)

    def test_one_line_and_too_many_lines_rejected(self):
        for text in ("A sufficiently long single message with no newlines.", "xx\n" * 201):
            with self.assertRaises(ValueError):
                app.prepare(text)

    def test_line_numbers_ignore_empty_lines(self):
        self.assertEqual(app.prepare("\n" + THREAD.replace("\n", "\n\n")), THREAD.splitlines())

    def test_unknown_zero_boolean_and_duplicate_references_rejected(self):
        for refs in ([4], [0], [True], [1, 1], [], ["1"]):
            data = copy.deepcopy(VALID)
            data["summary"][0]["lines"] = refs
            with self.subTest(refs=refs), self.assertRaises(ValueError):
                app.validate_digest(data, THREAD.splitlines())

    def test_missing_sections_and_wrong_shape_rejected(self):
        for data in ({}, [], {**VALID, "extra": []}, {**VALID, "summary": []}):
            with self.assertRaises(ValueError):
                app.validate_digest(data, THREAD.splitlines())

    def test_overlong_and_blank_generated_text_rejected(self):
        for text in (" ", "a" * 281, 5):
            data = copy.deepcopy(VALID)
            data["summary"][0]["text"] = text
            with self.assertRaises(ValueError):
                app.validate_digest(data, THREAD.splitlines())

    def test_valid_unicode_digest_and_evidence_preserved(self):
        data = copy.deepcopy(VALID)
        data["summary"][0]["text"] = "  Lunch — café at noon.  "
        result = app.validate_digest(data, THREAD.splitlines())
        self.assertEqual(result["summary"][0]["text"], "Lunch — café at noon.")
        self.assertEqual(result["summary"][0]["lines"], [1])

    def mocked_generate(self, content, **extra):
        response = {"done": True, "done_reason": "stop", "message": {"content": content}, **extra}
        with patch("app.urlopen", return_value=io.BytesIO(json.dumps(response).encode())) as network:
            result = app.digest(THREAD)
            request = network.call_args.args[0]
            self.assertEqual(request.full_url, "http://127.0.0.1:11434/api/chat")
            self.assertFalse(json.loads(request.data)["stream"])
            return result

    def test_model_adapter_and_reasoning_prefix(self):
        result = self.mocked_generate("<think>private draft</think>" + json.dumps(VALID))
        self.assertEqual(result["sources"], THREAD.splitlines())
        self.assertEqual(result["digest"], VALID)

    def test_malformed_and_truncated_model_output_rejected(self):
        for content, extras in (("not json", {}), (json.dumps(VALID), {"done_reason": "length"}),
                                (json.dumps(VALID), {"done": False})):
            with self.assertRaises(ValueError):
                self.mocked_generate(content, **extras)


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        cls.port_patch = patch("app.PORT", cls.server.server_port)
        cls.port_patch.start()
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.port_patch.stop()

    def request(self, path, body=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        connection.request("POST" if body is not None else "GET", path, body, headers or {})
        response = connection.getresponse()
        result = response.status, response.read(), dict(response.getheaders())
        connection.close()
        return result

    def test_page_serves_and_path_traversal_does_not(self):
        status, body, headers = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn(b"Quiet Catchup", body)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(self.request("/../app.py")[0], 404)

    def test_external_host_and_origin_rejected(self):
        self.assertEqual(self.request("/", headers={"Host": "attacker.example"})[0], 403)
        self.assertEqual(self.request("/api/digest", "{}", {"Origin": "https://attacker.example"})[0], 403)

    def test_invalid_requests_fail_before_inference(self):
        with patch("app.digest") as inference:
            for body in ("no JSON", "[]", json.dumps({"text": "tiny"})):
                self.assertEqual(self.request("/api/digest", body)[0], 400)
            self.assertEqual(self.request("/api/digest", "x" * 60001)[0], 413)
            inference.assert_not_called()

    def test_unreachable_model_has_clear_error(self):
        with patch("app.digest", side_effect=app.URLError("offline")):
            status, body, _ = self.request("/api/digest", json.dumps({"text": THREAD}))
        self.assertEqual(status, 502)
        self.assertIn("Start Ollama", json.loads(body)["error"])


if __name__ == "__main__":
    unittest.main()
