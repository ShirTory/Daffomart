</main>

<!-- Footer -->
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <h4><?= e(STORE_NAME) ?></h4>
      <p><?= e(STORE_TAGLINE) ?></p>
    </div>
    <div>
      <h4>Quick links</h4>
      <ul>
        <li><a href="<?= e(url('products.php')) ?>">Shop</a></li>
        <li><a href="<?= e(url('products.php?kind=medicine')) ?>">Medicine</a></li>
        <li><a href="<?= e(url('track.php')) ?>">Track order</a></li>
        <li><a href="<?= e(url('wishlist.php')) ?>">Wishlist</a></li>
        <li><a href="<?= e(url('contact.php')) ?>">Contact &amp; delivery</a></li>
        <li><a href="<?= e(url('policy.php')) ?>">Policies</a></li>
        <li><a href="<?= e(url('join.php')) ?>">Join as a rider</a></li>
      </ul>
    </div>
    <div>
      <h4>Contact</h4>
      <p><?= e(STORE_ADDRESS) ?></p>
      <p><?= e(STORE_PHONE) ?></p>
      <p><?= e(STORE_EMAIL) ?></p>
    </div>
  </div>
  <div class="copyright">&copy; <?= date('Y') ?> <?= e(STORE_NAME) ?>. University web application project.</div>
</footer>

<script src="<?= e(url('assets/js/main.js')) ?>"></script>
</body>
</html>
