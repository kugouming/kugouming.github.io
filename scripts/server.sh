#!/bin/bash

# How to:
#    curl -fsSL 'http://iskill.site/scripts/server.sh' | bash -C

port=8081
while true; do
    port=$(( $port + 1 ))
    use=$(netstat -antpl | grep $port 2>/dev/null | wc -l)
    if [[ $use -eq 0 ]]; then
        break
    fi
done

echo -e "\n\n当前目录为：\n\t$(pwd)\n\nWebServer: http://$(hostname -i):${port}\n\n"

python -m SimpleHTTPServer $port > /dev/null 2>&1 &