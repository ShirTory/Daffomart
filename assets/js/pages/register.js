/* register.js  -  CREATE A CUSTOMER ACCOUNT with Firebase Auth (replaces register.php).
   Firebase stores the password safely (hashed) - we never see it. The name and phone go to users/{uid}. */
(async function () {
  var form = document.getElementById('registerForm');
  var errorBox = document.getElementById('registerError');

  if (await DM.db.authReady()) { location.replace('account.html'); return; }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorBox.innerHTML = '';
    if (!DM.validateForm(form)) { return; }
    var btn = form.querySelector('button.btn-primary');
    btn.disabled = true;
    try {
      await DM.db.register({
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim().toLowerCase(),
        phone: form.elements.phone.value.trim(),
        password: form.elements.password.value
      });
      DM.flash('success', 'Account created. Welcome to ' + DM.cfg.store.name + '!');
      location.href = 'account.html';
    } catch (err) {
      errorBox.innerHTML = DM.alertHtml('error', DM.db.errorText(err));
      btn.disabled = false;
    }
  });
})();
