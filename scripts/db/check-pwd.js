const bcrypt = require('bcryptjs');
const hash = '$2b$10$CW0mAh1x4CVAxePuGB21lOETv8XFc.AwLMnzoz92.6frhp8Oj5tX2';
const passwords = ['dental2026', 'test123456', '123456', 'password', 'admin'];
Promise.all(passwords.map(p => bcrypt.compare(p, hash).then(r => `${p}: ${r}`)))
  .then(results => console.log(results.join('\n')));
