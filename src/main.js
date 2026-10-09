import {purchaseDialog,renderSpending,renderCompare} from './purchases.js';
import {catalog,categories,iconOptions,productIcon,searchProducts,exactProduct,normalize,units} from './catalog.js';
import {parseItem,parseShoppingText,identity,validQuantity,decimalAdd} from './parser.js';
import {load,write} from './storage.js';
import {$,el,button,input,select,field,empty,dialog,download} from './ui.js';
import {mountExtras,renderExtra} from './extras.js';
import {createIconPicker} from './icon-picker.js';
import {paintIcon,iconNode} from './icon-service.js';
const uuid=()=>crypto.randomUUID(),priorities={normal:'Normal',urgent:'Urgente',convenient:'Cuando convenga',offer:'Solo en oferta'};
let state,filter='all',view='lists',toastTimer,busy=false,undo=null,searchPage=0;
const current=()=>state.lists.find(l=>l.id===state.active),findList=(s,id=state.active)=>s.lists.find(l=>l.id===id),visibleLists=()=>state.lists.filter(l=>!l.archived);
const allCategories=()=>[...categories.map(c=>c.name),...state.customCategories,'Sin categoría'];
const categorySelect=value=>select(Object.fromEntries(allCategories().map(c=>[c,c])),value);

const iconGroupOutline = `<svg class="btn-outline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`;
const iconGridOutline = `<svg class="btn-outline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;
const iconListOutline = `<svg class="btn-outline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
const iconShoppingOutline = `<svg class="btn-outline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
const iconShareOutline = `<svg class="btn-outline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
const iconActivityOutline = `<svg class="btn-outline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

function updateTodayDate(){
  const badge = $('#header-today-date');
  if(!badge) return;
  const now = new Date();
  const text = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  badge.textContent = `· ${text.charAt(0).toUpperCase() + text.slice(1)}`;
}

function registerListAsTemplate(list){
  if(!list || !list.name) return;
  state.templates ??= [];
  const existing = state.templates.find(t => t.name.trim().toLowerCase() === list.name.trim().toLowerCase());
  const templateItems = (list.items || []).map(i => ({
    name: i.name,
    category: i.category,
    quantity: i.quantity,
    unit: i.unit,
    emoji: i.emoji,
    icon_key: i.icon_key,
    packageSize: i.packageSize,
    packageUnit: i.packageUnit,
    brand: i.brand,
    variant: i.variant,
    notes: i.notes
  }));
  if(existing){
    existing.items = templateItems;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.templates.unshift({
      id: uuid(),
      name: list.name,
      items: templateItems,
      createdAt: new Date().toISOString()
    });
  }
  if(state.templates.length > 50) state.templates = state.templates.slice(0, 50);
}

async function reuseTemplateAsNew(template){
  const id = uuid();
  const dateSuffix = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  const newName = `${template.name} (${dateSuffix})`;
  const items = (template.items || []).map(i => ({
    ...structuredClone(i),
    id: uuid(),
    done: false,
    purchaseId: null,
    createdAt: new Date().toISOString()
  }));
  const ok = await commit(`Lista "${template.name}" reutilizada`, s => {
    s.lists.push({
      id,
      name: newName,
      items,
      recent: [],
      activity: [{ id: uuid(), text: `Lista creada a partir de plantilla "${template.name}"`, at: new Date().toISOString(), actor: s.settings.name || 'Tú' }],
      categoryOrder: []
    });
    s.active = id;
    registerListAsTemplate({ name: newName, items });
  });
  if(ok){
    filter = 'all';
    switchView('lists');
    toast(`Lista "${newName}" lista para usar. Puedes agregar o quitar productos.`);
  }
}

function migrate(old){const next={version:2,revision:0,active:null,lists:[],customProducts:[],customCategories:[],templates:[],recipes:[],offers:[],cards:[],settings:{name:'Mi espacio',timezone:'America/Monterrey',view:'rows',group:false,budget:false,theme:localStorage.getItem('verde-theme')||'light'}};if(old?.lists?.length){next.lists=old.lists.map(l=>({...l,activity:[],recent:[],categoryOrder:[],items:l.items.map(i=>{const p=exactProduct(i.name);return {...i,productId:p?.id||'custom-'+uuid(),emoji:p?.emoji||productIcon(i.name),category:p?.category||i.category,quantity:i.qty==null?null:String(i.qty),unit:'piece',priority:'normal',brand:'',variant:'',notes:'',packageSize:null,packageUnit:'liter'};})}));next.active=old.active;for(const l of next.lists)for(const i of l.items)if(i.productId.startsWith('custom-')&&!next.customProducts.some(p=>normalize(p.name)===normalize(i.name)))next.customProducts.push({id:i.productId,name:i.name,emoji:i.emoji,category:i.category,unit:i.unit,aliases:[]});}if(!next.lists.length){const id=uuid();next.active=id;next.lists=[{id,name:'Mi compra semanal',items:[],recent:[],activity:[],categoryOrder:[]}];}if(!next.lists.some(l=>l.id===next.active))next.active=next.lists[0].id;return next;}
function toast(text,canUndo=false){const t=$('#toast');t.replaceChildren(el('span','',text));if(canUndo&&undo)t.append(button('Deshacer',async()=>{const snapshot=undo;undo=null;await commit('Acción deshecha',draft=>Object.assign(draft,{...snapshot,revision:draft.revision}));},'undo'));t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),7000);}
function activity(list,text){list.activity??=[];list.activity.unshift({id:uuid(),text,at:new Date().toISOString(),actor:state.settings.name||'Tú'});list.activity=list.activity.slice(0,500);}
async function commit(message,mutate,reversible=false){if(busy){toast('Espera a que termine el guardado.');return false;}busy=true;const old=structuredClone(state),draft=structuredClone(state);try{mutate(draft);draft.revision=(state.revision||0)+1;await write(draft,state.revision);state=draft;undo=reversible?old:null;render();if(message)toast(message,reversible);return true;}catch(e){if(e.message==='CONFLICT'){const fresh=await load();if(fresh)state=fresh;render();toast('Otra pestaña cambió la lista. Actualizamos la vista; revisa y vuelve a guardar.');}else if(e.message==='COLLISION')toast('Ya existe esa variante. Cambia sus notas o edita la entrada existente.');else toast('No se pudo guardar. Conservamos tu formulario; libera espacio e inténtalo de nuevo.');return false;}finally{busy=false;}}
function appendItem(list,item){const existing=list.items.find(i=>identity(i)===identity(item));if(existing){if(!existing.done)return 'duplicate';existing.done=false;existing.purchaseId=null;activity(list,`Volvió a agregar ${existing.name}`);return 'reactivated';}list.items.push({...item,id:uuid(),done:false,purchaseId:null,createdAt:new Date().toISOString()});activity(list,`Agregó ${item.name}`);return 'added';}
async function addProduct(product,details={}){const item={name:product.name,productId:product.id,category:product.category,emoji:product.emoji,icon_key:product.icon_key||null,quantity:null,unit:product.unit||'piece',packageSize:null,packageUnit:'liter',brand:'',variant:'',notes:'',priority:'normal',...details};const existing=current().items.find(i=>identity(i)===identity(item)&&!i.done);if(existing){toast('Ya está en tu lista. Puedes editar su cantidad.');openProduct(existing,'edit');return;}filter='all';if(await commit(`${item.name} agregado`,s=>appendItem(findList(s),item))){$('#item-name').value='';$('#search-results').hidden=true;}}
function confirmAction(title,message,action){const {d,content}=dialog(title);content.append(el('p','',message));const actions=el('div','actions');actions.append(button('Cancelar',()=>d.close()),button('Confirmar',async()=>{if(await action())d.close();},'button primary'));content.append(actions);}
function createList(mode='new'){
  const active=current(),{d,content}=dialog(mode==='new'?'Nueva lista':'Renombrar lista');
  const form=el('form'),name=input(mode==='new'?'':active.name,'Casa, Oficina, Fiesta…');
  name.required=true;name.maxLength=60;name.id='list-name';
  form.append(field('Nombre de la lista',name));
  
  if(mode==='new' && state.templates?.length){
    const choices = { '': 'Comenzar en blanco (sin plantilla)' };
    state.templates.forEach(t => {
      choices[t.id || t.name] = `📋 ${t.name} (${t.items?.length || 0} productos)`;
    });
    const tplSelect = select(choices, '');
    tplSelect.id = 'template-select';
    form.append(field('Reutilizar plantilla o historial (opcional)', tplSelect));
    tplSelect.onchange = () => {
      const chosen = state.templates.find(t => (t.id || t.name) === tplSelect.value);
      if(chosen && !name.value.trim()){
        name.value = `${chosen.name} (${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })})`;
      }
    };
  }

  const save=button('Guardar lista',null,'button primary');
  save.id='save-list';
  save.type='submit';
  form.append(save);
  form.onsubmit=async e=>{
    e.preventDefault();
    if(!name.value.trim())return;
    const tplId = form.querySelector('#template-select')?.value;
    const chosenTpl = tplId ? state.templates.find(t => (t.id || t.name) === tplId) : null;
    const initialItems = chosenTpl ? (chosenTpl.items || []).map(i => ({
      ...structuredClone(i),
      id: uuid(),
      done: false,
      purchaseId: null,
      createdAt: new Date().toISOString()
    })) : [];

    const ok=await commit('Lista guardada',s=>{
      if(mode==='new'){
        const id=uuid();
        const newList = {
          id,
          name:name.value.trim(),
          items:initialItems,
          recent:[],
          activity:[{ id: uuid(), text: chosenTpl ? `Lista creada a partir de plantilla "${chosenTpl.name}"` : 'Lista creada', at: new Date().toISOString(), actor: s.settings.name || 'Tú' }],
          categoryOrder:[]
        };
        s.lists.push(newList);
        s.active=id;
        registerListAsTemplate(newList);
      } else {
        findList(s).name=name.value.trim();
        registerListAsTemplate(findList(s));
      }
    });
    if(ok){
      filter='all';
      d.close();
      render();
    }
  };
  content.append(form);
  name.focus();
}

function openProduct(item={},mode='create',addAfter=true){const originalList=state.active,{d,content}=dialog(mode==='edit'?'Detalles del producto':mode==='catalog-edit'?'Editar producto propio':'Nuevo producto');const form=el('form','product-form'),name=input(item.name||$('#item-name').value.trim(),'Nombre del producto');name.required=true;name.maxLength=80;name.id='product-name';const category=categorySelect(item.category||'Sin categoría');category.id='product-category';let chosen=item.emoji||productIcon(name.value),iconKey=item.icon_key||null,photo=item.photo||null;const preview=el('div','product-preview');preview.append(el('span','',chosen),el('p','','El icono pertenece al producto, no a su categoría.'));const chosenIcon=preview.firstChild;paintIcon(chosenIcon,iconKey,chosen);const picker=createIconPicker({name:name.value,category:category.value,value:iconKey,onConfirm:key=>{iconKey=key;paintIcon(chosenIcon,key,chosen);}});name.addEventListener('input',()=>picker.updateContext(name.value,category.value));category.addEventListener('change',()=>picker.updateContext(name.value,category.value));form.append(preview,field('Nombre',name),field('Categoría',category));
 const newCategory=button('＋ Crear categoría',()=>{const wrap=el('div','inline-create'),n=input('','Nombre de categoría');n.maxLength=50;let categoryKey=null;const cp=createIconPicker({name:'',onConfirm:key=>categoryKey=key});n.addEventListener('input',()=>cp.updateContext(n.value,n.value));wrap.append(n,cp,button('Guardar categoría',async()=>{const value=n.value.trim();if(!value)return;if(cp.hasPending()){toast('Confirma el icono de la categoría antes de guardar.');return;}if(allCategories().some(c=>normalize(c)===normalize(value))){toast('Esa categoría ya existe.');return;}if(await commit('Categoría creada',s=>{s.customCategories.push(value);s.categoryIcons??={};s.categoryIcons[value]={icon_key:categoryKey};})){const o=el('option','',value);o.value=value;category.append(o);category.value=value;picker.updateContext(name.value,value);wrap.remove();}}));newCategory.after(wrap);n.focus();},'text-button');form.append(newCategory,categoryIconEditor(()=>category.value),field('Icono del producto',picker));
 const qty=input(item.quantity,'Sin especificar','number');qty.min='.001';qty.max='999999';qty.step='.001';qty.id='product-quantity';const unit=select(units,item.unit||'piece'),pack=input(item.packageSize,'Sin especificar','number');pack.min='.001';pack.max='999999';pack.step='.001';const packUnit=select(units,item.packageUnit||'liter'),brand=input(item.brand||'','Opcional'),variant=input(item.variant||'','Ej. deslactosada, talla M'),notes=el('textarea');brand.maxLength=80;variant.maxLength=100;notes.value=item.notes||'';notes.maxLength=500;const priority=select(priorities,item.priority||'normal'),grid=el('div','form-grid');grid.append(field('Cantidad solicitada',qty),field('Unidad de compra',unit),field('Contenido por presentación',pack),field('Unidad de la presentación',packUnit),field('Marca',brand),field('Variante',variant),field('Prioridad',priority));form.append(grid,field('Notas',notes));
 const upload=input('','','file');upload.accept='image/jpeg,image/png,image/webp';const photoPreview=el('div','photo-preview');function drawPhoto(){photoPreview.replaceChildren();if(photo){const image=el('img');image.src=photo;image.alt='Foto de referencia';photoPreview.append(image,button('Quitar foto',()=>{photo=null;drawPhoto();},'text-button'));}}drawPhoto();upload.onchange=async()=>{const f=upload.files[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024){toast('Usa JPG, PNG o WebP de hasta 3 MB.');upload.value='';return;}try{const bitmap=await createImageBitmap(f),canvas=document.createElement('canvas'),scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);photo=canvas.toDataURL('image/webp',.8);bitmap.close();drawPhoto();}catch{toast('No pudimos leer esa imagen.');}};form.append(field('Foto de referencia opcional (solo en este dispositivo)',upload),photoPreview);
 let price;if(state.settings.budget){price=input(item.price,'Sin precio','number');price.min='0';price.step='.01';form.append(field('Precio estimado MXN por unidad de compra',price));}const error=el('p','form-error');error.setAttribute('role','alert');const save=button(mode==='edit'?'Guardar cambios':mode==='catalog-edit'?'Guardar producto':addAfter?'Crear y agregar a la lista':'Crear producto',null,'button primary');save.type='submit';save.id='save-product';form.append(error,save);
 form.onsubmit=async e=>{e.preventDefault();const value=name.value.trim();if(!value||!validQuantity(qty.value)||!validQuantity(pack.value)){error.textContent='Revisa el nombre y usa cantidades positivas con hasta 3 decimales.';return;}const duplicate=exactProduct(value,state.customProducts);if((mode==='create'||mode==='catalog-edit')&&duplicate&&duplicate.id!==item.id){error.textContent='Este producto ya existe. Búscalo y edita sus detalles dentro de la lista.';return;}if(picker.hasPending()){error.textContent='Pulsa Confirmar icono antes de guardar.';return;}const details={name:value,category:category.value,emoji:chosen,icon_key:iconKey,quantity:qty.value||null,unit:unit.value,packageSize:pack.value||null,packageUnit:packUnit.value,brand:brand.value.trim(),variant:variant.value.trim(),notes:notes.value.trim(),priority:priority.value,photo,...(price?{price:price.value||null}:{})};const ok=await commit('Producto guardado',s=>{if(mode==='edit'){const l=findList(s,originalList),target=l.items.find(i=>i.id===item.id);if(l.items.some(i=>i.id!==item.id&&identity(i)===identity({...target,...details})))throw Error('COLLISION');Object.assign(target,details);activity(l,`Editó ${value}`);}else if(mode==='catalog-edit'){Object.assign(s.customProducts.find(p=>p.id===item.id),{name:value,category:category.value,emoji:chosen,icon_key:iconKey,unit:unit.value});}else{const p={id:'custom-'+uuid(),name:value,category:category.value,emoji:chosen,icon_key:iconKey,unit:unit.value,aliases:[]};s.customProducts.push(p);if(addAfter)appendItem(findList(s,originalList),{...details,productId:p.id});}});if(ok){d.close();$('#item-name').value='';$('#search-results').hidden=true;}};
 if(mode==='edit'){const actions=el('div','actions');actions.append(button('Copiar a otra lista',()=>transferItem(item,false)),button('Mover a otra lista',()=>transferItem(item,true)));form.append(actions);}content.append(form);name.focus();}
function transferItem(item,move){const origin=state.active,{d,content}=dialog(move?'Mover producto':'Copiar producto'),choices=visibleLists().filter(l=>l.id!==origin);if(!choices.length){content.append(empty('Crea otra lista para usar esta opción.'));return;}const target=select(Object.fromEntries(choices.map(l=>[l.id,l.name])),choices[0].id);content.append(field('Lista de destino',target),button(move?'Mover':'Copiar',async()=>{if(findList(state,target.value).items.some(i=>identity(i)===identity(item)&&!i.done)){toast('El producto ya está pendiente en destino. No se movió.');return;}if(await commit(move?'Producto movido':'Producto copiado',s=>{appendItem(findList(s,target.value),{...item,done:false});if(move){const l=findList(s,origin);l.items=l.items.filter(i=>i.id!==item.id);activity(l,`Movió ${item.name}`);}},true))d.close();},'button primary'));}
async function setPurchased(id,done){const list=current(),item=list.items.find(i=>i.id===id);if(done){renderRows();purchaseDialog({state:()=>state,commit,activity},item,list.id);return;}await commit('Producto pendiente; compra anulada',s=>{const l=findList(s),i=l.items.find(i=>i.id===id);s.purchases=(s.purchases||[]).filter(p=>p.id!==i.purchaseId);i.done=false;i.purchaseId=null;i.purchasedAt=null;activity(l,`Reactivó ${i.name}`);},true);}
function renderRows(){const list=current(),container=$('#items');container.replaceChildren();container.className='items '+(state.settings.view==='tiles'?'tiles':'');let items=filter==='recent'?list.recent:list.items.filter(i=>filter==='all'||(filter==='done'?i.done:!i.done));if(document.body.classList.contains('shopping'))items=items.filter(i=>!i.done);if(!items.length){container.append(empty(filter==='recent'?'Aquí aparecerán los productos que retires de la lista.':filter==='pending'?'No tienes productos pendientes.':'Busca en el catálogo o crea tu primer producto.'));return;}const grouped=state.settings.group||document.body.classList.contains('shopping');if(grouped){const order=list.categoryOrder||[];items=[...items].sort((a,b)=>{const ai=order.indexOf(a.category),bi=order.indexOf(b.category);return (ai<0?999:ai)-(bi<0?999:bi)||a.category.localeCompare(b.category,'es');});}let previous='';for(const item of items){if(grouped&&previous!==item.category){previous=item.category;const heading=el('h3','category-heading');heading.append(iconNode(state.categoryIcons?.[item.category]?.icon_key,'','category-heading-icon'),document.createTextNode(item.category));container.append(heading);}const row=el('div',`item${item.done?' done':''}`),check=el('input','check');check.type='checkbox';check.checked=item.done;check.setAttribute('aria-label',`Marcar ${item.name} como ${item.done?'pendiente':'comprado'}`);check.onchange=()=>setPurchased(item.id,check.checked);const image=button(item.emoji||productIcon(item.name),()=>openProduct(item,'edit'),'item-emoji');paintIcon(image,item.icon_key,item.emoji||productIcon(item.name));image.setAttribute('aria-label',`Cambiar icono de ${item.name}`);const info=button('',()=>openProduct(item,'edit'),'item-info');info.append(el('strong','',item.name),el('small','',item.category));const details=[item.quantity?`${item.quantity} ${units[item.unit]}`:'Cantidad sin especificar',item.packageSize?`${item.packageSize} ${units[item.packageUnit]} por ${units[item.unit]}`:'',item.brand,item.variant,item.notes].filter(Boolean);info.append(el('span','item-details',details.join(' · ')));if(item.priority&&item.priority!=='normal')info.append(el('span','priority '+item.priority,priorities[item.priority]));const quantity=el('div','quantity');for(const delta of [-1,1]){if(delta===1)quantity.append(el('span','',item.quantity??'—'));const b=button(delta<0?'−':'+',()=>commit('Cantidad actualizada',s=>{const i=findList(s).items.find(i=>i.id===item.id);i.quantity=i.quantity==null?'1':decimalAdd(i.quantity,delta);}), '');b.setAttribute('aria-label',`${delta<0?'Reducir':'Aumentar'} cantidad de ${item.name}`);b.disabled=delta<0&&(item.quantity==null||Number(item.quantity)<=1)||delta>0&&Number(item.quantity)>=999999;quantity.append(b);}const remove=button('×',()=>commit(`${item.name} eliminado`,s=>{const l=findList(s);l.recent=[{...item,deletedAt:new Date().toISOString()},...l.recent.filter(i=>i.id!==item.id)].slice(0,150);l.items=l.items.filter(i=>i.id!==item.id);activity(l,`Eliminó ${item.name}`);},true),'remove');remove.setAttribute('aria-label',`Eliminar ${item.name}`);if(filter==='recent'){row.append(iconNode(item.icon_key,item.emoji,'item-emoji'),el('div','item-info',item.name),button('Reutilizar',()=>commit('Producto recuperado',s=>{const l=findList(s);appendItem(l,item);l.recent=l.recent.filter(i=>i.id!==item.id);})) );}else row.append(check,image,info,quantity,remove);container.append(row);}}
function render(){const list=current();if(!list)return;updateTodayDate();const done=list.items.filter(i=>i.done).length,total=list.items.length,percent=total?Math.round(done/total*100):0;$('#list-select').replaceChildren(...visibleLists().map(l=>{const o=el('option','',l.name);o.value=l.id;return o;}));$('#list-select').value=state.active;$('#list-count').textContent=visibleLists().length;$('#progress-text').textContent=`${done} de ${total} productos comprados`;$('#progress-percent').textContent=percent+'%';$('#progress-bar').style.width=percent+'%';$('#all-count').textContent=total;$('#total-stat').textContent=total;$('#done-stat').textContent=done;$('#pending-stat').textContent=total-done;$('#remaining-count').textContent=`${total-done} pendientes`;$('#summary-message').textContent=total===0?'Tu próxima compra empieza aquí.':done===total?'¡Todo listo! Tu lista está completa.':`Te faltan ${total-done} productos. A tu ritmo, vas muy bien.`;$('#clear-done').disabled=!done;document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});renderRows();$('#sync-status').textContent=navigator.onLine?'Guardado en este dispositivo · Invitado':'Sin conexión · Guardado en este dispositivo';$('#group-toggle').setAttribute('aria-pressed',String(state.settings.group));const isTiles=state.settings.view==='tiles';$('#view-toggle').innerHTML=`${isTiles?iconListOutline:iconGridOutline}<span>${isTiles?'Vista lista':'Vista tarjetas'}</span>`;const cats=$('#item-category'),old=cats.value;cats.replaceChildren(el('option','','Todas las categorías'),...allCategories().map(c=>{const o=el('option','',c);o.value=c;return o;}));cats.firstChild.value='';cats.value=old;renderSuggestions();if(view==='catalog')renderCatalog();if(['inspiration','profile'].includes(view))renderExtra(view);if(view==='compare')renderCompare({state:()=>state,section,goLists:()=>switchView('lists')});renderSpending(state,list,$('#spending-summary'));renderBudget();}
function renderBudget(){const area=$('#budget-summary');area.replaceChildren();area.hidden=!state.settings.budget;if(area.hidden)return;const items=current().items,priced=items.filter(i=>i.price!==null&&i.price!==undefined&&i.price!==''&&i.quantity),cents=priced.reduce((sum,i)=>sum+Math.round(Number(i.price)*100*Number(i.quantity)),0);area.append(el('strong','',`Estimado parcial: ${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(cents/100)}`),el('p','',`Faltan precios o cantidades de ${items.length-priced.length} artículos. No es gasto registrado.`));}
function renderSuggestions(){const box=$('#suggestions');box.replaceChildren();const recent=state.lists.flatMap(l=>[...l.items,...l.recent]).filter(i=>i.done||i.deletedAt),products=[...new Map(recent.map(i=>[i.productId,i])).values()].slice(0,4);if(!products.length)products.push(...['Plátano','Leche entera','Huevo de gallina','Pan integral'].map(n=>exactProduct(n)));for(const p of products.filter(Boolean)){const b=button('',()=>addProduct({...p,id:p.productId||p.id}),'suggestion');b.setAttribute('aria-label',`Agregar ${p.name}`);const text=el('div');text.append(el('strong','',p.name),el('small','',recent.length?'¿Lo necesitas de nuevo?':'Del catálogo'));b.append(iconNode(p.icon_key,p.emoji),text,el('span','plus','+'));box.append(b);}}
function search(){const q=$('#item-name').value.trim(),box=$('#search-results');box.replaceChildren();box.hidden=!q;if(!q)return;const draft=parseItem(q,state.customProducts),results=searchProducts(draft.name,state.customProducts).filter(p=>!$('#item-category').value||p.category===$('#item-category').value).slice(0,8);box.append(el('p','search-caption',results.length?'Elige el producto que buscas':'No encontramos ese producto. Puedes crearlo.'));for(const p of results){const b=button('',()=>addProduct(p,{...draft,name:p.name,productId:p.id,category:p.category,emoji:p.emoji}),'search-result');b.append(iconNode(p.icon_key,p.emoji,'result-icon'),el('strong','',p.name),el('small','',p.category),el('span','','＋'));box.append(b);}box.append(button(`＋ Crear “${draft.name}”`,()=>openProduct(draft,'create'),'create-result'));}
function switchView(next){view=next;$('#local-section').hidden=next!=='lists';$('#section-view').hidden=next==='lists';$('.hero').hidden=next!=='lists';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));render();}
function section(title,description){const box=$('#section-view');box.replaceChildren();box.append(el('h2','section-title',title),el('p','section-description',description));return box;}
let catalogPage = 1, activeCategoryTab = '';
function renderCatalog(){
  const box = section('Catálogo de productos', `${catalog.length} productos disponibles · ${state.customProducts.length} creados por ti`);
  const tools = el('div', 'catalog-tools');
  const query = input(state.catalogQuery || '', 'Buscar producto por nombre o sinónimo…');
  query.setAttribute('aria-label', 'Buscar productos');

  const tabsNav = el('nav', 'category-tabs-scroll');
  const allTab = button('✨ Todos', () => { activeCategoryTab = ''; catalogPage = 1; draw(); }, 'category-tab-btn' + (activeCategoryTab===''?' active':''));
  tabsNav.append(allTab);

  for(const c of categories){
    const icon = c.icon || '📦';
    const btn = button(`${icon} ${c.name}`, () => { activeCategoryTab = c.name; catalogPage = 1; draw(); }, 'category-tab-btn' + (activeCategoryTab===c.name?' active':''));
    tabsNav.append(btn);
  }

  tools.append(query, tabsNav);
  box.append(tools);

  const grid = el('div', 'catalog-grid');
  const loadingState = el('div', 'catalog-loading-state');
  box.append(grid, loadingState);

  function getFilteredResults(){
    return searchProducts(query.value, state.customProducts).filter(p => !activeCategoryTab || p.category === activeCategoryTab);
  }

  function draw(){
    state.catalogQuery = query.value;
    const results = getFilteredResults();
    const visibleCount = activeCategoryTab === '' ? (catalogPage * 10) : results.length;
    const itemsToShow = results.slice(0, visibleCount);

    grid.replaceChildren();
    loadingState.replaceChildren();

    if(!results.length){
      grid.append(empty('No se encontraron productos que coincidan con la búsqueda. Puedes crear un producto personalizado.'));
      return;
    }

    for(const p of itemsToShow){
      const tile = el('article', 'catalog-tile');
      const b = button('', () => addProduct(p), 'catalog-product');
      b.append(iconNode(p.icon_key, p.emoji || '📦', 'catalog-icon'), el('strong', '', p.name), el('small', '', p.category));
      b.setAttribute('aria-label', `Agregar ${p.name}`);
      tile.append(b);
      if(p.id.startsWith('custom-')) tile.append(button('Editar', () => openProduct(p, 'catalog-edit', false), 'text-button'));
      grid.append(tile);
    }

    if(activeCategoryTab === '' && visibleCount < results.length){
      loadingState.append(el('p', 'section-description', `Mostrando ${visibleCount} de ${results.length} productos. Desplázate hacia abajo para ver más.`));
    } else if(results.length > 0) {
      loadingState.append(el('p', 'section-description', `Has llegado al final del catálogo (${results.length} productos).`));
    }
  }

  query.oninput = () => { catalogPage = 1; draw(); };

  window.onscroll = () => {
    if(view !== 'catalog' || activeCategoryTab !== '') return;
    if((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 400){
      const total = getFilteredResults().length;
      if(catalogPage * 10 < total){
        catalogPage++;
        draw();
      }
    }
  };

  draw();
}

function listMenu(){
  const {d,content}=dialog('Organizar lista');
  content.append(
    button('Renombrar',()=>createList('rename')),
    button('Duplicar lista',async()=>{
      if(await commit('Lista duplicada',s=>{
        const l=structuredClone(findList(s));
        l.id=uuid();
        l.name+=' (copia)';
        l.items=l.items.map(i=>({...i,id:uuid(),purchaseId:null}));
        l.activity=[];
        l.recent=[];
        s.lists.push(l);
        s.active=l.id;
      }))d.close();
    }),
    button('Archivar lista',()=>confirmAction('Archivar lista','Podrás restaurarla desde este menú.',()=>commit('Lista archivada',s=>{
      findList(s).archived=true;
      let active=s.lists.find(l=>!l.archived);
      if(!active){
        active={id:uuid(),name:'Mi lista',items:[],recent:[],activity:[],categoryOrder:[]};
        s.lists.push(active);
      }
      s.active=active.id;
    }))),
    button('Orden de categorías',()=>categoryOrder()),
    button('Guardar en plantillas (Historial)',async()=>{
      registerListAsTemplate(current());
      await commit('Lista guardada en plantillas',s=>{
        activity(findList(s),'Guardó lista como plantilla');
      });
      d.close();
      toast('Lista guardada en tu historial de plantillas para reutilizar.');
    }),
    button('Exportar lista',()=>download(current().name+'.json',current())),
    button('Eliminar lista',()=>confirmAction('Eliminar lista','Puedes deshacer la operación inmediatamente.',()=>commit('Lista eliminada',s=>{
      s.lists=s.lists.filter(l=>l.id!==s.active);
      let next=s.lists.find(l=>!l.archived);
      if(!next){
        next={id:uuid(),name:'Mi lista',items:[],recent:[],activity:[],categoryOrder:[]};
        s.lists.push(next);
      }
      s.active=next.id;
    },true)),'button destructive')
  );
  if(state.lists.some(l=>l.archived)){
    content.append(el('h3','','Archivadas'));
    for(const l of state.lists.filter(l=>l.archived))content.append(button(`Restaurar ${l.name}`,async()=>{
      if(await commit('Lista restaurada',s=>{
        findList(s,l.id).archived=false;
        s.active=l.id;
      }))d.close();
    }));
  }
}
function categoryOrder(){const {content}=dialog('Recorrido de la tienda');let order=[...new Set([...(current().categoryOrder||[]),...current().items.map(i=>i.category)])];const draw=()=>{content.replaceChildren(el('p','','Sube o baja las categorías según tu recorrido.'));order.forEach((c,i)=>{const row=el('div','order-row'),up=button('↑',async()=>{[order[i-1],order[i]]=[order[i],order[i-1]];await commit('',s=>findList(s).categoryOrder=order);draw();}),down=button('↓',async()=>{[order[i+1],order[i]]=[order[i],order[i+1]];await commit('',s=>findList(s).categoryOrder=order);draw();});up.disabled=i===0;up.setAttribute('aria-label',`Subir ${c}`);down.disabled=i===order.length-1;down.setAttribute('aria-label',`Bajar ${c}`);row.append(el('span','',c),up,down);content.append(row);});};draw();}
function showActivity(){const {content}=dialog('Actividad de esta lista');content.append(el('p','section-description','Actividad local en este dispositivo.'));if(!current().activity.length)content.append(empty('Los próximos cambios aparecerán aquí.'));for(const event of current().activity){const row=el('article','activity-entry');row.append(el('strong','',event.text),el('small','',`${event.actor} · ${new Date(event.at).toLocaleString('es-MX',{timeZone:state.settings.timezone})}`));content.append(row);}const message=input('','Escribe una nota para esta lista');message.maxLength=300;content.append(field('Notas de la lista',message),button('Guardar nota',async()=>{if(!message.value.trim())return;await commit('Nota guardada',s=>activity(findList(s),message.value.trim()));showActivity();}));}
function batchReview(items,title='Revisar productos'){const {d,content}=dialog(title);content.append(el('p','','Revisa antes de agregar. Los duplicados se conservan sin aumentar su cantidad.'));const target=select(Object.fromEntries(visibleLists().map(l=>[l.id,l.name])),state.active);content.append(field('Lista de destino',target));const rows=[];for(const item of items){const row=el('div','draft-row'),include=input('','','checkbox');include.checked=true;include.setAttribute('aria-label',`Incluir ${item.name}`);const name=input(item.name),qty=input(item.quantity,'Cantidad','number'),unit=select(units,item.unit||'piece'),category=categorySelect(item.category||'Sin categoría');qty.min='.001';qty.step='.001';name.setAttribute('aria-label','Nombre del producto');qty.setAttribute('aria-label','Cantidad');unit.setAttribute('aria-label','Unidad');category.setAttribute('aria-label','Categoría');row.append(include,el('span','',item.emoji||productIcon(item.name)),name,qty,unit,category);if(item.packageSize)row.append(el('small','',`${item.packageSize} ${units[item.packageUnit]} por presentación`));content.append(row);rows.push({item,include,name,qty,unit,category});}content.append(button('Agregar seleccionados',async()=>{const selected=rows.filter(r=>r.include.checked);if(!selected.length){toast('Selecciona al menos un producto.');return;}if(selected.some(r=>!r.name.value.trim()||!validQuantity(r.qty.value))){toast('Revisa nombres y cantidades.');return;}let duplicates=0;const ok=await commit('',s=>{const list=findList(s,target.value);for(const r of selected){const name=r.name.value.trim();let p=exactProduct(name,s.customProducts);if(!p){p={id:'custom-'+uuid(),name,emoji:productIcon(name),category:r.category.value,unit:r.unit.value,aliases:[]};s.customProducts.push(p);}if(appendItem(list,{...r.item,name,productId:p.id,emoji:p.emoji,icon_key:p.icon_key||null,category:r.category.value,quantity:r.qty.value||null,unit:r.unit.value})==='duplicate')duplicates++;}});if(ok){d.close();toast(`${selected.length-duplicates} agregados o reactivados · ${duplicates} ya estaban en la lista`);}},'button primary'));}
function saveTemplate(){const {d,content}=dialog('Guardar como plantilla'),name=input(current().name);name.maxLength=60;content.append(field('Nombre',name),button('Guardar plantilla',async()=>{if(!name.value.trim())return;if(await commit('Plantilla guardada',s=>s.templates.push({id:uuid(),name:name.value.trim(),items:structuredClone(findList(s).items)})))d.close();},'button primary'));}
function applyTheme(){const mode=state.settings.theme||'light',dark=mode==='dark'||mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]').content=dark?'#090f0d':'#f7f5ed';localStorage.setItem('verde-theme',mode);$('#theme-toggle').textContent=dark?'☀':'☾';$('#theme-toggle').setAttribute('aria-label',`Cambiar a modo ${dark?'claro':'oscuro'}`);}

async function checkSharedUrl(){
  if(location.hash.startsWith('#share=')){
    try {
      const raw = location.hash.slice(7);
      const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
      const shared = JSON.parse(jsonStr);
      if(shared && shared.name && Array.isArray(shared.items)){
        history.replaceState(null, '', location.pathname + location.search);
        confirmAction(
          `Lista compartida: "${shared.name}"`,
          `${shared.sharedBy ? shared.sharedBy + ' te ha compartido esta lista' : 'Te han compartido esta lista'} con ${shared.items.length} productos. ¿Deseas agregarla a tus listas para verla o editarla?`,
          async () => {
            const id = uuid();
            const items = shared.items.map(i => ({
              ...i,
              id: uuid(),
              done: false,
              purchaseId: null,
              createdAt: new Date().toISOString()
            }));
            await commit(`Lista "${shared.name}" importada`, s => {
              s.lists.push({
                id,
                name: shared.name,
                items,
                recent: [],
                activity: [{ id: uuid(), text: `Lista compartida importada`, at: new Date().toISOString(), actor: 'Tú' }],
                categoryOrder: []
              });
              s.active = id;
              registerListAsTemplate({ name: shared.name, items });
            });
            switchView('lists');
            return true;
          }
        );
      }
    } catch(err){
      console.warn('Error al leer enlace compartido:', err);
    }
  }

  const params = new URLSearchParams(location.search);
  const listId = params.get('listId');
  if(listId){
    try {
      const {firebase, getSharedList} = await import('./firebase.js');
      await firebase();
      const sharedDoc = await getSharedList(listId);
      if(sharedDoc){
        history.replaceState(null, '', location.pathname);
        confirmAction(
          `Lista en la nube: "${sharedDoc.name}"`,
          `Se encontró la lista "${sharedDoc.name}" compartida por ${sharedDoc.ownerEmail || 'un usuario'}. ¿Deseas abrirla en DayList?`,
          async () => {
            await commit(`Lista "${sharedDoc.name}" sincronizada`, s => {
              const existing = s.lists.find(l => l.id === sharedDoc.id);
              if(existing){
                Object.assign(existing, sharedDoc);
              } else {
                s.lists.push(sharedDoc);
              }
              s.active = sharedDoc.id;
            });
            switchView('lists');
            return true;
          }
        );
      }
    } catch(err){
      console.warn('No se pudo cargar la lista compartida desde la nube:', err);
    }
  }
}

function setup(){
  const d=el('dialog');d.id='workspace-dialog';document.body.append(d);$('#list-dialog').remove();$('.workspace').id='local-section';const sectionView=el('section');sectionView.id='section-view';sectionView.hidden=true;$('.workspace').after(sectionView);const sync=el('span','sync-status');sync.id='sync-status';$('.breadcrumb').append(sync);
  const nav=$('.sidebar nav');nav.replaceChildren();
  for(const [key,label,icon]of [['lists','Mis listas','▤'],['catalog','Catálogo','▦'],['inspiration','Inspiración','✦'],['compare','Compara','⇄'],['profile','Perfil','👤']]){
    const b=button('',()=>switchView(key),'nav-item');b.dataset.view=key;b.append(el('span','',icon),document.createTextNode(label));
    if(key==='lists'){const count=el('span','nav-count');count.id='list-count';b.append(count);}
    nav.append(b);
  }
  const mobile=nav.cloneNode(true);mobile.className='bottom-nav';mobile.querySelectorAll('.nav-count').forEach(n=>n.remove());mobile.querySelectorAll('button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.body.append(mobile);

  $('#add-form').querySelector('button').textContent='Agregar';
  $('#item-name').placeholder='Ej. 2 kg de papa, aguacate, leche…';
  const results=el('div','search-results');results.id='search-results';results.hidden=true;
  $('#add-form').after(results);

  $('#btn-voice-add').onclick=()=>extras.voice();
  $('#btn-manual-add').onclick=()=>openProduct({},'create');

  const toolbar=el('div','list-toolbar');
  const group=button('',()=>commit('',s=>s.settings.group=!s.settings.group));
  group.id='group-toggle';
  group.innerHTML=`${iconGroupOutline}<span>Agrupar por categoría</span>`;

  const tile=button('',()=>commit('',s=>s.settings.view=s.settings.view==='tiles'?'rows':'tiles'));
  tile.id='view-toggle';
  tile.innerHTML=`${iconGridOutline}<span>Vista tarjetas</span>`;

  const shopping=button('',()=>{document.body.classList.toggle('shopping');filter='pending';render();});
  shopping.id='shopping-toggle';
  shopping.innerHTML=`${iconShoppingOutline}<span>Modo compra</span>`;

  const share=button('',()=>extras.sharing());
  share.id='share-btn';
  share.innerHTML=`${iconShareOutline}<span>Compartir</span>`;

  const act=button('',()=>showActivity());
  act.id='activity-btn';
  act.innerHTML=`${iconActivityOutline}<span>Actividad</span>`;

  toolbar.append(group,tile,shopping,share,act);
  $('.list-heading').after(toolbar);

  $('#delete-list').onclick=listMenu;
  const recent=button('Recientes',()=>{filter='recent';render();},'filter');recent.dataset.filter='recent';$('.filters').append(recent);
  const spending=el('div','spending-summary');spending.id='spending-summary';$('.summary-card').append(spending);
  const budget=el('div','budget-summary');budget.id='budget-summary';$('.summary-card').append(budget);

  $('#add-form').onsubmit=e=>{e.preventDefault();const draft=parseItem($('#item-name').value,state.customProducts),p=exactProduct(draft.name,state.customProducts);if(p&&!['chile','chiles'].includes(normalize(draft.name)))addProduct(p,draft);else if(searchProducts(draft.name,state.customProducts).length)search();else openProduct(draft,'create');};
  $('#item-name').oninput=()=>{search();$('#item-name').setAttribute('aria-expanded',String(!$('#search-results').hidden));};
  $('#item-category').onchange=search;
  $('#item-name').onkeydown=e=>{if(e.key==='Escape'){$('#search-results').hidden=true;$('#item-name').setAttribute('aria-expanded','false');}};
  document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();});
  $('#list-select').onchange=e=>{filter='all';commit('',s=>s.active=e.target.value);};
  $('#new-list').onclick=()=>createList();
  $('#rename-list').onclick=()=>createList('rename');
  $('#focus-add').onclick=()=>{$('#item-name').scrollIntoView({behavior:'smooth',block:'center'});$('#item-name').focus({preventScroll:true});};
  $('#clear-done').onclick=()=>confirmAction('Retirar comprados','Se moverán a Recientes para que puedas reutilizarlos.',()=>commit('Comprados guardados en Recientes',s=>{const l=findList(s);l.recent=[...l.items.filter(i=>i.done),...l.recent].slice(0,150);l.items=l.items.filter(i=>!i.done);},true));
  $('#theme-toggle').onclick=async()=>{await commit('',s=>s.settings.theme=document.documentElement.dataset.theme==='dark'?'light':'dark');applyTheme();};
  $('#btn-header-auth').onclick=()=>extras.authForm();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
  window.addEventListener('online',render);
  window.addEventListener('offline',render);
  document.title='DayList · Tu día, en orden';
}

let extras;
try{
  state=await load();
  if(!state){let legacy;try{legacy=JSON.parse(localStorage.getItem('verde-lists'));}catch{}state=migrate(legacy);await write(state,undefined);}
  setup();
  $('.list-footer').firstElementChild.replaceWith($('#sync-status'));
  extras=mountExtras({state:()=>state,current,commit,toast,section,batchReview,confirmAction,applyTheme,switchView,createList,registerListAsTemplate,reuseTemplateAsNew,uuid});
  applyTheme();
  switchView('lists');
  checkSharedUrl();
  
  import('./firebase.js').then(f => f.firebase()).then(async f => {
    await f.auth.authStateReady();
    if(f.auth.currentUser) {
      extras.updateHeaderUser(f.auth.currentUser);
      extras.syncCloudLists();
    }
    f.onAuthStateChanged(f.auth, user => {
      extras.updateHeaderUser(user);
      if(user) extras.syncCloudLists();
    });
  }).catch(()=>{});

  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('La instalación sin conexión no está disponible en este navegador.'));
}catch(e){console.error(e);document.body.replaceChildren(empty('No se pudo abrir el almacenamiento local. Permite el almacenamiento del sitio y vuelve a cargar. Tus datos anteriores no se borraron.'));}


function categoryIconEditor(getName){const panel=el('details','category-icon-settings');panel.append(el('summary','','Elegir icono de categoría'));const host=el('div');panel.append(host);panel.addEventListener('toggle',()=>{if(!panel.open){host.replaceChildren();return;}const name=getName();host.replaceChildren();if(!name){host.append(el('p','section-description','Selecciona una categoría para elegir su icono.'));return;}host.append(el('p','section-description',name));const picker=createIconPicker({name,category:name,value:state.categoryIcons?.[name]?.icon_key,onConfirm:key=>{save.disabled=false;selected=key;}});let selected=null;const save=button('Guardar icono de categoría',async()=>{if(!selected||picker.hasPending()){toast('Selecciona y confirma el icono.');return;}if(await commit('Icono de categoría guardado',s=>{s.categoryIcons??={};s.categoryIcons[name]={icon_key:selected};})){panel.open=false;}},'button primary');save.disabled=true;host.append(picker,save);});return panel;}

