package main

import (
	"flag"
	"log"
	"net/http"
)

var (
	listen = flag.String("listen", ":9091", "listen address")
	dir    = flag.String("dir", "./", "directory to serve")
)

func main() {
	flag.Parse()

	log.Printf("listening on %q...", *listen)
	log.Printf("Please visit: http://localhost%s", *listen)

	err := http.ListenAndServe(*listen, http.FileServer(http.Dir(*dir)))
	if err != nil {
		log.Fatalf("Failed to start server, error:%v", err)
		return
	}
}
