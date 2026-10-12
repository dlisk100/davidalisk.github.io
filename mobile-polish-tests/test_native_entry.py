import unittest
from native_entry import native_entry, native_scroll_click

class PanelBrowser:
    def __init__(self, stuck=False, obstructed=False):
        self.scroll=0; self.wheels=[]; self.clicks=[]; self.stuck=stuck; self.obstructed=obstructed
    def ev(self, expr):
        self.expression=expr
        return dict(x=120,y=520-self.scroll,inside=0<520-self.scroll<393,clear=not self.obstructed and 0<520-self.scroll<393,visible=True,scrollable=not self.stuck,scrollTop=self.scroll,px=420,py=196,height=393)
    def wheel(self,x,y,dy):
        self.wheels.append((x,y,dy))
        if not self.stuck:self.scroll+=dy
    def click(self,x,y):self.clicks.append((x,y))

class EntryTests(unittest.TestCase):
    def test_below_fold_result_scrolls_its_real_menu_panel(self):
        b=PanelBrowser();native_scroll_click(b,'.ae-results button','.atlas-menu-body',pause=lambda _:None)
        self.assertIn('.atlas-menu-body',b.expression);self.assertIn('.ae-results button',b.expression)
        self.assertNotIn('#startup-loading',b.expression);self.assertTrue(b.wheels);self.assertEqual(len(b.clicks),1)
    def test_below_fold_requires_native_wheel_on_opening_panel(self):
        b=PanelBrowser(); native_entry(b,pause=lambda _:None)
        self.assertTrue(b.wheels);self.assertEqual(b.wheels[0][:2],(420,196));self.assertEqual(len(b.clicks),1)
        self.assertTrue(0<b.clicks[0][1]<393)
    def test_unscrollable_panel_aborts_without_click(self):
        b=PanelBrowser(stuck=True)
        with self.assertRaisesRegex(RuntimeError,'not reachable'):native_entry(b,pause=lambda _:None)
        self.assertEqual(b.clicks,[])
    def test_obstructed_cta_aborts_without_click(self):
        b=PanelBrowser(obstructed=True)
        with self.assertRaisesRegex(RuntimeError,'not reachable'):native_entry(b,pause=lambda _:None)
        self.assertEqual(b.clicks,[]);self.assertLessEqual(len(b.wheels),8)
