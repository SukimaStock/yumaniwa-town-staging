"""New-work distribution contracts; no browser or existing-work migration claims."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENGINE = "engine/sukimastock-engine.v0.3.0.js"
CODEA = "engine/codea-lite.v1.0.0.js"


def engine_src(path):
    class Scripts(HTMLParser):
        def __init__(self):
            super().__init__()
            self.sources = []

        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            if tag == "script" and "data-sse-engine" in attrs:
                self.sources.append(attrs.get("src"))

    parser = Scripts()
    parser.feed(path.read_text())
    if len(parser.sources) != 1:
        raise AssertionError("Expected exactly one marked Engine script")
    return parser.sources[0]


class StarterAdoption(unittest.TestCase):
    def run_script(self, name, *args, success=True):
        result = subprocess.run(
            [sys.executable, str(ROOT / "engine" / name), *map(str, args)],
            capture_output=True, text=True,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sse-starter-test-")
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        (self.repo / "engine").mkdir()
        for name in [ENGINE, CODEA, "engine/sukimastock-engine.v0.2.0.js"]:
            shutil.copyfile(ROOT / name, self.repo / name)
        self.starter = self.repo / "works/_starter"
        shutil.copytree(ROOT / "works/_starter", self.starter)

    def export(self):
        self.run_script("export-standalone.py", self.starter / "starter-export.json",
                        "--repo-root", self.repo, "--check")
        self.run_script("export-standalone.py", self.starter / "starter-export.json",
                        "--repo-root", self.repo)
        local = self.repo / "dist/local-starter"
        with zipfile.ZipFile(self.repo / "dist/SukimaStock-New-Work.zip") as archive:
            archive.extractall(local)
        return local

    def test_repository_pins_and_snapshot(self):
        self.assertEqual(engine_src(self.starter / "index.html"), "../../" + ENGINE)
        self.assertEqual((self.starter / "codea-lite.js").read_bytes(), (ROOT / CODEA).read_bytes())
        for name in ["starter-export.json", "standalone-export.example.json"]:
            engine = json.loads((self.starter / name).read_text())["engine"]
            self.assertEqual(engine, {"source": ENGINE, "target": "sukimastock-engine.js", "htmlMarker": "data-sse-engine"})

    def test_generated_zip_content(self):
        local = self.export()
        manifest = json.loads((self.starter / "starter-export.json").read_text())
        self.assertEqual({p.relative_to(local).as_posix() for p in local.rglob("*") if p.is_file()},
                         set(manifest["include"]) | {"sukimastock-engine.js"})
        self.assertEqual((local / "sukimastock-engine.js").read_bytes(), (ROOT / ENGINE).read_bytes())
        self.assertEqual((local / "codea-lite.js").read_bytes(), (ROOT / CODEA).read_bytes())
        self.assertEqual(engine_src(local / "index.html"), "sukimastock-engine.js")
        self.assertNotIn("../../engine/", (local / "index.html").read_text())
        self.assertEqual(json.loads((local / "standalone-export.example.json").read_text())["engine"]["source"], ENGINE)
        self.assertIn("Engine 0.3.0", (local / "README.md").read_text())
        self.assertIn("Codea Lite 1.0.0", (local / "README.md").read_text())

    def test_handoff_retains_then_removes_rollback_without_broken_reference(self):
        local = self.export()
        for location in ["dist/staging-canary", "works/new-work-canary"]:
            with self.subTest(location=location):
                canary = self.repo / location
                shutil.copytree(local, canary)
                for flags in [[], ["--remove-local"]]:
                    self.run_script("adopt-canonical-engine.py", canary, "--repo-root", self.repo, *flags)
                    reference = engine_src(canary / "index.html")
                    self.assertEqual(reference, "../../" + ENGINE)
                    self.assertEqual((canary / reference).resolve(), self.repo / ENGINE)
                    self.assertEqual((canary / reference).read_bytes(), (ROOT / ENGINE).read_bytes())
                    rollback = canary / "sukimastock-engine.js"
                    self.assertEqual(rollback.exists(), not flags)
                    if rollback.exists():
                        self.assertEqual(rollback.read_bytes(), (ROOT / ENGINE).read_bytes())

    def test_explicit_older_engine_and_generic_export_remain_supported(self):
        old = "engine/sukimastock-engine.v0.2.0.js"
        manifest_path = self.starter / "starter-export.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["engine"]["source"] = old
        manifest_path.write_text(json.dumps(manifest))
        local = self.export()
        self.assertEqual((local / "sukimastock-engine.js").read_bytes(), (ROOT / old).read_bytes())
        self.run_script("adopt-canonical-engine.py", local, "--repo-root", self.repo, "--engine", old)
        self.assertEqual(engine_src(local / "index.html"), "../../" + old)

    def test_adoption_requires_explicit_work(self):
        before = (self.starter / "index.html").read_bytes()
        self.run_script("adopt-canonical-engine.py", "--repo-root", self.repo, success=False)
        self.assertEqual((self.starter / "index.html").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
