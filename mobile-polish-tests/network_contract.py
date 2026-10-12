"""Deployment-service absence is recorded only on our exact static-server origin."""
from urllib.parse import urlsplit

def classify_response(response, local_origin):
    u=urlsplit(response['url']); origin=f'{u.scheme}://{u.netloc}'
    if response['status']==404 and origin==local_origin and u.hostname=='127.0.0.1' and u.path=='/_vercel/insights/script.js' and not u.query and not u.fragment:
        return 'expected-local-missing-deployment-service'
    if response['status']>=400:
        raise RuntimeError('Actual public-root HTTP failure '+str(response['status'])+' '+response['url'])
    return 'ok'

def assert_event(event, local_origin, expected_requests=None):
    method=event.get('method');p=event.get('params',{})
    if method=='Network.responseReceived':
        classification=classify_response(p['response'],local_origin)
        if classification!='ok' and expected_requests is not None:expected_requests.add(p['requestId'])
        return classification
    # Chrome reports the exact HTTP 404 script request as canceled ERR_ABORTED.
    # Only a previously recorded exact local-service 404 qualifies, never any
    # other URL/status/request or actual deployment network failure.
    if method=='Network.loadingFailed' and expected_requests is not None and p.get('requestId') in expected_requests and p.get('type')=='Script' and p.get('errorText')=='net::ERR_ABORTED' and p.get('canceled') is True:
        return 'expected-local-404-correlated-script-abort'
    if method in ('Runtime.exceptionThrown','Network.loadingFailed'):
        raise RuntimeError('Native runtime/network failure '+str(event))
    return 'ok'
