import {normalize,exactProduct,productIcon} from './catalog.js';
const numbers={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,doce:12,medio:.5,media:.5,'un cuarto':.25,'tres cuartos':.75,'uno y medio':1.5,'un kilo y medio':1.5};
const unitMap={kilo:'kilogram',kilos:'kilogram',kilogramo:'kilogram',kilogramos:'kilogram',kg:'kilogram',g:'gram',gramo:'gram',gramos:'gram',litro:'liter',litros:'liter',l:'liter',ml:'milliliter',mililitros:'milliliter',docena:'dozen',docenas:'dozen',paquete:'package',paquetes:'package',pieza:'piece',piezas:'piece',bolsa:'bag',bolsas:'bag',caja:'box',cajas:'box',botella:'bottle',botellas:'bottle',rollo:'roll',rollos:'roll',manojo:'bunch',manojos:'bunch',lata:'can',latas:'can',frasco:'jar',frascos:'jar',par:'pair',pares:'pair'};
const qtyPattern='(?:uno y medio|tres cuartos|un cuarto|\\d+(?:[.,]\\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|medio|media)';
const number=s=>numbers[s]??Number(s.replace(',','.'));
export function parseItem(text,custom=[]){
 let name=text.trim().replace(/^(agrega|agregar|comprar|necesito)\s+/i,''),quantity=null,unit='piece',packageSize=null,packageUnit='liter',priority='normal',brand='',variant='',notes='';
 const initial=normalize(name).match(new RegExp('^('+qtyPattern+')\\s+'));
 if(initial){quantity=number(initial[1]);name=name.slice(initial[0].length);const first=normalize(name).split(' ')[0];if(unitMap[first]){unit=unitMap[first];name=name.slice(first.length).trim().replace(/^de\s+/i,'');}}
 const pack=normalize(name).match(new RegExp('\\s+de\\s+('+qtyPattern+')\\s+('+Object.keys(unitMap).join('|')+')$'));
 if(pack){packageSize=number(pack[1]);packageUnit=unitMap[pack[2]];name=name.slice(0,-pack[0].length);}
 if(/\burgente\b/i.test(name)){priority='urgent';name=name.replace(/\burgente\b/ig,'').trim();}
 const p=exactProduct(name,custom);return {name:p?.name||name,productId:p?.id||null,quantity:quantity===null?null:String(quantity),unit,packageSize:packageSize===null?null:String(packageSize),packageUnit,category:p?.category||'Sin categoría',emoji:p?.emoji||productIcon(name),priority,brand,variant,notes,rawText:text,needsReview:!p};
}
export function parseShoppingText(text,custom=[]){const protectedText=text.replace(/(\d),(\d)/g,'$1.$2');const parts=protectedText.split(new RegExp('[,;\\n]+|\\s+y\\s+(?='+qtyPattern+'\\s+)','i')).map(s=>s.trim()).filter(Boolean);return parts.map(s=>parseItem(s,custom)).filter(i=>i.name);}
export function identity(item){return [item.productId||normalize(item.name),item.brand,item.variant,item.packageSize,item.packageUnit,item.notes].map(normalize).join('|');}
export function validQuantity(value){return value===null||value===''||(/^(?:\d{1,6})(?:\.\d{1,3})?$/.test(String(value))&&Number(value)>0);}
export function decimalAdd(a,b){return String((Math.round(Number(a)*1000)+Math.round(Number(b)*1000))/1000);}
