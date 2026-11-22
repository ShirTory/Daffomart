/* Contact & delivery: all text comes from Admin -> Settings and Admin -> Delivery areas. */
DM.ready(function (st) {
  var S = st.settings, esc = DM.esc, wa = String(S.whatsapp || '').replace(/\D/g, '');
  document.getElementById('contactBox').innerHTML = '<h1>Contact &amp; delivery</h1><div class="two-col"><div class="card info-card"><h3>Contact us</h3><p>📍 ' + esc(S.address) + '</p>' + (S.phone ? '<p>📞 <a href="tel:' + esc(S.phone) + '">' + esc(S.phone) + '</a></p>' : '') +
    (wa ? '<p>💬 <a target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '">WhatsApp</a></p>' : '') + (S.email ? '<p>✉️ ' + esc(S.email) + '</p>' : '') + (S.facebook ? '<p>👍 <a target="_blank" rel="noopener" href="' + esc(S.facebook) + '">Facebook</a></p>' : '') + '<p>🕗 ' + esc(S.hours) + '</p>' +
    (S.mapUrl ? '<p><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="' + esc(S.mapUrl) + '">Open map</a></p>' : '') + '</div>' +
    '<div class="card info-card"><h3>Delivery</h3><table class="table"><thead><tr><th>Area</th><th>Charge</th><th>Time</th></tr></thead><tbody>' + st.zones.map(function (z) { return '<tr><td>' + esc(z.name) + '</td><td>' + DM.money(z.charge) + (z.freeOver > 0 ? '<br><small class="muted">Free over ' + DM.money(z.freeOver) + '</small>' : '') + '</td><td>' + esc(z.eta || '-') + '</td></tr>'; }).join('') + '</tbody></table>' +
    (S.courierOutsideNote ? '<p class="muted small">' + esc(S.courierOutsideNote) + '</p>' : '') + '</div></div>';
});
