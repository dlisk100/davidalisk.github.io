"""Offline contract tests at actual Recorder.stop seam; no browser or invented media."""
import ast
import pathlib
import tempfile
import types
import unittest
from unittest.mock import Mock

class ExportTests(unittest.TestCase):
    def export(self, offsets, seconds=29, elapsed=29.061):
        source=pathlib.Path(__file__).with_name('share-media.py').read_text()
        cls=next(n for n in ast.parse(source).body if isinstance(n,ast.ClassDef) and n.name=='Recorder')
        stop=next(n for n in cls.body if isinstance(n,ast.FunctionDef) and n.name=='stop')
        import json
        try: from motion_timing import frame_intervals
        except ImportError: frame_intervals=None
        with tempfile.TemporaryDirectory() as tmp:
            out=pathlib.Path(tmp)
            ns={'time':types.SimpleNamespace(monotonic=lambda:elapsed,sleep=lambda _:None), 'OUT':out,'json':json,'subprocess':types.SimpleNamespace(run=Mock()),'frame_intervals':frame_intervals}
            exec(compile(ast.Module(body=[stop],type_ignores=[]),'<stop>','exec'),ns)
            obj=types.SimpleNamespace(start_mono=0,start_wall=100,call=Mock(),recording=True,failures=[],frames=[{'file':str(out/f'{i}.jpg'),'timestamp':100+t} for i,t in enumerate(offsets)])
            ns['stop'](obj,'fixture',seconds)
            return (out/'fixture.concat').read_text()
    def test_sampler_stops_before_codec_work_not_after(self):
        source=pathlib.Path(__file__).with_name('share-media.py').read_text()
        self.assertLess(source.index('sampling=False;sampler.join'),source.index('b.stop(label,actual)'))
        self.assertLess(source.index('b.cleanup();server.shutdown()'),source.index("for clip in clips:"))
        self.assertIn('gesture();scene_ready();wait("document.getElementById(\'detail-loading\').hidden");time.sleep(1.1)',source)
    def test_23ms_beyond_cutoff_is_excluded_not_negative_hold(self):
        text=self.export([0,1,28.9,29.023455858])
        self.assertNotIn('/3.jpg',text)
        durations=[float(l.split()[1]) for l in text.splitlines() if l.startswith('duration ')]
        self.assertTrue(all(d>0 for d in durations))
        self.assertAlmostEqual(sum(durations),29)
    def test_exact_cutoff_frame_has_no_artificial_hold(self):
        text=self.export([0,1,28.9,29])
        self.assertNotIn('/3.jpg',text)
    def test_within_cutoff_last_hold_is_bounded(self):
        text=self.export([0,1,28.977])
        self.assertAlmostEqual(float([l for l in text.splitlines() if l.startswith('duration ')][-1].split()[1]),.023)

if __name__=='__main__': unittest.main()
