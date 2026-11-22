# DaffoMart — HTML + CSS + JavaScript front-end, PHP + MySQL back-end

An online shop for groceries and medicine (cash on delivery), rebuilt from the Next.js project into three simple languages
(**HTML, CSS, JavaScript**) for the pages and **PHP + MySQL** for the server. No Firebase, no frameworks, no build step.

```
site/   -> the website (HTML/CSS/JS)     -> published on NETLIFY
api/    -> the server (PHP + MySQL)      -> uploaded to a free PHP HOSTING (cPanel / InfinityFree / 000webhost ...)
```

Netlify can only serve static files, so it cannot run PHP. The pages on Netlify talk to the PHP API over the internet (`fetch`).

## 1. Set up the PHP API (do this first)
1. In your hosting panel create a **MySQL database** + user. Note host, database name, user, password.
2. Upload the whole `api/` folder (via File Manager / FTP), e.g. to `public_html/api/`.
3. In that folder copy `config.sample.php` → `config.php` and fill it in:
   `db_*`, `admin_email`, `admin_password` (this is the Owner login), `auth_secret` (any long random text, 32+ characters),
   `allowed_origins` (your Netlify address, e.g. `https://my-shop.netlify.app`), `api_url` (the public address of the api folder), `seed_demo` (`true` = demo products, `false` = empty shop).
4. Open `https://YOUR-HOST/api/health` — you should see `{"ok":true,...}`. The tables are created automatically on the first request.
   If your host has no URL rewriting (404 on `/health`), use `https://YOUR-HOST/api/index.php?r=/health` and put `...index.php?r=` as `API_BASE` below.

## 2. Point the website to the API
Edit `site/assets/js/config.js` and set `API_BASE: 'https://YOUR-HOST/api'`.

## 3. Publish on Netlify
Push this folder to GitHub (branch `html-version`, **not** `main`), then Netlify → *Add new site → Import from Git* → pick the repo + branch `html-version`.
`netlify.toml` already says "publish the `site` folder". Open `/admin/` and sign in with the email/password from `config.php`.

## Run it on your own computer
```
cd api && cp config.sample.php config.php   # fill the database values
php -S localhost:8080 index.php             # API
cd site && python3 -m http.server 8000      # website (set API_BASE to http://localhost:8080 and allowed_origins to http://localhost:8000)
```

See `PROJECT-GUIDE.md` (how it works, for explaining to your teacher) and `FEATURE-CHECKLIST.md` (what is done and what is next).
