const { chromium } = require('C:/Users/cumc910208132/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173');await page.locator('.item').first().waitFor();
assert.equal(await page.locator('.item').count(),6);
await page.locator('#item-name').fill('Arroz integral');await page.locator('#add-form button').click();assert.equal(await page.locator('.item').count(),7);
const row=page.locator('.item').filter({hasText:'Arroz integral'});await row.getByRole('button',{name:'Aumentar cantidad de Arroz integral'}).click();assert.equal(await row.locator('.quantity span').textContent(),'2');await row.locator('.check').check();
await page.locator('#theme-toggle').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('.item').count(),7);assert.equal(await page.locator('.item').filter({hasText:'Arroz integral'}).locator('.check').isChecked(),true);
await page.locator('#new-list').click();await page.locator('#list-name').fill('Fin de semana');await page.locator('#save-list').click();assert.equal(await page.locator('.item').count(),0);assert.equal(await page.locator('#list-select option').count(),2);
await page.locator('#rename-list').click();await page.locator('#list-name').fill('Picnic');await page.locator('#save-list').click();assert.equal(await page.locator('#list-select option:checked').textContent(),'Picnic');
await page.getByRole('button',{name:'Agregar Leche',exact:true}).click();assert.equal(await page.locator('.item').count(),1);
await page.evaluate(()=>{localStorage.removeItem('verde-lists');});await page.reload();await page.screenshot({path:'preview-dark.png',fullPage:true});await page.locator('#theme-toggle').click();await page.screenshot({path:'preview-light.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'preview-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS: agregar, cantidades, marcar compras, persistencia, temas, crear/renombrar listas, sugerencias, móvil sin desbordamiento, sin errores JavaScript.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
