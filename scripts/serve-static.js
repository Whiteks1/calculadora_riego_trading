const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function readPort() {
  const portIndex = process.argv.indexOf("--port");

  if (portIndex >= 0 && process.argv[portIndex + 1]) {
    return Number(process.argv[portIndex + 1]);
  }

  return Number(process.env.PORT || 4173);
}

function resolvePath(requestPathname) {
  const normalizedPath = decodeURIComponent(requestPathname === "/" ? "/index.html" : requestPathname);
  const cleanedPath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(process.cwd(), cleanedPath);
}

const port = readPort();

const server = http.createServer((request, response) => {
  const parsedUrl = url.parse(request.url || "/");
  const filePath = resolvePath(parsedUrl.pathname || "/");

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(buffer);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static test server running on http://127.0.0.1:${port}`);
});
