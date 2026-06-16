@echo off
rem Serve the repo locally on port 80 (required by the mapdigi.org API CORS policy).
start "localmap-server" cmd /c python -m http.server 80
echo Local server started on http://localhost
