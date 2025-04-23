import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});