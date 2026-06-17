#!/bin/zsh
# Wrapper para que el preview use Node 22 (el default del sistema es 16).
export PATH="$HOME/.nvm/versions/node/v22.21.0/bin:$PATH"
cd "/Users/juansecp12/Proyecto App Corresponsal"
exec npm run dev
