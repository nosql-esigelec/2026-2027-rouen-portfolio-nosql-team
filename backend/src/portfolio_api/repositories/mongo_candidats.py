"""Profils et expériences : MongoDB uniquement."""

from portfolio_api.db.mongo import get_mongo_db


async def create_indexes() -> None:
    await get_mongo_db().candidats.create_index(
        "candidat_slug", unique=True
    )


async def find_candidat(slug: str) -> dict | None:
    return await get_mongo_db().candidats.find_one(
        {"candidat_slug": slug},
        {"_id": 0},
    )


async def competence_names(slugs: list[str]) -> dict[str, str]:
    names: dict[str, str] = {}

    cursor = get_mongo_db().candidats.find(
        {"competences.skill_slug": {"$in": slugs}},
        {"_id": 0, "competences": 1},
    )

    async for candidat in cursor:
        for competence in candidat.get("competences", []):
            if competence["skill_slug"] in slugs:
                names[competence["skill_slug"]] = competence["nom"]

    return names


async def upsert_candidat(document: dict) -> None:
    await get_mongo_db().candidats.replace_one(
        {"candidat_slug": document["candidat_slug"]},
        document,
        upsert=True,
    )