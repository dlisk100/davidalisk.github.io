"""Exercise the actual still production block without launching a browser."""
import pathlib,tempfile,json,unittest
class StillComparisonTests(unittest.TestCase):
    def test_units_compare_before_any_native_camera_roundtrip(self):
        source=pathlib.Path(__file__).with_name('share-media.py').read_text()
        block=source[source.index("    still('midwest-tons',3.5)"):source.index('    # Warm every view')]
        import textwrap
        state={'x':-752.,'y':-634.5,'k':3.5};shots={};snapshots={}
        def camera():return state.copy()
        def still(name,target):
            state['k']=target
            if target!=3.5:state['x']+=.5
            snapshots[name]={'camera':camera()};shots[name]=camera()
        def shot(name):shots[name]=camera()
        def target_zoom(target):state.update(k=target,x=state['x']+.5)
        class Browser:
            def ev(self,_):return False
        with tempfile.TemporaryDirectory() as tmp:
            ns={'still':still,'target_zoom':target_zoom,'center_chicago':lambda:None,'scene_ready':lambda:None,'tap':lambda _:None,'shot':shot,'camera':camera,'snapshots':snapshots,'base':1,'point':lambda _:[220,320],'chicago':[-87.63,41.88],'b':Browser(),'OUT':pathlib.Path(tmp),'json':json}
            exec(textwrap.dedent(block),ns)
        self.assertEqual(shots['midwest-tons'],shots['midwest-usd'])
        self.assertEqual(shots['chicago-great-lakes']['k'],7.5)
