import unittest
try: from raw_chunks import partition
except ImportError:
    def partition(items, cap): return [items]
class RawTests(unittest.TestCase):
    def test_chunks_retain_every_frame_in_order_under_cap(self):
        chunks=partition([('a',7),('b',4),('c',6)],10)
        self.assertEqual(chunks,[[('a',7)],[('b',4),('c',6)]])
    def test_single_oversized_frame_is_explicit_error(self):
        with self.assertRaises(ValueError):partition([('a',11)],10)
