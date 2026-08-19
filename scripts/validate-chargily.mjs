import assert from 'node:assert/strict';
const DZD='DZD';
function validateBinding({requestId,checkoutRequestId,checkoutId,boundCheckoutId,currency,livemode}){assert.match(requestId,/^[0-9a-f-]{36}$/i);assert.equal(checkoutRequestId,requestId);assert.equal(checkoutId,boundCheckoutId);assert.equal(currency,DZD);assert.equal(typeof livemode,'boolean');return true}
function processEvent(eventId,processed=new Set()){if(processed.has(eventId))return{applied:false,duplicate:true};processed.add(eventId);return{applied:true,duplicate:false}}
const id='123e4567-e89b-12d3-a456-426614174000';
assert.equal(validateBinding({requestId:id,checkoutRequestId:id,checkoutId:'checkout_1',boundCheckoutId:'checkout_1',currency:DZD,livemode:false}),true);
const processed=new Set();assert.deepEqual(processEvent('evt_1',processed),{applied:true,duplicate:false});assert.deepEqual(processEvent('evt_1',processed),{applied:false,duplicate:true});
assert.throws(()=>validateBinding({requestId:id,checkoutRequestId:id,checkoutId:'a',boundCheckoutId:'b',currency:DZD,livemode:false}));assert.throws(()=>validateBinding({requestId:id,checkoutRequestId:id,checkoutId:'a',boundCheckoutId:'a',currency:'EUR',livemode:false}));assert.throws(()=>validateBinding({requestId:id,checkoutRequestId:id,checkoutId:'a',boundCheckoutId:'a',currency:DZD,livemode:undefined}));
console.log('Chargily contract checks passed.');
