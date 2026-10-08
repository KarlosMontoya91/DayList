import {$,el,button,input,select,field,empty,dialog,download} from './ui.js';
import {parseItem,parseShoppingText} from './parser.js';
import * as accounts from './firebase.js';
let api,recognition;
const uuid=()=>crypto.randomUUID();
export function mountExtras(value){api=value;return {voice,sharing,authForm,updateHeaderUser};}
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
  const {content}=dialog('');
  content.replaceChildren();

  const container = el('div', 'google-auth-modal');
  const logo = el('img', 'daylist-modal-logo');
  logo.src = './icon.svg';
  logo.alt = 'DayList Logo';
  logo.width = 64;
  logo.height = 64;

  const title = el('h2', 'auth-modal-title', 'Bienvenido a DayList');
  const subtitle = el('p', 'section-description', 'Inicia sesión con tu cuenta de Google para guardar tus listas en la nube y compartirlas en tiempo real.');
  const message = el('p', 'form-error');

  container.append(logo, title, subtitle, message);

  try{
    const f=await accounts.firebase();
    await f.auth.authStateReady();
    if(f.auth.currentUser){
      const u=f.auth.currentUser;
      const initials = getInitials(u.displayName || u.email);
      
      const userCard = el('div', 'auth-user-card');
      if(u.photoURL){
        const img = el('img', 'user-card-avatar');
        img.src = u.photoURL;
        img.alt = u.displayName || 'Avatar';
        userCard.append(img);
      } else {
        userCard.append(el('span', 'user-card-initials', initials));
      }

      const userInfo = el('div', 'user-card-info');
      userInfo.append(el('strong', '', u.displayName || 'Usuario Google'), el('small', '', u.email));
      userCard.append(userInfo);

      container.append(userCard);

      const logoutBtn = button('Cerrar sesión', async()=>{
        logoutBtn.disabled = true;
        await accounts.signOut();
        $('#workspace-dialog').close();
        api.toast('Sesión cerrada correctamente.');
        updateHeaderUser(null);
      }, 'button destructive');

      container.append(logoutBtn);
      content.append(container);
      return;
    }
  }catch(e){
    message.textContent = accounts.authMessage(e);
  }

  const googleSvg = `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>`;

  const btnGoogle = el('button', 'button secondary btn-google-official');
  btnGoogle.type = 'button';
  btnGoogle.innerHTML = `${googleSvg} <span>Continuar con Google</span>`;

  btnGoogle.onclick = async () => {
    btnGoogle.disabled = true;
    message.textContent = '';
    try {
      const result = await accounts.signInWithGoogle();
      updateHeaderUser(result.user);
      $('#workspace-dialog').close();
      api.toast(`¡Bienvenido, ${result.user.displayName || 'Usuario'}!`);
    } catch(err) {
      message.textContent = accounts.authMessage(err);
    } finally {
      btnGoogle.disabled = false;
    }
  };

  container.append(btnGoogle);
  content.append(container);
}

function getInitials(name){
  if(!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function updateHeaderUser(user){
  const avatarSlot = $('#header-avatar-slot');
  const labelSlot = $('#header-auth-label');
  const sidebarAvatar = $('#sidebar-avatar');
  const sidebarStatus = $('#sidebar-status-text');

  if(user){
    const initials = getInitials(user.displayName || user.email);
    if(avatarSlot){
      if(user.photoURL){
        avatarSlot.innerHTML = `<img src="${user.photoURL}" class="user-header-img" alt="Avatar">`;
      } else {
        avatarSlot.textContent = initials;
      }
    }
    if(labelSlot) labelSlot.textContent = user.displayName ? user.displayName.split(' ')[0] : 'Cuenta';
    if(sidebarAvatar){
      if(user.photoURL){
        sidebarAvatar.innerHTML = `<img src="${user.photoURL}" class="user-sidebar-img" alt="Avatar">`;
      } else {
        sidebarAvatar.textContent = initials;
      }
    }
    if(sidebarStatus) sidebarStatus.textContent = user.email;
  } else {
    if(avatarSlot) avatarSlot.textContent = '👤';
    if(labelSlot) labelSlot.textContent = 'Iniciar sesión';
    if(sidebarAvatar) sidebarAvatar.textContent = '👤';
    if(sidebarStatus) sidebarStatus.textContent = 'Guardado en este dispositivo';
  }
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

