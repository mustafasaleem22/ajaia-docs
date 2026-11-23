// Loads .env from the project root first, then from server/. Real environment
// variables (e.g. on Render) always win because dotenv never overrides them.
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, ".env") });
