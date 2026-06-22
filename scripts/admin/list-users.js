const { Pool } = require('pg');
const p = new Pool({host:'127.0.0.1',port:5432,database:'dental_agent',user:'dental',password:'***'});
(async()=>{
  var r = await p.query('SELECT id,username,nickname FROM users ORDER BY id');
  console.log('=== Users ===');
  r.rows.forEach(function(x){console.log(x.id,x.username,x.nickname||'-')});
  var r2 = await p.query('SELECT count(1) as cnt FROM appointments');
  console.log('Appointments:',r2.rows[0].cnt);
  await p.end();
})().catch(function(e){console.error(e.message)});
