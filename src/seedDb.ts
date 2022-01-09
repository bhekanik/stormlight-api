import { Character, PrismaClient } from "@prisma/client";
import axios from "axios";
import cheerio from "cheerio";
import { logger } from "./logger";

const db = new PrismaClient();
const url = "https://coppermind.net";

interface CharacterLink {
  name: string;
  link: string;
}

async function getCharacterLinks(): Promise<CharacterLink[] | void> {
  try {
    logger.info("Getting character links");
    const { data } = await axios(`${url}/wiki/Category:Rosharans`);
    const $ = cheerio.load(data);

    const characterGroups = $("div.mw-category>div.mw-category-group");

    const characterLinks = [];

    for (let characterGroup of characterGroups) {
      const groupCharacters = $(characterGroup).find("ul>li");
      for (let groupCharacter of groupCharacters) {
        const characterLink = $(groupCharacter).find("a").attr("href") || "";
        if (characterLink && !characterLink?.includes("Category")) {
          const characterName = decodeURI(
            characterLink.split("/wiki/")[1].split("_").join(" ").trim()
          );
          const found = await db.character.findFirst({
            where: { name: characterName },
          });
          if (!found) {
            logger.info(`Found new character: ${characterName}`);
            characterLinks.push({
              link: `${url}${characterLink}`,
              name: characterName,
            });
          }
        }
      }
    }

    return characterLinks;
  } catch (error) {
    logger.error(error);
  } finally {
    logger.info("Finished scraping characters");
  }
}

async function processImage(
  $: cheerio.Root,
  tableRowData: cheerio.Cheerio
): Promise<number | null> {
  logger.info("Processing image");
  const image = $(tableRowData).find("a>img");

  if (!image) return null;

  const createdImage = await db.image.create({
    data: {
      src: `${url}${image.attr("src")}` || "",
      width: Number(image.attr("width")) || null,
      height: Number(image.attr("height")) || null,
    },
  });

  const srcSet =
    image
      .attr("srcset")
      ?.split(",")
      .map((_img) => {
        return {
          url: `${url}${_img.trim().split(" ")[0].trim()}`,
          imageId: createdImage.id,
        };
      }) || [];

  srcSet.push({ url: createdImage.src, imageId: createdImage.id });

  await db.src.createMany({
    data: srcSet,
  });

  return createdImage.id;
}

export async function seedDb(): Promise<void> {
  db.$connect();
  logger.info("Seeding database");

  try {
    const characterLinks = await getCharacterLinks();

    if (!characterLinks || characterLinks.length === 0) {
      logger.info("No new characters found");
      return;
    }

    logger.info(`Found ${characterLinks.length} new characters`);

    const characters = [];

    for (let characterLink of characterLinks) {
      const { data: character } = await axios(characterLink.link);
      const $ = cheerio.load(character);

      const characterData: Partial<Character> = {
        name: characterLink.name,
      };

      const tableRows = $(".infobox#Character>tbody>tr");

      for (let tableRow of tableRows) {
        const tableRowData = $(tableRow).find("td");
        const tableRowDataText = $(tableRow).find("td").text().trim();
        const tableRowKeyText = $(tableRow).find("th").text().trim();
        const tableRowKeyLength = $(tableRow).find("th").length;

        if (tableRowKeyText === "Abilities") {
          characterData.abilities = tableRowDataText;
        }
        if (tableRowKeyText === "Born") {
          characterData.born = tableRowDataText;
        }
        if (tableRowKeyText === "Bonded With") {
          characterData.bonded = tableRowDataText;
        }
        if (tableRowKeyText === "Titles") {
          characterData.titles = tableRowDataText;
        }
        if (tableRowKeyText === "Aliases") {
          characterData.aliases = tableRowDataText;
        }
        if (tableRowKeyText === "Profession") {
          characterData.profession = tableRowDataText;
        }
        if (tableRowKeyText === "Groups") {
          characterData.groups = tableRowDataText;
        }
        if (tableRowKeyText === "Birthplace") {
          characterData.birthPlace = tableRowDataText;
        }
        if (tableRowKeyText === "Residence") {
          characterData.residence = tableRowDataText;
        }
        if (tableRowKeyText === "Nationality") {
          characterData.nationality = tableRowDataText;
        }
        if (tableRowKeyLength === 0) {
          characterData.imageId = await processImage($, tableRowData);
        }
      }

      characters.push(characterData);

      const createdCharacter = await db.character.create({
        data: characterData as Character,
      });
      logger.info(`Created character: ${createdCharacter.name}`);
    }
  } catch (error) {
    logger.error(error);
  } finally {
    db.$disconnect();
    logger.info("Database disconnected");
    logger.info("Seeding complete");
  }
}

seedDb();
