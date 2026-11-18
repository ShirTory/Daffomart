/* login.js  -  CUSTOMER LOGIN with Firebase Auth (replaces login.php) */
(async function () {
  var form = document.getElementById('loginForm');
  var errorBox = document.getElementById('loginError');
  var next = DM.safeNext(DM.param('next'), 'account.html');

  if (await DM.db.authReady()) { location.replace(next); return; }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorBox.innerHTML = '';
    if (!DM.validateForm(form)) { return; }
    var btn = form.querySelector('button.btn-primary');
    btn.disabled = true;
    try {
      await DM.db.login(form.elements.email.value.trim(), form.elements.password.value);
      DM.flash('success', 'Welcome back!');
      location.href = next;
    } catch (err) {
      errorBox.innerHTML = DM.alertHtml('error', DM.db.errorText(err));
      btn.disabled = false;
    }
  });
})();
