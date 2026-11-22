@echo off
REM Pushes this folder to a NEW branch "html-version" of your repo. It never touches "main".
cd /d "%~dp0"
if not exist .git ( git init & git branch -M html-version & git remote add origin https://github.com/ShirTory/Daffomart.git )
git checkout -B html-version
git add -A
git commit -m "DaffoMart: HTML/CSS/JS front-end + PHP/MySQL API"
git push -u origin html-version
pause
