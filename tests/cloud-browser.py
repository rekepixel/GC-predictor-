"""Private UI check against a running isolated PostgreSQL-backed production server.
Chromium desktop/mobile emulation; does not certify physical Safari installation.
"""
import os, json, re
from playwright.sync_api import sync_playwright
origin = os.environ.get('GC_TEST_ORIGIN', 'http://127.0.0.1:3003')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    errors=[]
    def open_app(width, mobile=False):
        ctx=browser.new_context(viewport={'width':width,'height':844 if mobile else 960},is_mobile=mobile,has_touch=mobile)
        page=ctx.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: print('HTTP_ERROR', response.status, response.url, flush=True) if response.status>=400 else None)
        page.goto(origin+'/login')
        page.get_by_label('Contraseña de acceso').fill(os.environ['PRIVATE_APP_PASSWORD'])
        page.get_by_role('button',name='Entrar en mi espacio').click()
        page.wait_for_url(origin+'/')
        # Wait for the post-login document to hydrate before switching section.
        # A second navigation here can race the login's location.href redirect.
        page.locator('.page-title').first.wait_for(timeout=60000)
        page.evaluate("location.hash='examenes'")
        try:
            page.locator('.question-card').first.wait_for(timeout=60000)
        except Exception:
            print('PAGE_STATE',page.url,page.locator('body').inner_text()[:2500],errors,flush=True)
            page.screenshot(path='.local/netlify-test/browser-failure.png')
            raise
        return ctx,page
    desktop, pc = open_app(1440)
    status=pc.get_by_label(re.compile('^Mi progreso')).first
    answer=pc.get_by_label(re.compile('^Mi respuesta ')).first
    status.select_option('review')
    pc.wait_for_function("document.querySelector('[aria-label^=\"Mi progreso\"]').disabled === false")
    answer.select_option('2')
    pc.wait_for_function("document.querySelector('[aria-label^=\"Mi respuesta\"]').disabled === false")
    phone, iphone = open_app(390, True)
    assert iphone.get_by_label(re.compile('^Mi progreso')).first.input_value()=='review'
    assert iphone.get_by_label(re.compile('^Mi respuesta ')).first.input_value()=='2'
    assert iphone.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile horizontal overflow'
    assert pc.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desktop horizontal overflow'
    cdp=desktop.new_cdp_session(pc)
    manifest=cdp.send('Page.getAppManifest')
    assert not manifest.get('errors'), manifest.get('errors')
    assert json.loads(manifest['data'])['display']=='standalone'
    pc.wait_for_function("navigator.serviceWorker.controller !== null", timeout=15000)
    cached=pc.evaluate("async () => {const result=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())result.push(new URL(request.url).pathname);return result;}")
    assert set(cached)<=set(['/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png']), cached
    iphone.get_by_label(re.compile('^Mi progreso')).first.select_option('studied')
    iphone.wait_for_function("document.querySelector('[aria-label^=\"Mi progreso\"]').disabled === false")
    pc.bring_to_front()
    pc.evaluate("window.dispatchEvent(new Event('focus'))")
    pc.wait_for_function("document.querySelector('[aria-label^=\"Mi progreso\"]').value === 'studied'")
    assert not errors, errors
    result={'desktopWidth':1440,'mobileWidth':390,'browser':'Chromium, mobile emulation','uiLogin':True,'studyAndAnswerSync':True,'focusSync':True,'manifestValid':True,'serviceWorkerActive':True,'privateDataNotCached':True,'horizontalOverflow':False,'pageErrors':errors,'physicalIPhoneInstallation':'pending real HTTPS deployment'}
    print(json.dumps(result))
    browser.close()
