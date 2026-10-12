import copy, unittest
from view_contract import compare_view

class RestorationContract(unittest.TestCase):
    def setUp(self):
        self.before={'v':1,'camera':{'center':[-74.65978508561727,40.409803993324275],'zoom':6},'unit':'usd','layers':['truck','rail','water'],'selection':{'type':'city','id':'361','point':[-73.974,42.58820000000001]},'facts':{'metric':20011502950,'sourceIDs':['a','b']}}
        self.after=copy.deepcopy(self.before)
        self.pixels={'camera':[[195,422],[195,422]],'selection':[[210,300],[210,300]]}
    def accepted(self):return compare_view(self.before,self.after,self.pixels)['pass']
    def test_observed_inverse_projection_drift(self):
        self.after['camera']['center'][1]=40.40980399332429
        self.after['selection']['point'][1]=42.588200000000015
        self.pixels['camera'][1][1]+=1e-12
        self.pixels['selection'][1][1]+=1e-12
        self.assertTrue(self.accepted())
    def test_tiny_geographic_camera_change_above_pixel_limit(self):
        self.after['camera']['center'][0]+=1e-10
        self.pixels['camera'][1][0]+=.02
        self.assertFalse(self.accepted())
    def test_tiny_selection_change_above_pixel_limit(self):
        self.after['selection']['point'][0]+=1e-10
        self.pixels['selection'][1][0]+=.02
        self.assertFalse(self.accepted())
    def test_one_pixel_camera_rejected_even_with_same_source_id(self):
        self.pixels['camera'][1][0]+=1
        self.assertFalse(self.accepted())
    def test_geographic_limit_independent_of_pixels(self):
        self.after['camera']['center'][0]+=2e-9
        self.assertFalse(self.accepted())
    def test_exact_noncoordinate_contract(self):
        for field,value in [('unit','tons'),('v',2),('layers',['rail','truck','water']),('facts',{'metric':20011502950.000004,'sourceIDs':['a','b']})]:
            with self.subTest(field=field):
                self.after=copy.deepcopy(self.before);self.after[field]=value;self.assertFalse(self.accepted())
        for field,value in [('id','362'),('type','port')]:
            self.after=copy.deepcopy(self.before);self.after['selection'][field]=value;self.assertFalse(self.accepted())
        self.after=copy.deepcopy(self.before);self.after['facts']['sourceIDs'].reverse();self.assertFalse(self.accepted())
        self.after=copy.deepcopy(self.before);self.after['camera']['zoom']+=1e-14;self.assertFalse(self.accepted())
    def test_missing_projection_rejected(self):
        self.pixels.pop('selection');self.assertFalse(self.accepted())
    def test_longitude_wrap_not_silently_normalized(self):
        self.after['camera']['center'][0]+=360;self.assertFalse(self.accepted())
if __name__=='__main__':unittest.main()
