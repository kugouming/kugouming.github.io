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


PYTHON_BIN=python
version=$(python -V 2>&1 | grep ^Python)
if [[ $? -ne 0 ]]; then
	version=$(python3 -V 2>&1 | grep ^Python)
	if [[ $? -eq 0 ]]; then
		PYTHON_BIN=python3
	fi
fi

if [[ ${#}version -eq 0 ]]; then
	echo "No available Python environment!"
	exit 1
fi

ver=$(echo "${version}" | tr . ' ' | awk '{print $2}')
if [[ $ver -eq 2 ]]; then
	${PYTHON_BIN} -m SimpleHTTPServer $port > /dev/null 2>&1 &
else
	${PYTHON_BIN} -m http.server $port > /dev/null 2>&1 &
fi

echo -e "\n\n当前目录为：\n\t$(pwd)\n\nWebServer: http://$(hostname -i | awk '{print $NF}'):${port}\n\n"