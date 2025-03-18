#!/bin/bash

# Function to cleanup background processes
cleanup() {
    echo "Cleaning up..."
    pkill -f Xvfb
    pkill -f x11vnc
    pkill -f nginx
    exit 0
}

# Trap SIGTERM and SIGINT
trap cleanup SIGTERM SIGINT

rm -rf  /tmp/.X0-lock
mkdir -p ~/.vnc
DISPLAY=:0
export DISPLAY=:0
echo $SCREEN_WIDTH
echo $SCREEN_HEIGHT
echo `echo $SCREEN_WIDTH`x`echo $SCREEN_HEIGHT`x16

cd /opt/orbita
Xvfb $DISPLAY -screen 0 `echo $SCREEN_WIDTH`x`echo $SCREEN_HEIGHT`x16 &
sleep 3
x11vnc -storepasswd 12345678 ~/.vnc/passwd
x11vnc -display $DISPLAY -bg -forever -usepw -quiet -rfbport 5901 -xkb &
/usr/sbin/nginx -c /etc/nginx/nginx.conf &

# Execute Node.js in the foreground
exec node index.js