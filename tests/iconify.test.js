import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSemantic,semanticPlan,approvedIcon} from '../src/icon-semantics.js';
test('Spanish normalization, regional aliases and plurals',()=>{
 assert.equal(normalizeSemantic('  LÉCHES DESLACTOSADAS '),'leche deslactosada');
 assert.equal(semanticPlan('manzanas').queries[0],'apple');
 assert.equal(semanticPlan('jitomates').queries[0],'tomato');
 assert.equal(semanticPlan('patatas').queries[0],'potato');
 assert.equal(semanticPlan('limones').queries[0],'lemon');
 assert.equal(semanticPlan('nueces').queries[0],'nut');
 assert.equal(semanticPlan('limpieza').queries[0],'cleaning');
});
test('specific concept then family then category, without duplicate terms',()=>{
 const p=semanticPlan('leche deslactosada','Lácteos, huevo y alternativas');
 assert.deepEqual(p.queries.slice(0,2),['lactose free milk','milk']);
 assert.equal(new Set(p.queries).size,p.queries.length);
 assert.equal(semanticPlan('manzanas verdes').queries[0],'green apple');
 assert.equal(semanticPlan('tomate verde').queries[0],'tomatillo');
});
test('unknown phrases are not fabricated translations',()=>{
 const p=semanticPlan('leche marca desconocida','Lácteos, huevo y alternativas');
 assert.equal(p.unknown,true);assert.deepEqual(p.queries,[]);assert.ok(p.alternatives.includes('milk'));
 assert.equal(semanticPlan('producto inventado','Limpieza del hogar').unknown,true);
 assert.ok(semanticPlan('producto inventado','Limpieza del hogar').alternatives.includes('cleaning'));
 assert.deepEqual(semanticPlan('custom bottle','','en').queries,['custom bottle']);
});
test('allowlist rejects unexpected collections and malformed identifiers',()=>{
 assert.equal(approvedIcon('lucide:milk'),true);assert.equal(approvedIcon('tabler:apple'),true);
 for(const key of ['mdi:milk','tabler:milk-filled','lucide:../milk','<svg>','lucide:Milk',null])assert.equal(approvedIcon(key),false);
});
