import "dotenv/config";
import { app } from "./app.js";
import { ensureReady } from "./lib/ready.js";

const port = Number(process.env.PORT) || 4000;

ensureReady()
  .then(() => {
    app.listen(port, () => {
      console.log(`FurniCRM backend listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
