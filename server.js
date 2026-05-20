import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`Cafe AI Finance API running on port ${env.port}`);
});
