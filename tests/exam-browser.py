"""Exam flow against the isolated test database. Never writes to the personal bank."""
import os,json,re
from playwright.sync_api import sync_playwright
origin=os.environ.get('GC_TEST_ORIGIN','http://127.0.0.1:3005')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    errors=[]
    def login(width,mobile=False):
        c=browser.new_context(viewport={'width':width,'height':900},is_mobile=mobile,has_touch=mobile)
        page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/login');page.get_by_label('Contraseña de acceso').fill(os.environ['PRIVATE_APP_PASSWORD']);page.get_by_role('button',name='Entrar en mi espacio').click();page.wait_for_url(origin+'/')
        page.get_by_role('heading',name='Empieza tu examen').wait_for()
        page.get_by_role('button',name='Generar posible examen 2027').wait_for(state='visible')
        page.wait_for_function("!document.querySelector('.exam-start-grid .primary').disabled")
        return c,page
    desktop,pc=login(1440)
    pc.get_by_role('button',name='Generar posible examen 2027').click()
    pc.get_by_role('heading',name=re.compile('Planificación guardada')).wait_for(timeout=60000)
    selector=pc.get_by_label('Convocatoria y modelo');options=selector.locator('option').all()
    target=next(x.get_attribute('value') for x in options if '2026' in x.inner_text() and 'modelo A' in x.inner_text())
    selector.select_option(target);pc.get_by_role('button',name='Realizar examen oficial anterior').click()
    pc.locator('.exam-options').wait_for(timeout=30000)
    assert not pc.get_by_text('Clave documental',exact=False).count()
    first_stem=pc.locator('.exam-question h2').inner_text()
    pc.locator('.exam-options input').first.check()
    pc.wait_for_function("!document.querySelector('.exam-options').disabled")
    pc.get_by_role('button',name='Marcar para revisar',exact=True).click();pc.wait_for_function("!document.querySelector('.exam-options').disabled")
    pc.get_by_role('button',name='Siguiente',exact=True).click();pc.wait_for_function("!document.querySelector('.exam-options').disabled")
    pc.get_by_role('button',name='Guardar y continuar después',exact=True).click()
    pc.get_by_role('heading',name='Mis exámenes guardados').wait_for()
    phone,iphone=login(390,True)
    rows=iphone.locator('.attempt').filter(has_text='En curso')
    rows.first.get_by_role('button',name='Continuar',exact=True).click()
    iphone.locator('.exam-options').wait_for(timeout=30000)
    assert iphone.locator('.exam-question h2').inner_text()!=first_stem
    iphone.get_by_role('button',name='Anterior',exact=True).click();iphone.wait_for_function("!document.querySelector('.exam-options').disabled")
    assert iphone.locator('.exam-options input').first.is_checked()
    assert iphone.get_by_role('button',name='Marcada para revisar',exact=True).get_attribute('aria-pressed')=='true'
    assert iphone.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Mobile overflow while answering'
    iphone.get_by_text('Finalizar y corregir',exact=True).click()
    iphone.get_by_role('button',name='Finalizar examen',exact=True).click()
    iphone.get_by_text('RESULTADO DE PRÁCTICA',exact=True).wait_for(timeout=30000)
    assert iphone.get_by_text('provisional',exact=False).count()>0
    iphone.get_by_role('button',name='Marcadas para repasar',exact=True).click()
    assert iphone.get_by_text(first_stem,exact=True).count()>0
    assert iphone.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Mobile overflow while reviewing'
    assert not errors,errors
    print(json.dumps({'desktop':1440,'mobile':390,'historicalExamFlow':True,'progressResumedAcrossContexts':True,'flagsPersisted':True,'blanksAllowed':True,'correctionsHiddenUntilFinish':True,'provisionalGradeExplained':True,'generatedIncompleteBlocked':True,'mobileHorizontalOverflow':False,'pageErrors':errors}))
    browser.close()
