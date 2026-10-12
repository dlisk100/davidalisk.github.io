"""Run retained focused tests against released map bytes in a small disposable fixture.
No installs, browser, data copies, or edits to the retained owner's workspace.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys

REPO = Path(__file__).resolve().parents[1]
SOURCE = Path('/home/hermes/workspace/metro-flows-clicked-place')
MAP = REPO / 'site/public/projects/freight-atlas/map'
TESTS = {
    'release-loading-work': ['experience.test.cjs', 'progress-detail.test.cjs', 'progress-engine.test.cjs', 'settlement-progress.test.cjs'],
    'final-polish-work': ['entry.test.cjs', 'loading.test.cjs'],
}
with tempfile.TemporaryDirectory(prefix='freight-mobile-focused-') as directory:
    fixture = Path(directory)
    target = fixture / 'out/startup-preparation/candidate'
    target.mkdir(parents=True)
    for name in ['startup-preparation.js', 'startup-visuals.js', 'loading-status.js', 'proto.js', 'index.html', 'startup-visuals.css']:
        if '--baseline' in sys.argv:
            relative = (MAP / name).relative_to(REPO)
            (target / name).write_bytes(subprocess.check_output(['git', 'show', '40b37ef:' + str(relative)], cwd=REPO))
        else:
            shutil.copy2(MAP / name, target / name)
    paths = []
    for group, names in TESTS.items():
        (fixture / group).mkdir()
        for name in names:
            copied = fixture / group / name
            shutil.copy2(SOURCE / group / name, copied)
            paths.append(str(copied))
    completed = subprocess.run(['node', '--max-old-space-size=128', '--test', '--test-concurrency=1', *paths], check=False)
    raise SystemExit(completed.returncode)
