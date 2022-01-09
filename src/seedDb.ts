import { Character, PrismaClient } from "@prisma/client";
import axios from "axios";
import cheerio from "cheerio";
import { logger } from "./logger";

const db = new PrismaClient();

interface CharacterLink {
  name: string;
  link: string;
}

export async function getCharacterLinks(): Promise<CharacterLink[] | void> {
  try {
    logger.info("Getting character links");
    const url = "https://coppermind.net";
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

export async function seedDb(): Promise<void> {
  db.$connect();
  logger.info("Seeding database");

  try {
    const url = "https://coppermind.net";
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

      const characterData = {
        name: characterLink.name,
      };

      const tableRows = $(".infobox#Character>tbody>tr");

      for (let tableRow of tableRows) {
        const tableRowData = $(tableRow).find("td");
        const tableRowKey = $(tableRow).find("th");

        if (tableRowKey.text().trim() === "Abilities") {
          (characterData as Character).abilities = $(tableRowData)
            .text()
            .trim();
        }
        if (tableRowKey.text().trim() === "Born") {
          (characterData as Character).born = $(tableRowData).text().trim();
        }
        if (tableRowKey.text().trim() === "Bonded With") {
          (characterData as Character).bonded = $(tableRowData).text().trim();
        }
        if (tableRowKey.text().trim() === "Titles") {
          (characterData as Character).titles = $(tableRowData).text().trim();
        }
        if (tableRowKey.text().trim() === "Aliases") {
          (characterData as Character).aliases = $(tableRowData).text().trim();
        }
        if (tableRowKey.text().trim() === "Profession") {
          (characterData as Character).profession = $(tableRowData)
            .text()
            .trim();
        }
        if (tableRowKey.text().trim() === "Groups") {
          (characterData as Character).groups = $(tableRowData).text().trim();
        }
        if (tableRowKey.text().trim() === "Birthplace") {
          (characterData as Character).birthPlace = $(tableRowData)
            .text()
            .trim();
        }
        if (tableRowKey.text().trim() === "Residence") {
          (characterData as Character).residence = $(tableRowData)
            .text()
            .trim();
        }
        if (tableRowKey.text().trim() === "Nationality") {
          (characterData as Character).nationality = $(tableRowData)
            .text()
            .trim();
        }
        if (tableRowKey.length === 0) {
          const image = $(tableRowData).find("a>img");
          if (image) {
            const createdImage = await db.image.create({
              data: {
                src: `${url}${image.attr("src")}` || "",
                srcSet:
                  image
                    .attr("srcset")
                    ?.split(",")
                    .map((_img) => {
                      return `${url}${_img.trim().split(" ")[0].trim()}`;
                    }) || [],
                width: Number(image.attr("width")) || null,
                height: Number(image.attr("height")) || null,
              },
            });

            (characterData as Character).imageId = createdImage.id;
          }
        }
      }

      characters.push(characterData);

      const createdCharacter = await db.character.create({
        data: characterData,
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
