@echo off
cd /d "%~dp0"
echo === Push to GitHub ===
git add minimal_marim69_dashboard.html
git commit -m "Fix bugs: misc in overview, OPEX fallback, date-range expense filter"
git push
echo.
echo === Done! Netlify redeploys in ~1 min ===
pause
