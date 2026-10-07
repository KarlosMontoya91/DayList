export const $=s=>document.querySelector(s);
export function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
export function button(text,fn,cls='button secondary'){const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;}
export function input(value='',placeholder='',type='text'){const n=el('input');n.type=type;n.value=value??'';n.placeholder=placeholder;return n;}
export function select(options,value){const s=el('select');for(const [key,label]of Object.entries(options)){const o=el('option','',label);o.value=key;s.append(o);}s.value=value??'';return s;}
export function field(label,control){const labelable=['INPUT','SELECT','TEXTAREA'].includes(control.tagName);const wrap=el(labelable?'label':'div','field');if(labelable)control.setAttribute('aria-label',label);wrap.append(el('span','',label),control);return wrap;}
export function empty(text){const e=el('div','empty');e.append(el('span','','🌿'),el('p','',text));return e;}
export function dialog(title){const d=$('#workspace-dialog');d.replaceChildren();const heading=el('div','dialog-heading');heading.append(el('h2','',title),button('×',()=>d.close(),'icon-button'));heading.lastChild.setAttribute('aria-label','Cerrar');d.append(heading);const content=el('div','dialog-body');d.append(content);if(!d.open)d.showModal();return {d,content};}
export function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
