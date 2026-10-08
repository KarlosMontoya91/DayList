import {$,el,button,input,select,field,empty,dialog,download} from './ui.js';
import {parseItem,parseShoppingText} from './parser.js';
import * as accounts from './firebase.js';
let api,recognition;
const uuid=()=>crypto.randomUUID();
export function mountExtras(value){api=value;return {voice,sharing};}
export function renderExtra(view){({inspiration:renderInspiration,offers:renderOffers,profile:renderProfile})[view]();}

function voice(){
  const {d,content}=dialog('🎙 Dictar o ingresar productos');
  const text=el('textarea');
  text.rows=4;
  text.placeholder='Ejemplo: Dos kilos de papa, un kilo de tomate rojo, una docena de huevos y dos leches deslactosadas';
  
  const statusContainer=el('div','voice-status-box');
  const statusIcon=el('span','voice-status-icon','🎙');
  const statusMsg=el('p','section-description','Pulsa "Iniciar dictado" para hablar o escribe los productos manualmente abajo.');
  statusContainer.append(statusIcon,statusMsg);

  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  content.append(statusContainer,field('Productos reconocidos o manuales',text));
  
  let timer;
  d.onclose=()=>{recognition?.abort();recognition=null;clearTimeout(timer);};

  if(Speech){
    const record=button('🎙 Iniciar dictado',()=>{
      try{
        recognition?.abort();
        recognition=new Speech();
        recognition.lang='es-MX';
        recognition.continuous=false;
        recognition.interimResults=true;
        statusMsg.textContent='Solicitando permiso de micrófono…';
        statusIcon.textContent='⏳';
        
        recognition.onstart=()=>{
          statusMsg.textContent='Escuchando... Habla ahora claramente.';
          statusIcon.textContent='🔴';
          record.disabled=true;
          record.classList.add('pulse');
        };
        recognition.onresult=e=>{
          text.value=Array.from(e.results).map(r=>r[0].transcript).join(' ');
        };
        recognition.onerror=e=>{
          record.disabled=false;
          record.classList.remove('pulse');
          statusIcon.textContent='⚠️';
          if(e.error==='not-allowed'){
            statusMsg.textContent='Permiso de micrófono denegado en tu navegador. Puedes escribir tus productos en el cuadro de texto.';
          } else if(e.error==='no-speech'){
            statusMsg.textContent='No detectamos sonido. Vuelve a intentarlo o escribe tus productos.';
          } else {
            statusMsg.textContent='No pudimos procesar el audio. Puedes intentar de nuevo o ingresar tus productos manualmente.';
          }
        };
        recognition.onend=()=>{
          record.disabled=false;
          record.classList.remove('pulse');
          if(statusIcon.textContent==='🔴'){
            statusIcon.textContent='✅';
            statusMsg.textContent='Dictado completado. Revisa o edita la lista antes de agregar.';
          }
        };
        recognition.start();
        clearTimeout(timer);
        timer=setTimeout(()=>recognition?.stop(),60000);
      }catch(err){
        record.disabled=false;
        statusMsg.textContent='El micrófono no está listo en este momento. Puedes escribir la lista abajo.';
      }
    },'button primary');
    content.append(record,button('Detener dictado',()=>recognition?.stop(),'text-button'));
  } else {
    statusIcon.textContent='ℹ️';
    statusMsg.textContent='El dictado por voz no está soportado en este navegador. Puedes escribir o pegar la lista directamente abajo.';
  }

  content.append(button('Revisar y agregar a la lista',()=>{
    if(!text.value.trim()){
      api.toast('Por favor escribe o dicta al menos un producto.');
      return;
    }
    recognition?.abort();
    clearTimeout(timer);
    d.close();
    api.batchReview(parseShoppingText(text.value,api.state().customProducts),'Revisar productos dictados');
  },'button primary'));
}

const starters=[{name:'Desayunos',names:['Huevo de gallina','Pan integral','Leche entera','Plátano']},{name:'Limpieza mensual',names:['Detergente para ropa','Esponja','Papel higiénico']},{name:'Parrillada',names:['Carne para asar','Cebolla blanca','Tortilla de maíz','Aguacate']},{name:'Fiesta infantil',names:['Globo','Vela de cumpleaños','Plato para fiesta']},{name:'Lunch escolar',names:['Manzana','Pan integral','Queso panela']},{name:'Mascotas',names:['Croqueta para perro','Bolsa para desechos']},{name:'Bebé',names:['Pañal','Toallita húmeda']},{name:'Compra semanal',names:['Jitomate','Papa','Huevo de gallina','Arroz blanco']}];

function renderInspiration(){
  const state=api.state(),box=api.section('Ideas para tu próxima lista','Plantillas reutilizables y tus propias recetas. Tú eliges qué agregar.');
  box.append(button('＋ Nueva receta',()=>recipeForm(),'button primary'));
  const grid=el('div','inspiration-grid');
  box.append(el('h3','','Plantillas'),grid);
  for(const t of [...state.templates,...starters]){
    const card=el('article','feature-card');
    card.append(el('span','feature-icon','🧺'),el('h3','',t.name),el('p','',`${t.items?.length||t.names.length} productos`),button('Elegir productos',()=>api.batchReview(t.items||t.names.map(n=>parseItem(n,state.customProducts)),t.name)));
    if(t.id)card.append(button('Eliminar plantilla',()=>api.confirmAction('Eliminar plantilla',t.name,()=>api.commit('Plantilla eliminada',s=>s.templates=s.templates.filter(x=>x.id!==t.id))),'text-button'));
    grid.append(card);
  }
  box.append(el('h3','','Mis recetas'));
  if(!state.recipes.length)box.append(empty('Guarda una receta con sus ingredientes y agrégalos a tu lista cuando los necesites.'));
  for(const r of state.recipes){
    const card=el('article','feature-card recipe-card');
    card.append(el('h3','',r.title),el('p','',`${r.servings} porciones`),button(r.favorite?'★ Favorita':'☆ Marcar favorita',()=>api.commit('',s=>{const recipe=s.recipes.find(x=>x.id===r.id);recipe.favorite=!recipe.favorite;}),'text-button'),button('Ver receta',()=>recipeDetails(r)),button('Editar',()=>recipeForm(r),'text-button'));
    box.append(card);
  }
}

function recipeForm(recipe){
  const {d,content}=dialog(recipe?'Editar receta':'Nueva receta'),form=el('form'),title=input(recipe?.title||''),servings=input(recipe?.servings||'2','','number'),ingredients=el('textarea'),instructions=el('textarea'),source=input(recipe?.source||'','https://…','url');
  title.required=true;title.maxLength=100;servings.required=true;servings.min=1;servings.max=100;ingredients.required=true;ingredients.value=recipe?.rawIngredients||'';ingredients.rows=5;ingredients.maxLength=10000;instructions.value=recipe?.instructions||'';instructions.maxLength=20000;
  form.append(field('Título',title),field('Porciones',servings),field('Ingredientes (uno por línea)',ingredients),field('Preparación',instructions),field('Enlace de la receta (opcional)',source),el('p','section-description','Captura manual de ingredientes.'));
  const b=button('Guardar receta',null,'button primary');b.type='submit';form.append(b);
  form.onsubmit=async e=>{
    e.preventDefault();
    const r={id:recipe?.id||uuid(),title:title.value.trim(),servings:Number(servings.value),rawIngredients:ingredients.value,instructions:instructions.value,source:source.value,ingredients:parseShoppingText(ingredients.value,api.state().customProducts),favorite:recipe?.favorite||false};
    if(!r.title)return;
    if(await api.commit('Receta guardada',s=>{s.recipes=s.recipes.filter(x=>x.id!==r.id);s.recipes.push(r);}))d.close();
  };
  content.append(form);
}

function recipeDetails(recipe){
  const {content}=dialog(recipe.title),servings=input(recipe.servings,'','number');
  servings.min=1;servings.max=100;servings.required=true;
  content.append(field('Porciones para esta compra',servings),el('p','recipe-instructions',recipe.instructions));
  if(recipe.source&&/^https?:\/\//.test(recipe.source)){
    const a=el('a','text-button','Ver fuente');a.href=recipe.source;a.target='_blank';a.rel='noopener noreferrer';content.append(a);
  }
  content.append(button('Revisar ingredientes',()=>{
    if(!servings.reportValidity())return;
    api.batchReview(recipe.ingredients.map(i=>({...i,quantity:i.quantity?String(Math.round(Number(i.quantity)*Number(servings.value)/recipe.servings*1000)/1000):null})),'Ingredientes de '+recipe.title);
  },'button primary'),button('Eliminar receta',()=>api.confirmAction('Eliminar receta',recipe.title,()=>api.commit('Receta eliminada',s=>s.recipes=s.recipes.filter(r=>r.id!==recipe.id))),'text-button'));
}

function renderOffers(){
  const box=api.section('Ofertas registradas','Guarda ofertas de tus tiendas favoritas para compararlas.');
  box.append(button('＋ Registrar oferta',()=>offerForm(),'button primary'),button('Mis tarjetas de fidelidad',()=>loyalty()));
  if(!api.state().offers.length)box.append(empty('Todavía no has registrado ofertas.'));
  for(const offer of api.state().offers){
    const card=el('article','feature-card'),expired=offer.until<new Date().toISOString().slice(0,10);
    card.append(el('h3','',offer.name),el('p','',`${offer.store} · $${offer.price} MXN · ${offer.package}`),el('p','',`${expired?'Vencida':'Vigente hasta'} ${offer.until}`),el('p','',offer.conditions),button('Agregar a mi lista',()=>api.batchReview([{...parseItem(offer.name,api.state().customProducts),notes:`${offer.store}: ${offer.conditions}`,priority:'offer'}])),button('Eliminar',()=>api.commit('Oferta eliminada',s=>s.offers=s.offers.filter(o=>o.id!==offer.id)),'text-button'));
    box.append(card);
  }
}

function offerForm(){
  const {d,content}=dialog('Registrar oferta'),form=el('form'),fields={name:input('','Producto'),store:input('','Tienda'),price:input('','','number'),package:input('','Ej. paquete de 500 g'),until:input('','','date'),conditions:input('','Condiciones')};
  fields.price.min='0';fields.price.step='.01';
  for(const [k,n]of Object.entries(fields)){
    n.required=k!=='conditions';n.maxLength=200;
    form.append(field({name:'Producto',store:'Tienda',price:'Precio MXN',package:'Presentación',until:'Vigencia hasta',conditions:'Condiciones'}[k],n));
  }
  const b=button('Guardar oferta',null,'button primary');b.type='submit';form.append(b);
  form.onsubmit=async e=>{
    e.preventDefault();
    if(await api.commit('Oferta guardada',s=>s.offers.push({id:uuid(),...Object.fromEntries(Object.entries(fields).map(([k,n])=>[k,n.value]))})))d.close();
  };
  content.append(form);
}

function loyalty(){
  const {content}=dialog('Mis tarjetas de fidelidad');
  content.append(el('p','','Se guardan de forma privada en este dispositivo. No ingreses datos de tarjetas bancarias.'));
  for(const card of api.state().cards){
    const row=el('div','feature-card');
    row.append(el('h3','',card.store),el('p','loyalty-number',card.number),button('Eliminar',async()=>{await api.commit('Tarjeta eliminada',s=>s.cards=s.cards.filter(c=>c.id!==card.id));loyalty();},'text-button'));
    content.append(row);
  }
  const form=el('form'),store=input('','Nombre de tienda'),number=input('','Número de socio');
  store.required=true;number.required=true;store.maxLength=80;number.maxLength=80;
  form.append(field('Tienda',store),field('Número de fidelidad',number));
  const b=button('Guardar tarjeta',null,'button primary');b.type='submit';form.append(b);
  form.onsubmit=async e=>{
    e.preventDefault();
    if(!store.value.trim()||!number.value.trim())return;
    await api.commit('Tarjeta guardada',s=>s.cards.push({id:uuid(),store:store.value.trim(),number:number.value.trim()}));
    loyalty();
  };
  content.append(form);
}

function renderProfile(){
  const state=api.state(),box=api.section('Perfil y configuración','Gestiona tus datos locales y tu sesión para sincronizar y compartir listas.'),card=el('section','feature-card'),name=input(state.settings.name),timezone=input(state.settings.timezone),theme=select({light:'Claro',dark:'Oscuro',system:'Sistema'},state.settings.theme),budget=input('','','checkbox');
  budget.checked=state.settings.budget;name.maxLength=80;
  const form=el('form');
  form.append(field('Nombre',name),field('Zona horaria',timezone),field('Apariencia',theme),field('Activar presupuesto estimado',budget));
  const b=button('Guardar preferencias',null,'button primary');b.type='submit';form.append(b);
  form.onsubmit=async e=>{
    e.preventDefault();
    try{new Intl.DateTimeFormat('es-MX',{timeZone:timezone.value});}catch{api.toast('Escribe una zona horaria válida.');return;}
    await api.commit('Preferencias guardadas',s=>Object.assign(s.settings,{name:name.value.trim(),timezone:timezone.value,theme:theme.value,budget:budget.checked}));
    api.applyTheme();
  };
  card.append(form);
  box.append(card);

  const account=el('section','feature-card');
  account.append(el('h3','','Cuenta y Nube (Firebase)'),el('p','','Inicia sesión para sincronizar tus listas en la nube y colaborar con tu familia o amigos en tiempo real.'),button('Gestionar cuenta de usuario',()=>authForm(),'button primary'));
  box.append(account,button('Exportar copia local de datos',()=>download('daylist-datos.json',state)),button('Tarjetas de fidelidad',()=>loyalty()));
}

async function authForm(){
  const {content}=dialog('Cuenta de usuario'),message=el('p','form-error');
  content.append(message);
  try{
    const f=await accounts.firebase();
    await f.auth.authStateReady();
    if(f.auth.currentUser){
      const u=f.auth.currentUser;
      content.append(el('h3','',u.displayName?`Hola, ${u.displayName}`:'Sesión iniciada'),el('p','',u.email),el('p','section-description',u.emailVerified?'✓ Correo verificado':'⚠️ Verifica tu correo para acceder a funciones compartidas.'));
      if(!u.emailVerified){
        content.append(button('Enviar correo de verificación',async()=>{
          try{await f.sendEmailVerification(u);api.toast('Correo enviado.');}catch(e){message.textContent=accounts.authMessage(e);}
        }));
      }
      content.append(button('Cerrar sesión',async()=>{
        await accounts.signOut();
        $('#workspace-dialog').close();
        api.toast('Sesión cerrada. Tus listas locales se conservan.');
      },'button destructive'));
      return;
    }
  }catch(e){
    message.textContent=accounts.authMessage(e);
  }

  const form=el('form'),mode=select({login:'Iniciar sesión',register:'Crear nueva cuenta'},'login'),name=input('','Tu nombre'),email=input('','','email'),password=input('','','password');
  email.required=true;password.required=true;password.minLength=6;
  form.append(field('Acción',mode),field('Nombre (para nueva cuenta)',name),field('Correo electrónico',email),field('Contraseña',password));
  const submit=button('Continuar',null,'button primary');submit.type='submit';
  form.append(submit,button('Restablecer contraseña',async()=>{
    if(!email.reportValidity())return;
    try{await accounts.recover(email.value);message.textContent='Instrucciones enviadas al correo proporcionado.';}catch(e){message.textContent=accounts.authMessage(e);}
  },'text-button'));

  form.onsubmit=async e=>{
    e.preventDefault();
    submit.disabled=true;
    try{
      if(mode.value==='register')await accounts.register(email.value,password.value,name.value);
      else await accounts.signIn(email.value,password.value);
      await authForm();
    }catch(err){
      message.textContent=accounts.authMessage(err);
    }finally{
      submit.disabled=false;
    }
  };
  content.append(form);
}

function sharing(){
  const {content}=dialog('Compartir lista');
  const currentList = api.current();
  content.append(el('h3','',`Compartir "${currentList.name}"`),el('p','','Invita a otras personas por correo para que puedan colaborar en esta lista.'));
  
  const memberEmail = input('','correo@ejemplo.com','email');
  memberEmail.required = true;
  const statusMsg = el('p','form-error');

  content.append(field('Correo electrónico de la persona invitada', memberEmail), statusMsg);

  content.append(button('Enviar invitación y guardar en la nube', async()=>{
    if(!memberEmail.value.trim() || !memberEmail.reportValidity()){
      statusMsg.textContent = 'Por favor ingresa un correo válido.';
      return;
    }
    try {
      statusMsg.textContent = 'Guardando lista en la nube...';
      const result = await accounts.saveSharedList(currentList, [memberEmail.value.trim()]);
      api.toast(`Lista compartida con ${memberEmail.value.trim()}`);
      $('#workspace-dialog').close();
    } catch(e) {
      statusMsg.textContent = accounts.authMessage(e);
    }
  }, 'button primary'));

  content.append(el('p','section-description','También puedes exportar un archivo con la lista para enviarlo por mensaje:'), button('Exportar copia en archivo JSON',()=>download(currentList.name+'.json',currentList),'text-button'));
}

