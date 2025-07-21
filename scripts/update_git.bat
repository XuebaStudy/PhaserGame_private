@echo off

set GIT_MESSAGE=temp

git add .
git commit -m "%GIT_MESSAGE%"
