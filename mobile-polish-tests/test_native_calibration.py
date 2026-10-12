import math,unittest
from native_calibration import gain,wheel_delta
class CalibrationTests(unittest.TestCase):
    def test_observed_gain_reaches_regional_and_local_not_187(self):
        c=gain(1,math.exp(400*.0006931),-400)
        self.assertAlmostEqual(c,.0006931)
        for target in (3.5,7.5):
            delta=wheel_delta(1,target,c)
            self.assertAlmostEqual(math.exp(-delta*c),target)
        self.assertGreater(abs(wheel_delta(1,3.5,c)),1500)
    def test_pullback(self):
        c=.0006931
        delta=wheel_delta(7.5,3.5,c)
        self.assertGreater(delta,0)
        self.assertAlmostEqual(7.5*math.exp(-delta*c),3.5)
    def test_no_response_rejected(self):
        with self.assertRaises(ValueError):gain(1,1,-400)
