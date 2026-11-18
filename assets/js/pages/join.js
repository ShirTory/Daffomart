/* join.js  -  "JOIN AS A RIDER" application form (replaces join.php).
   The admin approves or rejects the application in the admin panel. */
(function () {
  var form = document.getElementById('joinForm');
  var errorBox = document.getElementById('joinError');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorBox.innerHTML = '';
    if (!DM.validateForm(form)) { return; }
    var message = form.elements.message.value.trim();
    if (message.length > 500) { errorBox.innerHTML = DM.alertHtml('error', 'Message is too long (max 500 characters).'); return; }

    var btn = form.querySelector('button.btn-primary');
    btn.disabled = true;
    try {
      await DM.db.submitApplication({
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        area: form.elements.area.value.trim(),
        vehicle: form.elements.vehicle.value,
        message: message
      });
      form.reset();
      errorBox.innerHTML = DM.alertHtml('success', 'Thank you! Your rider application was sent. We will contact you by phone.');
    } catch (err) {
      errorBox.innerHTML = DM.alertHtml('error', DM.db.errorText(err));
    }
    btn.disabled = false;
  });
})();
