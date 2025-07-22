@echo off

echo.
echo ==== Git push <main> branch ====
git push origin main > nul


echo.
echo ==== Build Start ====
call npm run build > nul


cd dist

echo.
echo ==== Writing CNAME ====
echo game1.xuebasy.top > CNAME


echo.
echo ==== Git commit Start ====
git init > nul
git add . > nul
git commit -m "Deploy to gh-pages" > nul


git branch -M gh-pages > nul
git remote remove origin > nul 2>&1
git remote add origin git@github.com:XuebaStudy/PhaserGame_public.git > nul
git push -f origin gh-pages > nul

echo.
echo ==== Deploy finished ====
echo.