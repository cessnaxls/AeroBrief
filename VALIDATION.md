# AeroBrief validation

The packaged release should pass:

```bash
npm run check
npm start
curl http://localhost:3000/api/health
curl -I http://localhost:3000/
```

Expected health service name: `aerobrief-ipad`  
Expected version: `1.0.0`
