import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
import { logger } from "./logger";

const app = express();

const port = process.env.PORT || 3000;

let db: PrismaClient;

app.get("/characters", async (req: Request, res: Response) => {
  try {
    db.$connect();
    logger.info({ req }, "Getting characters");

    const characters = await db.character.findMany();

    const charactersWithImageData = [];
    for (let character of characters) {
      const { imageId, ...restOfCharacter } = character;
      let image = null;
      if (imageId) {
        image = await db.image.findFirst({
          where: { id: character.imageId || "" },
        });
      }
      const { id, ...restOfImage } = image || {};
      charactersWithImageData.push({ ...restOfCharacter, image: restOfImage });
    }

    res.json({
      data: { characters: charactersWithImageData },
    });

    logger.info({ res }, `Found ${charactersWithImageData.length} characters`);
  } catch (error) {
    logger.error(error);
    res.status(500);
    res.json({
      error,
    });
  } finally {
    db.$disconnect();
    logger.info("Disconnected from database");
  }
});

app.get("/character/:id", async (req: Request, res: Response) => {
  try {
    db.$connect();
    logger.info({ req }, `Getting character with id: ${req.params.id}`);

    const character = await db.character.findFirst({
      where: { id: req.params.id },
    });

    const { imageId, ...restOfCharacter } = character!;
    let image = null;
    if (imageId) {
      image = await db.image.findFirst({
        where: { id: imageId || "" },
      });
    }
    const { id, ...restOfImage } = image || {};

    res.json({
      data: { character: { ...restOfCharacter, image: restOfImage } },
    });
    logger.info({ res }, `Found character with id ${req.params.id}`);
  } catch (error) {
    logger.error(error);
    res.status(500);
    res.json({
      error,
    });
  } finally {
    db.$disconnect();
    logger.info("Disconnected from database");
  }
});

app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
  db = new PrismaClient();
});
