import app from './app';
import { initDatabase } from './db';

const PORT = process.env.SERVER_PORT || 8651;

initDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📁 Data directory: ${process.cwd()}/data`);
  console.log(`📁 Uploads directory: ${process.cwd()}/uploads`);
  console.log(`📁 Logs directory: ${process.cwd()}/logs`);
});
