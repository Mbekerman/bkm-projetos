import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMobile,avatarUrl,googleOptions} from '../public/auth-profile.js';
test('celular brasileiro e internacional, rejeita formatos incompletos',()=>{assert.equal(normalizeMobile('(11) 99999-1234'),'+5511999991234');assert.equal(normalizeMobile('+351 912 345 678'),'+351912345678');for(const v of ['', '1234','119999123'])assert.throws(()=>normalizeMobile(v));});
test('avatar permite somente HTTPS de domínio Google exato',()=>{assert.equal(avatarUrl('https://lh3.googleusercontent.com/a/picture'),'https://lh3.googleusercontent.com/a/picture');for(const v of ['javascript:alert(1)','http://lh3.googleusercontent.com/a','https://googleusercontent.com.evil.test/a','https://example.com/a'])assert.equal(avatarUrl(v),'');});
test('OAuth usa retorno fixo e somente escopos básicos',()=>{const o=googleOptions();assert.equal(o.provider,'google');assert.equal(o.options.redirectTo,'https://bkm-projetos.vercel.app/online.html');assert.equal(o.options.queryParams.hd,'bkm.com.br');assert.equal(o.options.scopes,'openid email profile');});
