/* =====================================================================
   admin.js  -  JavaScript used only in the admin panel
   1. Ask "Are you sure?" before delete (forms with data-confirm="...")
   2. Warn before cancelling an order (data-confirm-select="value|message")
   3. Show a preview of the chosen product image before upload
   ===================================================================== */
document.addEventListener('DOMContentLoaded', function () {

  // 1. delete confirmation
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.dataset.confirm)) { event.preventDefault(); }
    });
  });

  // 2. confirm when the selected status equals the dangerous value
  document.querySelectorAll('form[data-confirm-select]').forEach(function (form) {
    var parts = form.dataset.confirmSelect.split('|');
    var select = form.querySelector('select');
    form.addEventListener('submit', function (event) {
      if (select.value === parts[0] && !window.confirm(parts[1])) { event.preventDefault(); }
    });
  });

  // 3. image preview
  var input = document.getElementById('imageInput');
  var preview = document.getElementById('imagePreview');
  if (input && preview) {
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) { return; }
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is bigger than 2 MB. Please choose a smaller one.');
        input.value = '';
        return;
      }
      var img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = 'Preview';
      preview.innerHTML = '';
      preview.appendChild(img);
    });
  }
});
