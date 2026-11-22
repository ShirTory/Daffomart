/* Return & exchange policy: text is edited in Admin -> Settings. */
DM.ready(function (st) {
  var S = st.settings, esc = DM.esc;
  document.getElementById('policyBox').innerHTML = '<h1>Return &amp; exchange policy</h1><h2>Returns</h2><p>' + esc(S.returnPolicy).replace(/\n/g, '<br>') + '</p><h2>Exchange</h2><p>' + esc(S.exchangePolicy).replace(/\n/g, '<br>') + '</p>' +
    (S.showMedicine !== false && S.medicineNotice ? '<h2>Medicine</h2><p>' + esc(S.medicineNotice) + '</p>' : '');
});
