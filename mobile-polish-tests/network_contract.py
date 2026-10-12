"""Deployment-service absence is recorded only on our exact static-server origin."""
from urllib.parse import urlsplit

def classify_response(response, local_origin):
    u=urlsplit(response['url']); origin=f'{u.scheme}://{u.netloc}'
    if response['status']==404 and origin==local_origin and u.hostname=='127.0.0.1' and u.path=='/_vercel/insights/script.js' and not u.query and not u.fragment:
        return 'expected-local-missing-deployment-service'
    if response['status']>=400:
        raise RuntimeError('Actual public-root HTTP failure '+str(response['status'])+' '+response['url'])
    return 'ok'

def assert_event(event, local_origin):
    method=event.get('method')
    if method=='Network.responseReceived':return classify_response(event['params']['response'],local_origin)
    if method in ('Runtime.exceptionThrown','Network.loadingFailed'):
        raise RuntimeError('Native runtime/network failure '+str(event))
    return 'ok'
