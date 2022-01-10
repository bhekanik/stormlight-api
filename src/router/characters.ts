import { Character, Image, Prisma, Src } from "@prisma/client";
import express, { Request, Response } from "express";
import { db } from "../db";
import { logger } from "../logger";

interface GetCharactersResponse {
  charactersSlice: (Partial<Character> & {
    id: number;
    image: (Partial<Image> & { srcSet: string[] }) | null;
  })[];
  total: number;
  cursor?: number;
}

export const charactersRouter = express.Router();

charactersRouter.get("/", async (req: Request, res: Response) => {
  try {
    db.$connect();
    logger.info({ req }, "Getting characters");

    const { skip, take, orderBy, sort, cursor, where } = req.query;

    const queryOptions: Prisma.CharacterFindManyArgs = {
      orderBy: {
        id: "asc",
      },
    };

    if (skip) queryOptions.skip = Number(skip);
    if (where)
      queryOptions.where = {
        [(where as string).split(":")[0].replace('"', "")]: (where as string)
          .split(":")[1]
          .replace('"', ""),
      };
    if (take) queryOptions.take = Number(take) < 100 ? Number(take) : 100;
    if (orderBy && sort && !cursor)
      queryOptions.orderBy = { [orderBy as string]: sort };
    if (cursor && !orderBy) {
      queryOptions.cursor = { id: Number(cursor) };
      queryOptions.skip = Number(queryOptions.skip || 0) + 1;
    }

    const characters = await db.character.findMany({
      take: 100,
      ...queryOptions,
      include: { image: { include: { srcSet: true } } },
    });

    const formattedCharacters = characters.map((character) => {
      const { imageId, image, ...restOfCharacter } = character;

      if (!image) {
        return { ...restOfCharacter, image: null };
      } else {
        const { id, srcSet, ...restOfImage } = image;

        return {
          ...restOfCharacter,
          image: {
            ...restOfImage,
            srcSet: srcSet.map((src: Src) => {
              return src.url;
            }),
          },
        };
      }
    });

    const countOptions: Prisma.CharacterCountArgs = {};

    if (where)
      countOptions.where = {
        [(where as string).split(":")[0].replace('"', "")]: (where as string)
          .split(":")[1]
          .replace('"', ""),
      };

    const total = await db.character.count(countOptions);

    const responseData: GetCharactersResponse = {
      charactersSlice: formattedCharacters,
      total,
    };

    responseData.cursor =
      formattedCharacters[formattedCharacters.length - 1].id;

    res.json({
      data: responseData,
    });

    logger.info({ res }, `Found ${characters.length} characters`);
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

charactersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    db.$connect();
    logger.info({ req }, `Getting character with id: ${req.params.id}`);

    const character = await db.character.findFirst({
      where: { id: +req.params.id },
      include: { image: { include: { srcSet: true } } },
    });

    if (!character) {
      return res.json({ error: "No such character" });
    }

    const { imageId, image, ...restOfCharacter } = character;

    if (!image) {
      return res.json({
        data: { character: { ...restOfCharacter, image: null } },
      });
    }

    const { id, srcSet, ...restOfImage } = image;

    res.json({
      data: {
        character: {
          ...restOfCharacter,
          image: {
            ...restOfImage,
            srcSet: srcSet.map((src: Src) => {
              return src.url;
            }),
          },
        },
      },
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
