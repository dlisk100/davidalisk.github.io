"""Hosted real-DOM sensitivity using the production opening markup and CSS."""
import json,re,urllib.parse
from native_entry import MEASURE,native_entry

def hosted_entry_regressions(browser,map_root):
    html=(map_root/'index.html').read_text()
    markup=html[html.index('<div id="startup-loading"'):html.index('<button id="startup-preview"') if '<button id="startup-preview"' in html else html.index('<script',html.index('<div id="startup-loading"'))]
    markup=markup.replace('data-enter hidden','data-enter')
    css=(map_root/'startup-visuals.css').read_text()
    fixture='<style>body{margin:0;--ink:#262019;--paper:#f5efdd;--sepia:#625039}'+css+'</style>'+markup
    browser.call('Emulation.setDeviceMetricsOverride',width=852,height=393,deviceScaleFactor=1,mobile=True)
    browser.call('Page.navigate',url='data:text/html,'+urllib.parse.quote(fixture))
    import time;time.sleep(.5)
    initial=browser.ev(MEASURE)
    assert not initial['inside'] and initial['scrollable'],initial
    # The old direct-center click fails on the actual production panel.
    browser.ev("document.querySelector('#startup-loading').style.overflow='hidden'")
    try:native_entry(browser)
    except RuntimeError:pass
    else:raise AssertionError('Unscrollable production panel incorrectly accepted')
    browser.ev("document.querySelector('#startup-loading').style.overflow='auto'")
    success=native_entry(browser);assert success['attempts']>0
    browser.ev("(()=>{const d=document.createElement('div');d.id='qa-obstruction';d.style='position:fixed;inset:0;z-index:99999';document.body.append(d)})()")
    try:native_entry(browser)
    except RuntimeError:pass
    else:raise AssertionError('Obstructed production CTA incorrectly accepted')
    return {'initial':initial,'nativeScroll':success,'unscrollableRejected':True,'obstructedRejected':True}
