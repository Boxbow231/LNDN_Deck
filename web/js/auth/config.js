const isLocal = !window.location.hostname || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const pbUrl = isLocal ? 'http://127.0.0.1:8090' : '/';
const pb = new PocketBase(pbUrl);