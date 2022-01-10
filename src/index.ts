import express from "express";
import { logger } from "./logger";
import { charactersRouter } from "./router/characters";

const app = express();

const port = process.env.PORT || 3000;

app.use("/characters", charactersRouter);

app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
});
