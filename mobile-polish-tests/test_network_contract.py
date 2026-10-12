import unittest
from network_contract import classify_response, assert_event
class NetworkContract(unittest.TestCase):
    origin='http://127.0.0.1:1234'
    def test_exact_local_service_recorded(self):
        self.assertEqual(classify_response({'url':self.origin+'/_vercel/insights/script.js','status':404},self.origin),'expected-local-missing-deployment-service')
    def test_red_missing_assets_and_real_deployment(self):
        for path in ['/favicon.svg','/projects/freight-atlas/map/proto.js','/projects/freight-atlas/map/plate.json.gz','/_vercel/insights/script.js?x=1','/_vercel/insights/other.js']:
            with self.subTest(path=path),self.assertRaises(RuntimeError):classify_response({'url':self.origin+path,'status':404},self.origin)
        for status in [404,500]:
            with self.assertRaises(RuntimeError):classify_response({'url':'https://www.davidalisk.com/_vercel/insights/script.js','status':status},self.origin)
    def test_correlated_abort_only_after_exact_local_404(self):
        ids=set();event={'method':'Network.loadingFailed','params':{'requestId':'one','type':'Script','errorText':'net::ERR_ABORTED','canceled':True}}
        with self.assertRaises(RuntimeError):assert_event(event,self.origin,ids)
        assert_event({'method':'Network.responseReceived','params':{'requestId':'one','response':{'url':self.origin+'/_vercel/insights/script.js','status':404}}},self.origin,ids)
        self.assertEqual(assert_event(event,self.origin,ids),'expected-local-404-correlated-script-abort')
        for field,value in [('requestId','two'),('errorText','net::ERR_CONNECTION_RESET'),('canceled',False),('type','Document')]:
            import copy
            mutation=copy.deepcopy(event);mutation['params'][field]=value
            with self.assertRaises(RuntimeError):assert_event(mutation,self.origin,ids)
    def test_red_runtime_and_network_not_waived(self):
        for method in ['Runtime.exceptionThrown','Network.loadingFailed']:
            with self.assertRaises(RuntimeError):assert_event({'method':method,'params':{'url':self.origin+'/_vercel/insights/script.js'}},self.origin)
if __name__=='__main__':unittest.main()
